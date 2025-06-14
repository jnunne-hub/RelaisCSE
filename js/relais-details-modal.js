// ==================================================================
// MODULE: relais-details-modal.js
// Gère l'affichage des détails d'un relais dans une modale et l'initiation de conversation.
// ==================================================================

import {
    doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from './firebase-config.js'; // Importer db
import { currentUser, showView } from './app.js'; // Importer currentUser et showView depuis app.js

import { closeAllModals } from './app.js'; 

// --- AUCUNE Référence DOM Globale pour la modale ici ---

// --- Fonctions ---

/**
 * Affiche les détails d'un relais et de son auteur dans la modale.
 * Récupère les éléments DOM nécessaires à l'intérieur.
 * @param {string} relaisId - L'ID du document relais dans Firestore.
 */
async function afficherDetailsRelais(relaisId) {
    // Récupérer les éléments DOM de la modale ICI
    const modalOverlay = document.getElementById('relais-modal');
    const modalLoading = document.getElementById('modal-loading');
    const modalDetailsContent = document.getElementById('modal-details-content');
    const modalError = document.getElementById('modal-error');
    const modalImageContainer = document.getElementById('modal-image-container');
    const modalTitle = document.getElementById('modal-title');
    const modalPrice = document.getElementById('modal-price');
    const modalCategoryDisplay = document.getElementById('modal-category');
    const modalSubCategoryDisplay = document.getElementById('modal-sub-category');
    const modalSubCategoryValueDisplay = document.getElementById('modal-sub-category-value');
    const modalEtatDisplay = document.getElementById('modal-etat');
    const modalDescription = document.getElementById('modal-description');
    const modalUserPhoto = document.getElementById('modal-user-photo');
    const modalUserName = document.getElementById('modal-user-name');
    const modalUserService = document.getElementById('modal-user-service');
    const modalContactButton = document.getElementById('modal-contact-button');
    const modalContactStatus = document.getElementById('modal-contact-status');

    if (!modalOverlay) {
        console.error("L'élément #relais-modal est introuvable dans le DOM.");
        return;
    }

    console.log(`Affichage détails ID: ${relaisId}`);

    if(modalLoading) modalLoading.style.display = 'block';
    if(modalDetailsContent) modalDetailsContent.style.display = 'none';
    if(modalError) modalError.style.display = 'none';
    modalOverlay.style.display = 'flex';

    try {
        // Récupérer les données du relais
        const relaisRef = doc(db, "annonces", relaisId);
        const relaisSnap = await getDoc(relaisRef);
        if (!relaisSnap.exists()) throw new Error("Relais non trouvé.");
        const relaisData = relaisSnap.data();
        console.log("Données du relais:", relaisData);

        // --- Affichage multi-images ---
        if (modalImageContainer) {
            modalImageContainer.innerHTML = '';
            if (relaisData.images && Array.isArray(relaisData.images) && relaisData.images.length > 0) {
                relaisData.images.forEach((url, idx) => {
                    if (!/^https?:\/\//.test(url)) url = 'https://csecrm59.fr/RelaisCSE' + url;
                    const img = document.createElement('img');
                    img.src = url;
                    img.alt = `${relaisData.titre || 'Image'} ${idx + 1}`;
                    img.style.maxWidth = '180px';
                    img.style.maxHeight = '140px';
                    img.style.borderRadius = '8px';
                    img.style.boxShadow = '0 2px 8px #0001';
                    img.style.marginRight = '8px';
                    modalImageContainer.appendChild(img);
                });
            } else {
                // Placeholder si pas d'image
                const img = document.createElement('img');
                img.src = 'https://via.placeholder.com/300x200/EFEFEF/AAAAAA?text=Image';
                img.alt = 'Aucune image';
                img.style.maxWidth = '180px';
                img.style.maxHeight = '140px';
                img.style.borderRadius = '8px';
                modalImageContainer.appendChild(img);
            }
        }
        if (modalImageContainer) {
    modalImageContainer.querySelectorAll('img').forEach(img => {
        img.addEventListener('click', () => {
            showModalImageLightbox(img.src, img.alt);
        });
    });
}


        // --- Infos auteur ---
        let userData = null;
        if (relaisData.user_id) {
            try {
                const userRef = doc(db, "utilisateurs", relaisData.user_id);
                const userSnap = await getDoc(userRef);
                if (userSnap.exists()) {
                    userData = userSnap.data();
                    console.log("Données de l'utilisateur:", userData);
                } else {
                    console.warn(`Utilisateur Firestore non trouvé pour ID: ${relaisData.user_id}`);
                }
            } catch (userError) {
                console.error("Erreur lors de la récupération de l'utilisateur:", userError);
            }
        } else {
            console.warn("Aucun user_id trouvé dans l'annonce.");
        }

        // --- Remplir les champs de la modale ---
        if(modalTitle) modalTitle.textContent = relaisData.titre || "Titre non disponible";
        if(modalPrice) modalPrice.textContent = relaisData.prix === 0 ? 'Gratuit' : `${(relaisData.prix || 0).toFixed(2)} €`;
        if (modalCategoryDisplay) modalCategoryDisplay.textContent = relaisData.categorie || 'Non classée';

        // Afficher/Masquer et remplir la sous-catégorie
        if (relaisData.sous_categorie && modalSubCategoryDisplay && modalSubCategoryValueDisplay) {
            modalSubCategoryValueDisplay.textContent = relaisData.sous_categorie;
            modalSubCategoryDisplay.style.display = 'inline';
        } else if (modalSubCategoryDisplay) {
            modalSubCategoryDisplay.style.display = 'none';
        }

        if (modalEtatDisplay) modalEtatDisplay.textContent = `État : ${relaisData.etat || 'Non précisé'}`;
        if(modalDescription) modalDescription.textContent = relaisData.description || "Pas de description.";

        // Infos Auteur
        if(modalUserPhoto) modalUserPhoto.src = userData?.photo_url || 'https://via.placeholder.com/40?text=?';
        if(modalUserName) modalUserName.textContent = userData?.nom || relaisData.user_nom || "Auteur inconnu";
        if(modalUserService) modalUserService.textContent = userData?.service ? `Service : ${userData.service}` : "";

        // Configuration du bouton Contacter
        if (modalContactButton && relaisData.user_id) {
             modalContactButton.dataset.receiverId = relaisData.user_id;
             modalContactButton.dataset.relaisId = relaisId;
             modalContactButton.disabled = !currentUser || currentUser.uid === relaisData.user_id;
             if(modalContactStatus) modalContactStatus.textContent = (currentUser && currentUser.uid === relaisData.user_id) ? "C'est votre relais." : "";
         } else if (modalContactButton) {
             modalContactButton.disabled = true;
             if(modalContactStatus) modalContactStatus.textContent = "Contact impossible.";
         }

        // Afficher le contenu chargé et masquer le chargement/erreur
        if(modalLoading) modalLoading.style.display = 'none';
        if(modalDetailsContent) modalDetailsContent.style.display = 'flex';
        if(modalError) modalError.style.display = 'none';

    } catch (error) {
        console.error("Erreur lors du chargement des détails du relais:", error);
        if(modalLoading) modalLoading.style.display = 'none';
        if(modalDetailsContent) modalDetailsContent.style.display = 'none';
        if(modalError) {
             modalError.querySelector('p').textContent = `Erreur : ${error.message || "Impossible de charger les détails."}`;
             modalError.style.display = 'block';
        }
    }
}


/**
 * Ferme la modale de détails.
 */
function fermerDetailsRelais() {
    const modalOverlay = document.getElementById('relais-modal'); // Récupérer l'élément ici
    if (modalOverlay) {
        modalOverlay.style.display = 'none';
        // Optionnel: Réinitialiser statut contact si besoin
        const modalContactStatus = document.getElementById('modal-contact-status');
        if (modalContactStatus) modalContactStatus.textContent = '';
    }
}

/**
 * Cherche ou crée une conversation pour une annonce donnée entre deux utilisateurs.
 * @returns {Promise<string|null>} L'ID de la conversation.
 */
async function findOrCreateConversation(annonceId, user1Uid, user2Uid, annonceTitre, receiverName, receiverPhoto) {
    const conversationsRef = collection(db, "conversations");
    const q = query(conversationsRef,
                    where("annonceId", "==", annonceId),
                    where("participants", "in", [[user1Uid, user2Uid], [user2Uid, user1Uid]]),
                    limit(1));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        const convId = querySnapshot.docs[0].id;
        console.log("Conversation existante trouvée:", convId);
        return convId;
    } else {
        console.log("Création nouvelle conversation...");
        try {
            const currentUserInfo = { nom: currentUser.displayName || currentUser.email.split('@')[0], photoUrl: currentUser.photoURL || null };
            const receiverInfo = { nom: receiverName, photoUrl: receiverPhoto };
            const newConversationData = {
                annonceId, annonceTitre,
                participants: [user1Uid, user2Uid],
                participantInfo: { [user1Uid]: currentUserInfo, [user2Uid]: receiverInfo },
                lastMessage: { text: "", senderUid: null, timestamp: serverTimestamp() },
                createdAt: serverTimestamp(),
            };
            const docRef = await addDoc(conversationsRef, newConversationData);
            console.log("Nouvelle conversation créée:", docRef.id);
            return docRef.id;
        } catch (error) {
            console.error("Erreur création conversation:", error);
            return null;
        }
    }
}
function showModalImageLightbox(url, alt='') {
    // Vérifie si le lightbox existe déjà
    let lightbox = document.getElementById('modal-img-lightbox');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'modal-img-lightbox';
        lightbox.style = `
            position:fixed; left:0; top:0; width:100vw; height:100vh;
            background:rgba(0,0,0,0.85); z-index:9999; display:flex; align-items:center; justify-content:center;
        `;
        lightbox.innerHTML = `
            <img src="${url}" alt="${alt}" style="max-width:90vw; max-height:85vh; border-radius:16px; box-shadow:0 6px 48px #000b;">
            <button id="modal-img-lightbox-close" style="
                position:absolute; top:28px; right:38px; font-size:2.5rem; background:transparent; border:none; color:#fff; cursor:pointer;
            ">&times;</button>
        `;
        document.body.appendChild(lightbox);
        lightbox.addEventListener('click', e => {
            if (e.target === lightbox || e.target.id === 'modal-img-lightbox-close') {
                lightbox.remove();
            }
        });
    } else {
        // Si lightbox existe déjà, met à jour l’image
        lightbox.querySelector('img').src = url;
        lightbox.querySelector('img').alt = alt;
        lightbox.style.display = 'flex';
    }
}
/**
 * Navigue vers la vue messages et stocke l'ID de la conversation à ouvrir.
 * @param {string} conversationId L'ID de la conversation.
 */
function navigateToMessages(conversationId) {
     // Stocke l'ID pour que messages.js puisse le lire
     sessionStorage.setItem('openConversationId', conversationId);
     // Appelle la fonction de navigation globale (importée depuis app.js)
     showView('messages');
}

/**
 * Met en place tous les écouteurs d'événements liés à la modale de détails.
 * Appelé une fois au démarrage de l'application.
 */
function setupModalListeners() {
    console.log("Initialisation des écouteurs pour la modale de détails...");

    // --- Récupérer les éléments nécessaires pour attacher les listeners ---
    // Note: On pourrait aussi passer ces refs en argument si on préférait
    const modalOverlayElement = document.getElementById('relais-modal');
    const modalCloseButtonElement = document.getElementById('modal-close-button');
    const modalContactButtonElement = document.getElementById('modal-contact-button');
    const relaisGridContainerElement = document.getElementById('relais-grid')?.querySelector('.grid-container');
    const profilRelaisGridElement = document.getElementById('profil-relais-grid');

    // --- Attache les listeners ---
const setupOpenListener = (container) => {
        if (container) {
             container.addEventListener('click', (event) => {
                const btn = event.target.closest('.btn-voir-details');
                if (btn && btn.dataset.id) {
                    event.preventDefault();
                    afficherDetailsRelais(btn.dataset.id);
                }
            });
        }
    };
    setupOpenListener(relaisGridContainerElement);
    setupOpenListener(profilRelaisGridElement);
    

    // Listener pour le bouton de fermeture (croix)
    if (modalCloseButtonElement) {
modalCloseButtonElement.addEventListener('click', closeAllModals);
    } else {
        console.error("Bouton de fermeture de modale (#modal-close-button) non trouvé.");
    }

    // Listener pour fermer en cliquant sur l'overlay
    if (modalOverlayElement) {
        modalOverlayElement.addEventListener('click', (e) => {
            // Ferme seulement si le clic est directement sur l'overlay (pas sur un enfant)
            if (e.target === modalOverlayElement) {
                fermerDetailsRelais();
            }
        });
    } else {
         console.error("Overlay de modale (#relais-modal) non trouvé.");
    }

    // Listener pour le bouton "Contacter le relieur"
    if (modalContactButtonElement) {
        console.log("Bouton #modal-contact-button TROUVÉ dans setup. Ajout écouteur..."); // Log de confirmation
        modalContactButtonElement.addEventListener('click', async (event) => {
            console.log("Clic détecté sur 'Contacter le relieur'"); // Log de test clic

            // Récupérer le statut DANS le handler pour être sûr d'avoir le bon élément
            const statusElement = document.getElementById('modal-contact-status');

            if (!currentUser) { alert("Connectez-vous pour contacter."); return; }

            // Utiliser currentTarget est plus fiable pour récupérer les dataset sur le bouton cliqué
            const receiverId = event.currentTarget.dataset.receiverId;
            const relaisId = event.currentTarget.dataset.relaisId;
            // Récupérer les infos dynamiquement si possible (moins fiable si le DOM change)
            const annonceTitre = document.getElementById('modal-title')?.textContent || "Annonce";
            const receiverName = document.getElementById('modal-user-name')?.textContent || "Vendeur";
            const receiverPhoto = document.getElementById('modal-user-photo')?.src || null;


            if (!receiverId || !relaisId) { console.error("IDs manquants (receiver/relais) sur le bouton contacter."); return; }
            if (receiverId === currentUser.uid) { console.log("Contact soi-même bloqué."); return; }

            if(statusElement) statusElement.textContent = "Initiation...";
            event.currentTarget.disabled = true; // Désactiver le bouton

            try {
                const conversationId = await findOrCreateConversation(relaisId, currentUser.uid, receiverId, annonceTitre, receiverName, receiverPhoto);
                if (conversationId) {
                    fermerDetailsRelais(); // Ferme modale
                    navigateToMessages(conversationId); // Navigue vers messages
                } else { throw new Error("Impossible de démarrer conversation."); }
            } catch (error) {
                console.error("Erreur initiation conversation:", error); alert("Erreur contact.");
                if(statusElement) statusElement.textContent = "Erreur.";
                event.currentTarget.disabled = false; // Réactiver si erreur
            }
        });
    } else {
        console.error("Bouton #modal-contact-button NON TROUVÉ lors de l'initialisation des écouteurs !");
    }
}

// Exporte la fonction d'initialisation pour qu'elle soit appelée par app.js
export { setupModalListeners, afficherDetailsRelais }; // <<<=== AJOUTEZ afficherDetailsRelais ICI
