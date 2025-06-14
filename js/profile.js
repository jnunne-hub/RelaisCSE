// ==================================================================
// FICHIER : profile.js (v3.2 - Section Favoris + Comptage)
// Gère l'affichage de la vue Profil : infos utilisateur, ses favoris,
// et les relais qu'il a proposés (avec compteur de favoris).
// Utilise le Set global `userFavorites` (de app.js) pour l'état du cœur.
// Exporte la fonction de suppression de relais pour app.js.
// ==================================================================

import { db, auth } from './firebase-config.js'; // Instance Firestore
// Import des fonctions Firestore nécessaires
import {
    collection, query, where, orderBy, getDocs, getCountFromServer,
    doc, getDoc, updateDoc, deleteDoc, documentId,
    serverTimestamp // `documentId` pour la requête 'in'
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// currentUser: l'utilisateur connecté
// userFavorites: Set des IDs des relais que L'UTILISATEUR ACTUEL a mis en favori
import { currentUser, userFavorites } from './app.js'; // Importer depuis l'état global
// Fonction pour créer les cartes (commune avec l'accueil)
import { createRelaisCard } from './relais-display.js';
// Fonction pour ouvrir la modale d'édition (sera appelée par app.js)
// import { openEditModal } from './relais-edit-modal.js'; // Pas directement appelée ici

// --- Références DOM spécifiques au Profil ---
// Section "Mes informations"
const profilDetailsLoading = document.getElementById('profil-details-loading');
const profilDetailsContent = document.getElementById('profil-details-content');
const profilDetailsError = document.getElementById('profil-details-error');
const profilPhoto = document.getElementById('profil-photo');
const profilNom = document.getElementById('profil-nom');
const profilEmail = document.getElementById('profil-email');
const profilServiceDisplay = document.getElementById('profil-service-display');
const profilEditServiceButton = document.getElementById('profil-edit-service-button');
const profilServiceForm = document.getElementById('profil-service-form');
const profilServiceInput = document.getElementById('profil-service-input');
const profilServiceCancel = document.getElementById('profil-service-cancel');
const profilServiceStatus = document.getElementById('profil-service-status');

// Section "Mes Relais Favoris" (Nouvelle section)
const favorisLoading = document.getElementById('profil-favoris-loading');
const favorisError = document.getElementById('profil-favoris-error');
const favorisGrid = document.getElementById('profil-favoris-grid'); // La grille pour les favoris
const noFavoris = document.getElementById('profil-no-favoris');

// Section "Mes Relais Proposés"
const proposesLoading = document.getElementById('profil-relais-loading');
const proposesGrid = document.getElementById('profil-relais-grid'); // La grille pour les relais proposés
const proposesError = document.getElementById('profil-relais-error');
const noProposes = document.getElementById('profil-no-relais');


/**
 * Fonction principale pour charger toutes les données de la page Profil.
 * Appelle des sous-fonctions pour charger chaque section en parallèle.
 */
async function loadProfileData() {
    // 1. Vérifier connexion et existence des éléments essentiels
    if (!currentUser) {
        console.warn("[Profil] Utilisateur non connecté. Affichage interrompu.");
        // Afficher messages d'erreur génériques et masquer chargement
        [profilDetailsError, favorisError, proposesError].forEach(el => {
            if (el) { el.textContent = "Veuillez vous connecter."; el.style.display = 'block'; }
        });
        [profilDetailsLoading, favorisLoading, proposesLoading].forEach(el => {
            if (el) el.style.display = 'none';
        });
        [favorisGrid, proposesGrid].forEach(grid => { if (grid) grid.innerHTML = ''; });
        return;
    }
    // Vérifier si les grilles existent (critique)
    if (!favorisGrid || !proposesGrid) {
        console.error("CRITIQUE : [Profil] Grille des favoris ou des proposés manquante dans le DOM !");
        // Afficher une erreur générique
        const generalErrorContainer = profilDetailsError || document.body; // Fallback
        generalErrorContainer.textContent = "Erreur d'affichage de l'interface du profil.";
        generalErrorContainer.style.display = 'block';
        // Masquer les chargements
         [profilDetailsLoading, favorisLoading, proposesLoading].forEach(el => { if (el) el.style.display = 'none'; });
        return;
    }

    console.log(`[Profil] Chargement complet pour ${currentUser.uid}...`);

    // 2. Réinitialiser l'interface (cacher erreurs/contenus, montrer chargement)
    if (profilDetailsLoading) profilDetailsLoading.style.display = 'block';
    if (profilDetailsContent) profilDetailsContent.style.display = 'none';
    if (profilDetailsError) profilDetailsError.style.display = 'none';
    if (favorisLoading) favorisLoading.style.display = 'block';
    favorisGrid.innerHTML = '';
    if (favorisError) favorisError.style.display = 'none';
    if (noFavoris) noFavoris.style.display = 'none';
    if (proposesLoading) proposesLoading.style.display = 'block';
    proposesGrid.innerHTML = '';
    if (proposesError) proposesError.style.display = 'none';
    if (noProposes) noProposes.style.display = 'none';

    // Le Set `userFavorites` est global et chargé par app.js
    console.log("[Profil] Utilisation du Set 'userFavorites' global:", userFavorites);

    // 3. Lancer les chargements des différentes sections en parallèle
    const promises = [
        loadUserInfo(),         // Charger les infos utilisateur
        loadFavoriteRelais(), // Charger les détails des relais favoris
        loadProposedRelais()  // Charger les relais proposés par l'utilisateur (avec comptage)
    ];

    try {
        await Promise.all(promises); // Attendre que toutes les promesses soient résolues
        console.log("[Profil] Chargement complet des sections terminé.");
    } catch (error) {
        // Gérer une erreur potentielle non interceptée dans les sous-fonctions
        console.error("[Profil] Erreur générale lors du chargement parallèle des sections:", error);
        // Afficher une erreur générale si nécessaire
    } finally {
        // Assurer que tous les indicateurs de chargement principaux sont masqués
        // (les indicateurs spécifiques à chaque section sont gérés dans leurs fonctions)
        if (profilDetailsLoading) profilDetailsLoading.style.display = 'none';
        // Note: les indicateurs favoris/proposés sont déjà cachés par leurs fonctions respectives
    }
}

// --- FONCTIONS DE CHARGEMENT SPÉCIFIQUES ---

/** Charge et affiche les informations de l'utilisateur connecté */
async function loadUserInfo() {
    try {
        const userRef = doc(db, "utilisateurs", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const userData = userSnap.data();
            if (profilPhoto) profilPhoto.src = userData.photo_url || 'https://via.placeholder.com/80?text=?';
            if (profilNom) profilNom.textContent = userData.nom || 'Non renseigné';
            if (profilEmail) profilEmail.textContent = userData.email || 'Non renseigné';
            if (profilServiceDisplay) profilServiceDisplay.textContent = userData.service || 'Non renseigné';
            if (profilServiceInput) profilServiceInput.value = userData.service || '';
        } else {
            console.warn("[Profil] Profil Firestore non trouvé, utilisant Auth.");
            if (profilPhoto) profilPhoto.src = currentUser.photoURL || 'https://via.placeholder.com/80?text=?';
            if (profilNom) profilNom.textContent = currentUser.displayName || 'Nom inconnu';
            if (profilEmail) profilEmail.textContent = currentUser.email || 'Email inconnu';
            if (profilServiceDisplay) profilServiceDisplay.textContent = 'Non renseigné';
            if (profilServiceInput) profilServiceInput.value = '';
        }
        if (profilDetailsContent) profilDetailsContent.style.display = 'block';
    } catch (error) {
        console.error("[Profil] Erreur chargement infos utilisateur:", error);
        if (profilDetailsError) { profilDetailsError.textContent = "Erreur chargement informations."; profilDetailsError.style.display = 'block'; }
    } finally {
         // Masquer le chargement spécifique à cette section
         if (profilDetailsLoading) profilDetailsLoading.style.display = 'none';
    }
}

/** Charge les détails des relais mis en favoris par l'utilisateur et les affiche */
async function loadFavoriteRelais() {
    if (!favorisGrid) return; // Ne rien faire si la grille n'existe pas
    if (favorisLoading) favorisLoading.style.display = 'block';
    favorisGrid.innerHTML = '';
    if (favorisError) favorisError.style.display = 'none';
    if (noFavoris) noFavoris.style.display = 'none';

    if (userFavorites.size === 0) {
        console.log("[Profil] Aucun favori à afficher.");
        if (noFavoris) noFavoris.style.display = 'block';
        if (favorisLoading) favorisLoading.style.display = 'none';
        return;
    }

    const favoriteIdsArray = Array.from(userFavorites);
    console.log(`[Profil] Récupération des détails pour ${favoriteIdsArray.length} favoris...`);

    try {
        const annoncesRef = collection(db, "annonces");
        const fetchPromises = [];
        const chunkSize = 30; // Limite pour requête 'in'

        // Découper en chunks si nécessaire
        for (let i = 0; i < favoriteIdsArray.length; i += chunkSize) {
            const chunkIds = favoriteIdsArray.slice(i, i + chunkSize);
            if (chunkIds.length > 0) {
                const q = query(annoncesRef, where(documentId(), 'in', chunkIds));
                fetchPromises.push(getDocs(q)); // Ajoute la promesse de requête
            }
        }

        const querySnapshots = await Promise.all(fetchPromises); // Attend toutes les requêtes

        let foundDocs = [];
        querySnapshots.forEach(snapshot => {
            snapshot.docs.forEach(doc => foundDocs.push(doc)); // Rassemble tous les documents trouvés
        });

        if (foundDocs.length === 0) {
            console.log("[Profil] Aucun document annonce trouvé pour les IDs favoris.");
            if (noFavoris) noFavoris.style.display = 'block';
        } else {
            console.log(`[Profil] ${foundDocs.length} annonces favorites trouvées. Affichage...`);
            favorisGrid.innerHTML = ''; // Assurer grille vide avant d'ajouter
            foundDocs.forEach(favDoc => {
                // Appelle createRelaisCard pour la grille FAVORIS
                // Le coeur sera plein car l'ID est dans userFavorites
                // Pas besoin de favoriteCount ici
                createRelaisCard(
                    { id: favDoc.id, ...favDoc.data() },
                    favorisGrid, // Cible la grille des favoris
                    userFavorites
                );
            });
        }

    } catch (error) {
        console.error("[Profil] Erreur chargement relais favoris:", error);
        if (favorisError) { favorisError.textContent = "Erreur chargement favoris."; favorisError.style.display = 'block'; }
    } finally {
        if (favorisLoading) favorisLoading.style.display = 'none';
    }
}

/** Charge les relais proposés par l'utilisateur ET compte leurs favoris */
async function loadProposedRelais() {
    if (!proposesGrid) return; // Ne rien faire si la grille n'existe pas
    if (proposesLoading) proposesLoading.style.display = 'block';
    proposesGrid.innerHTML = '';
    if (proposesError) proposesError.style.display = 'none';
    if (noProposes) noProposes.style.display = 'none';

    try {
        const annoncesRef = collection(db, "annonces");
        const qAnnonces = query(annoncesRef, where("user_id", "==", currentUser.uid), orderBy("timestamp", "desc"));
        const annonceSnapshot = await getDocs(qAnnonces);

        if (annonceSnapshot.empty) {
            console.log("[Profil] Aucun relais proposé.");
            if (noProposes) noProposes.style.display = 'block';
        } else {
            proposesGrid.innerHTML = '';
            console.log(`[Profil] ${annonceSnapshot.size} relais proposés trouvés. Comptage favoris...`);

            const cardPromises = annonceSnapshot.docs.map(async (annonceDoc) => {
                const relaisData = { id: annonceDoc.id, ...annonceDoc.data() };
                let favoriteCount = 0; // Init compteur
                try {
                    // Compte les favoris pour cette annonce
                    const favCountQuery = query(collection(db, "favoris"), where("relaisId", "==", relaisData.id));
                    const countSnapshot = await getCountFromServer(favCountQuery);
                    favoriteCount = countSnapshot.data().count;
                } catch (countError) {
                    console.error(`   ! Erreur comptage favoris (Proposés) ${relaisData.id}:`, countError);
                }
                relaisData.favoriteCount = favoriteCount; // Ajoute le compte

                // Appelle createRelaisCard pour la grille PROPOSES
                createRelaisCard(relaisData, proposesGrid, userFavorites);
            });
            await Promise.all(cardPromises); // Attend fin comptage/création
        }
    } catch (error) {
        console.error("[Profil] Erreur chargement relais proposés:", error);
        if (proposesError) { proposesError.textContent = "Erreur chargement relais proposés."; proposesError.style.display = 'block'; }
    } finally {
        if (proposesLoading) proposesLoading.style.display = 'none';
    }
}

/**
 * Met à jour le statut d'une annonce à 'relayé'.
 * Appelé depuis app.js handleGridClick.
 * @param {string} relaisId L'ID de l'annonce.
 * @param {HTMLElement} cardElement L'élément de la carte pour màj UI.
 */
async function markAsRelayed(relaisId, cardElement) {
    if (!currentUser) { console.error("markAsRelayed: Non connecté."); return; }
    if (!relaisId) { console.error("markAsRelayed: ID relais manquant."); return; }

    console.log(`[Profil] Tentative de marquer relais ${relaisId} comme 'relayé'.`);
    if (!confirm("Confirmez-vous que ce relais a bien été effectué (vendu/donné) ?")) return;

    if (cardElement) cardElement.style.opacity = '0.5';
    const markButton = cardElement?.querySelector('.btn-mark-relayed');
    if (markButton) markButton.disabled = true;

    try {
        const annonceRef = doc(db, "annonces", relaisId);
        await updateDoc(annonceRef, {
            statut: 'relayé',
            relayeTimestamp: serverTimestamp()
        });
        console.log(`[Profil] Relais ${relaisId} marqué comme 'relayé'.`);

        if (cardElement) {
            cardElement.style.opacity = '0.65';
            cardElement.classList.add('is-relayed'); // Utiliser classe CSS
            cardElement.style.pointerEvents = 'none';
             const voirBtn = cardElement.querySelector('.btn-voir-details');
             if (voirBtn) voirBtn.style.pointerEvents = 'auto';

            cardElement.querySelector('.btn-mark-relayed')?.remove();
            cardElement.querySelector('.btn-edit-relais')?.remove();
            cardElement.querySelector('.btn-delete-relais')?.remove();
            const tagsContainer = cardElement.querySelector('.relais-card-tags');
            if (tagsContainer && !tagsContainer.querySelector('.tag-status-relayé')) {
                 const statusTag = document.createElement('span');
                 statusTag.className = 'tag tag-status tag-status-relayé'; // Ajout tag status
                 statusTag.textContent = 'Relayé';
                 tagsContainer.appendChild(statusTag);
            }
        }
    } catch (error) {
        console.error(`[Profil] Erreur lors du marquage relayé ${relaisId}:`, error);
        alert(`Impossible de marquer comme relayé : ${error.message}`);
        if (cardElement) cardElement.style.opacity = '1';
        if (markButton) markButton.disabled = false;
    }
}

/**
 * Met à jour le champ 'service' de l'utilisateur dans Firestore via le formulaire.
 * @param {Event} event L'événement de soumission.
 */
async function handleUpdateService(event) {
    event.preventDefault();
    if (!currentUser || !profilServiceInput || !profilServiceForm || !profilServiceStatus || !profilServiceDisplay || !profilEditServiceButton) return;

    const newService = profilServiceInput.value.trim();
    const submitBtn = profilServiceForm.querySelector('button[type="submit"]');
    const cancelButton = profilServiceForm.querySelector('#profil-service-cancel');

    profilServiceStatus.textContent = "Sauvegarde...";
    if (submitBtn) submitBtn.disabled = true;
    if (cancelButton) cancelButton.disabled = true;

    try {
        const userRef = doc(db, "utilisateurs", currentUser.uid);
        await updateDoc(userRef, { service: newService });
        console.log("[Profil] Service mis à jour.");
        profilServiceDisplay.textContent = newService || 'Non renseigné';
        profilServiceStatus.textContent = "Enregistré !";
        profilServiceForm.style.display = 'none';
        profilServiceDisplay.style.display = 'inline';
        profilEditServiceButton.style.display = 'inline-block';
        setTimeout(() => { profilServiceStatus.textContent = ""; }, 2500);
    } catch (error) {
        console.error("[Profil] Erreur maj service:", error);
        profilServiceStatus.textContent = "Erreur.";
        alert("Erreur sauvegarde service.");
    } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (cancelButton) cancelButton.disabled = false;
    }
}


/**
 * Supprime un relais de Firestore et sa carte de l'interface.
 * Gère l'état visuel de la carte pendant la suppression.
 * (Appelée depuis app.js via l'export).
 * @param {string} relaisId ID de l'annonce à supprimer.
 * @param {HTMLElement|null} cardElement Élément DOM de la carte.
 */
async function deleteRelais(relaisId, cardElement) {
    if (!currentUser) { console.error("deleteRelais: Non connecté."); return; }
    if (!relaisId) { console.error("deleteRelais: ID manquant."); return; }
    // Cible la grille des relais PROPOSÉS pour la màj UI
    const gridToUpdate = proposesGrid;
    const noItemsMsg = noProposes;
    if (!gridToUpdate) { console.error("deleteRelais: Grille proposesGrid non trouvée."); return; }

    console.log(`[Profil] Tentative suppression relais ${relaisId}...`);
    if (cardElement instanceof HTMLElement) {
        cardElement.style.transition = 'opacity 0.3s ease'; // Ajout transition
        cardElement.style.opacity = '0.4';
        cardElement.style.pointerEvents = 'none';
    }

    try {
        const relaisRef = doc(db, "annonces", relaisId);
        await deleteDoc(relaisRef);
        console.log(`[Profil] Relais ${relaisId} supprimé.`);
        if (cardElement instanceof HTMLElement) {
             // Optionnel: Effet de disparition avant remove
             setTimeout(() => cardElement.remove(), 300);
            // cardElement.remove(); // Suppression immédiate
        } else { console.warn("[Profil] Élément carte non fourni."); }

        // Vérifier si la grille est vide
        // Attendre un peu que le remove() soit effectif si transition
        setTimeout(() => {
             if (gridToUpdate.children.length === 0) {
                if (noItemsMsg) noItemsMsg.style.display = 'block';
             }
        }, 350); // délai léger après remove

    } catch (error) {
        console.error(`[Profil] Erreur suppression relais ${relaisId}:`, error);
        alert(`Impossible de supprimer : ${error.message}.`);
        if (cardElement instanceof HTMLElement) { // Rétablir si erreur
            cardElement.style.opacity = '1';
            cardElement.style.pointerEvents = 'auto';
        }
    }
}


/**
 * Met en place les listeners pour les éléments interactifs DANS la vue profil
 * (formulaire d'édition du service).
 */
// Dans profile.js

function setupProfileListeners() {
    // --- Gestion de l'édition du service ---
    if (profilEditServiceButton && profilServiceDisplay && profilServiceForm) {
        profilEditServiceButton.addEventListener('click', () => {
            console.log("Clic bouton Modifier Service"); // Log pour confirmer
            profilServiceDisplay.style.display = 'none';
            profilServiceForm.style.display = 'flex'; // ou 'block'
            profilEditServiceButton.style.display = 'none'; // Cache Modifier
            if (profilServiceInput) profilServiceInput.focus();
            if (profilServiceStatus) profilServiceStatus.textContent = "";
        });
    } else { console.warn("Profil: Éléments pour édition service manquants."); }

    if (profilServiceCancel && profilServiceDisplay && profilServiceForm && profilEditServiceButton) {
        profilServiceCancel.addEventListener('click', () => {
            console.log("Clic bouton Annuler Service"); // Log pour confirmer
            profilServiceForm.style.display = 'none';
            profilServiceDisplay.style.display = 'inline'; // ou 'block'
            profilEditServiceButton.style.display = 'inline-block'; // <<< DOIT RÉAFFICHER Modifier
            if (profilServiceStatus) profilServiceStatus.textContent = "";
        });
    } else { console.warn("Profil: Éléments pour annulation service manquants."); }

    if (profilServiceForm) {
        profilServiceForm.addEventListener('submit', handleUpdateService);
    } else { console.warn("Profil: Formulaire service non trouvé."); }

    console.log("[Profil] Listeners internes (formulaire service) configurés.");

    // Assurer l'état initial correct (form caché, bouton visible) au cas où
    if (profilServiceForm) profilServiceForm.style.display = 'none';
    if (profilEditServiceButton) profilEditServiceButton.style.display = 'inline-block'; // Force affichage initial

}

// --- Export des fonctions utilisées par app.js ---
export {
    loadProfileData,        // Appelé par app.js quand on affiche la vue profil
    setupProfileListeners,  // Appelé par app.js à l'initialisation
    deleteRelais,             // Appelé par handleGridClick() dans app.js
    markAsRelayed
};