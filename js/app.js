// ==================================================================
// MODULE: app.js (Orchestrateur Principal v2.3 - Favoris Client Simple)
// Gère la navigation, l'état global, l'initialisation des modules,
// et la logique des filtres, recherche et favoris.
// ==================================================================

// Imports Firebase Core
import { collection, query, where, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from './firebase-config.js'; // Assurez-vous d'importer db

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from './firebase-config.js'; // Instance Auth

// Imports des constantes et configurations partagées
import { SUB_CATEGORIES, GENDER_AGE_OPTIONS } from './config.js';

// Imports des modules fonctionnels
//import { updateUIForLoggedInUser, updateUIForLoggedOutUser, setupInitialAuthButton } from './auth-ui.js';
// Import unique depuis relais-display.js
import { loadRelais, createRelaisCard } from './relais-display.js'; // Importe la fonction de chargement
import { setupModalListeners, afficherDetailsRelais } from './relais-details-modal.js';
import { setupNewRelaisForm } from './relais-form.js';
import { setupEditModalListeners, openEditModal } from './relais-edit-modal.js';
// Import des fonctions nécessaires du module profil (dont deleteRelais)
import { loadProfileData, setupProfileListeners, deleteRelais, markAsRelayed } from './profile.js';
import { initializeMessagesModule, loadConversations } from './messages.js';
// Import des fonctions de gestion des favoris (qui modifient Firestore)
import { addFavorite, removeFavorite, getUserFavoriteIds } from './favorites.js';

import {
  updateUIForLoggedInUser,
  updateUIForLoggedOutUser,
  setupInitialAuthButton,
  showLoginScreen,
  showAppScreen
} from './auth-ui.js';
// ==================================================================
// RÉFÉRENCES DOM GLOBALES
// ==================================================================
const navigation = document.querySelector('header nav');
const navLinks = document.querySelectorAll('nav .nav-link');
const viewSections = document.querySelectorAll('.view-section');

// Références spécifiques aux grilles (utilisées pour listeners)
const relaisGridContainer = document.getElementById('relais-grid')?.querySelector('.grid-container');
const profileGridContainer = document.getElementById('profil-relais-grid'); // Référence grille profil obtenue ICI
const favorisGridContainer = document.getElementById('profil-favoris-grid');
const loadingMessage = document.getElementById('loading-message');

// Filtres & Recherche
const filtersContainer = document.querySelector('#filters-search .filters');
const filterButtons = document.querySelectorAll('#filters-search .filters .btn-filter[data-category]');
const searchInput = document.getElementById('search-input');

// Filtres dépendants
const subFiltersContainer = document.getElementById('sub-filters-container');
const subFilterButtonsContainer = document.getElementById('sub-filter-buttons');
const genreAgeFiltersContainer = document.getElementById('genre-age-filters-container');
const genreAgeFilterButtonsContainer = document.getElementById('genre-age-filter-buttons');

// ==================================================================
// ÉTAT GLOBAL DE L'APPLICATION
// ==================================================================
export let currentUser = null;        // Utilisateur Firebase connecté
export let userFavorites = new Set(); // IDs des relais favoris de l'utilisateur
let filtreCategorieActif = 'all';   // Filtre catégorie actif
let filtreSousCategorieActif = null;// Filtre sous-cat actif
let filtreGenreAgeActif = null;     // Filtre genre/âge actif
let searchDebounceTimeout;          // Timer pour la recherche




// ==================================================================
// GESTION DE L'AUTHENTIFICATION & NOTIFICATIONS
// ==================================================================

// Variable globale pour stocker la fonction qui arrête l'écouteur
let unreadListener = null;

/**
 * Écoute en temps réel les conversations de l'utilisateur pour calculer
 * le total des messages non lus et mettre à jour le badge de notification.
 */
function listenForUnreadMessages() {
    // Si un écouteur est déjà actif, on l'arrête pour éviter les doublons
    if (unreadListener) {
        unreadListener();
        console.log("Ancien écouteur de messages non lus arrêté.");
    }
    
    const badge = document.getElementById('messages-badge');

    // Si l'utilisateur est déconnecté, on s'assure que le badge est caché et on arrête.
    if (!currentUser) {
        if (badge) badge.style.display = 'none';
        return;
    }

    console.log(`Démarrage de l'écoute des messages non lus pour ${currentUser.uid}`);
    
    // Requête pour trouver toutes les conversations où l'utilisateur est participant
    const conversationsRef = collection(db, "conversations");
    const q = query(conversationsRef, where("participants", "array-contains", currentUser.uid));

    // onSnapshot écoute les changements en temps réel
    unreadListener = onSnapshot(q, (snapshot) => {
        let totalUnread = 0;
        // On parcourt chaque conversation de l'utilisateur
        snapshot.forEach(doc => {
            const data = doc.data();
            // Si le compteur existe pour cet utilisateur, on l'ajoute au total
            if (data.unreadCount && data.unreadCount[currentUser.uid]) {
                totalUnread += data.unreadCount[currentUser.uid];
            }
        });

        console.log(`Total des messages non lus : ${totalUnread}`);

        // Mise à jour de l'interface (le badge)
        if (badge) {
            if (totalUnread > 0) {
                // Affiche 9+ si le nombre est trop grand pour le cercle
                badge.textContent = totalUnread > 9 ? '9+' : totalUnread;
                badge.style.display = 'flex'; // 'flex' pour centrer le texte
            } else {
                badge.style.display = 'none'; // Cache le badge s'il n'y a rien à lire
            }
        }
    }, (error) => {
        console.error("Erreur écouteur de notifications:", error);
        // En cas d'erreur, on cache le badge
        if (badge) badge.style.display = 'none';
    });
}


onAuthStateChanged(auth, async (user) => {
    console.log(`App.js Auth state change. User: ${user ? user.uid : 'null'}`);
    currentUser = user;

    // Appel de la fonction de notification à chaque changement de statut de connexion
    listenForUnreadMessages();

    if (user) {
        showAppScreen(user);
        updateUIForLoggedInUser(user);
        
        try {
             userFavorites = await getUserFavoriteIds(user.uid);
             console.log("Favoris chargés:", userFavorites);
        } catch(e) {
            console.error("Erreur récupération favoris au login:", e);
             userFavorites = new Set();
        }
        
        const currentActiveView = document.querySelector('.view-section.active')?.id?.replace('view-', '');
        if (currentActiveView) {
            showView(currentActiveView);
        } else {
            showView('accueil');
        }
    } else {
        showLoginScreen();
        updateUIForLoggedOutUser();
        userFavorites = new Set();
        if (relaisGridContainer) relaisGridContainer.innerHTML = '<p>Veuillez vous connecter pour voir les relais.</p>';
        if (loadingMessage) loadingMessage.style.display = 'none';
    }
});


// ==================================================================
// GESTION DE LA NAVIGATION (SPA)
// ==================================================================
export function showView(targetId) {
    console.log(`App.js Navigating to view: ${targetId}`);
    viewSections.forEach(section => section.classList.remove('active'));
    navLinks.forEach(link => link.classList.remove('active'));

    const targetSection = document.getElementById(`view-${targetId}`);
    if (targetSection) {
        targetSection.classList.add('active');
    } else {
        console.warn(`View 'view-${targetId}' not found. Fallback to accueil.`);
        document.getElementById('view-accueil')?.classList.add('active');
        targetId = 'accueil';
    }

    const targetLink = document.querySelector(`nav .nav-link[data-target="${targetId}"]`);
    if (targetLink) targetLink.classList.add('active');

    // Reset formulaire 'nouveau'
    const formNouveau = document.getElementById('form-nouveau-relais');
    if (formNouveau && targetId !== 'nouveau') { // Ne reset que si on QUITTTE la vue 'nouveau'
        console.log("Réinitialisation du formulaire Nouveau Relais...");
        try {
            formNouveau.reset(); // Reset les inputs texte, textarea, etc.

            // --- AJOUT : Réinitialiser explicitement les selects et l'UI dépendante ---
            const catSelect = document.getElementById('relais-categorie');
            const etatSelect = document.getElementById('relais-etat');
            const sousCatContainer = document.getElementById('sous-categorie-container');
            const genreAgeContainer = document.getElementById('genre-age-container');
            const sousCatSelect = document.getElementById('relais-sous-categorie');
            const genreAgeSelect = document.getElementById('relais-genre-age');
            const imagePreview = document.getElementById('image-preview');
            const noImageText = document.getElementById('no-image-text');
            const fileInput = document.getElementById('relais-image'); // Pour reset aperçu
            // const fileNameDisplay = document.getElementById('file-name-display-new'); // Si vous aviez le nom

            // Remettre les selects principaux sur leur option vide (la première)
            if (catSelect && catSelect.options.length > 0 && catSelect.options[0].value === "") {
                 catSelect.selectedIndex = 0; // Sélectionne la première option (-- Choisir Catégorie --)
                 // Ou catSelect.value = "";
            }
            if (etatSelect && etatSelect.options.length > 0 && etatSelect.options[0].value === "") {
                etatSelect.selectedIndex = 0; // Sélectionne -- Choisir État --
                // Ou etatSelect.value = "";
            }

            // Masquer les conteneurs dépendants et vider leurs selects
            if (sousCatContainer) sousCatContainer.style.display = 'none';
            if (genreAgeContainer) genreAgeContainer.style.display = 'none';
            if (sousCatSelect) { sousCatSelect.innerHTML = ''; sousCatSelect.required = false; }
            if (genreAgeSelect) { genreAgeSelect.innerHTML = ''; genreAgeSelect.required = false; }

            // Réinitialiser l'aperçu image
if (imagePreview) { imagePreview.style.display = 'none'; imagePreview.src = "#"; }

            if (noImageText) noImageText.style.display = 'inline';
            if (fileInput) fileInput.value = null; // Essentiel pour vider la sélection de fichier
            // if (fileNameDisplay) fileNameDisplay.textContent = ''; // Si vous aviez le nom

            console.log("Formulaire Nouveau Relais réinitialisé (y compris selects).");

        } catch (e) {
            console.warn("Erreur mineure lors de la réinitialisation complète du formulaire:", e);
        }
    }

    // Charger les données spécifiques à la vue (si connecté)
    if (currentUser) {
        switch (targetId) {
            case 'accueil':
                // Appel initial/reset pour l'accueil
                loadRelais(
                    filtreCategorieActif,
                    filtreSousCategorieActif === 'all' ? null : filtreSousCategorieActif,
                    filtreGenreAgeActif === 'all' ? null : filtreGenreAgeActif,
                    false // <<< Indique chargement initial/reset
                    // Pas besoin de passer userFavorites, loadRelais l'importe
                );
                break;
            case 'profil':
                // loadProfileData utilise currentUser et userFavorites (importés globalement)
                loadProfileData();
                break;
            case 'messages':
                loadConversations();
                break;
            // case 'nouveau': // Pas de chargement initial
        }
    } else if (targetId !== 'accueil') {
        // Si non connecté et on essaie d'aller ailleurs qu'à l'accueil
        showView('accueil');
    } else if (targetId === 'accueil' && !currentUser) {
        // Si on est sur l'accueil et non connecté
        if (relaisGridContainer) relaisGridContainer.innerHTML = '<p>Veuillez vous connecter pour voir les relais.</p>';
        if (loadingMessage) loadingMessage.style.display = 'none';
    }
}

export function closeAllModals() {
    const allModals = document.querySelectorAll('.modal-overlay');
    allModals.forEach(modal => {
        modal.style.display = 'none';
    });
    console.log("Toutes les modales ont été fermées.");
}

// ==================================================================
// GESTION DES FILTRES ET RECHERCHE
// ==================================================================
function updateDependentFiltersUI(categoriePrincipale) { /* ... Identique ... */
    if (!subFiltersContainer || !subFilterButtonsContainer || !genreAgeFiltersContainer || !genreAgeFilterButtonsContainer) { return; } const subOptions = SUB_CATEGORIES[categoriePrincipale] || []; const showGenreAgeFilters = (categoriePrincipale === "Vêtements" || categoriePrincipale === "Chaussures"); subFilterButtonsContainer.innerHTML = ''; if (categoriePrincipale !== 'all' && subOptions.length > 0) { const allSubButton = document.createElement('button'); allSubButton.className = 'btn btn-filter active'; allSubButton.dataset.subcategory = 'all'; allSubButton.textContent = `Tout ${categoriePrincipale}`; subFilterButtonsContainer.appendChild(allSubButton); subOptions.forEach(subCat => { const button = document.createElement('button'); button.className = 'btn btn-filter'; button.dataset.subcategory = subCat; button.textContent = subCat; subFilterButtonsContainer.appendChild(button); }); subFiltersContainer.style.display = 'block'; } else { subFiltersContainer.style.display = 'none'; } genreAgeFilterButtonsContainer.innerHTML = ''; if (showGenreAgeFilters) { const allGenreButton = document.createElement('button'); allGenreButton.className = 'btn btn-filter active'; allGenreButton.dataset.genreage = 'all'; allGenreButton.textContent = 'Tout'; genreAgeFilterButtonsContainer.appendChild(allGenreButton); GENDER_AGE_OPTIONS.forEach(option => { const button = document.createElement('button'); button.className = 'btn btn-filter'; button.dataset.genreage = option; button.textContent = option; genreAgeFilterButtonsContainer.appendChild(button); }); genreAgeFiltersContainer.style.display = 'block'; } else { genreAgeFiltersContainer.style.display = 'none'; filtreGenreAgeActif = null; }
 }
function setupCategoryFilters() {
    // Listener Catégorie Principale
    if (filtersContainer) { filtersContainer.addEventListener('click', (event) => { const targetButton = event.target.closest('.btn-filter[data-category]'); if (!targetButton) return; event.preventDefault(); const nouvelleCategorie = targetButton.dataset.category; if (nouvelleCategorie === filtreCategorieActif) return; filtreCategorieActif = nouvelleCategorie; filtreSousCategorieActif = null; filtreGenreAgeActif = null; filterButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.category === nouvelleCategorie)); updateDependentFiltersUI(nouvelleCategorie); if (searchInput) searchInput.value = ''; clearTimeout(searchDebounceTimeout); filterDisplayedRelais(''); if (document.getElementById('view-accueil')?.classList.contains('active')) { loadRelais(filtreCategorieActif, null, null, false); } }); } // Ajout ", false"
    else { console.error("Conteneur filtres principaux non trouvé."); }
    // Listener Sous-Catégorie
    if (subFilterButtonsContainer) { subFilterButtonsContainer.addEventListener('click', (event) => { const targetSubButton = event.target.closest('.btn-filter[data-subcategory]'); if (!targetSubButton) return; event.preventDefault(); const nouvelleSousCategorie = targetSubButton.dataset.subcategory; if (nouvelleSousCategorie === filtreSousCategorieActif) return; filtreSousCategorieActif = nouvelleSousCategorie; if (nouvelleSousCategorie === 'all') { filtreGenreAgeActif = null; genreAgeFilterButtonsContainer?.querySelectorAll('.btn-filter').forEach(btn => { btn.classList.toggle('active', btn.dataset.genreage === 'all'); }); } subFilterButtonsContainer.querySelectorAll('.btn-filter').forEach(btn => { btn.classList.toggle('active', btn.dataset.subcategory === nouvelleSousCategorie); }); if (searchInput) searchInput.value = ''; clearTimeout(searchDebounceTimeout); filterDisplayedRelais(''); if (document.getElementById('view-accueil')?.classList.contains('active')) { loadRelais(filtreCategorieActif, filtreSousCategorieActif === 'all' ? null : filtreSousCategorieActif, filtreGenreAgeActif, false); } }); } // Ajout ", false"
    else { console.error("Conteneur boutons sous-catégories non trouvé."); }
    // Listener Genre/Age
    if (genreAgeFilterButtonsContainer) { genreAgeFilterButtonsContainer.addEventListener('click', (event) => { const targetGenreButton = event.target.closest('.btn-filter[data-genreage]'); if (!targetGenreButton) return; event.preventDefault(); const nouveauGenreAge = targetGenreButton.dataset.genreage; if (nouveauGenreAge === filtreGenreAgeActif) return; filtreGenreAgeActif = nouveauGenreAge; genreAgeFilterButtonsContainer.querySelectorAll('.btn-filter').forEach(btn => { btn.classList.toggle('active', btn.dataset.genreage === nouveauGenreAge); }); if (searchInput) searchInput.value = ''; clearTimeout(searchDebounceTimeout); filterDisplayedRelais(''); if (document.getElementById('view-accueil')?.classList.contains('active')) { loadRelais(filtreCategorieActif, filtreSousCategorieActif === 'all' ? null : filtreSousCategorieActif, filtreGenreAgeActif === 'all' ? null : filtreGenreAgeActif, false); } }); } // Ajout ", false"
    else { console.error("Conteneur boutons filtre genre/age non trouvé."); }
}
function filterDisplayedRelais(searchTerm) { /* ... Identique ... */
    const searchTermLower = searchTerm.toLowerCase().trim(); const currentGridContainer = document.getElementById('relais-grid')?.querySelector('.grid-container'); if (!currentGridContainer) return; const allCards = currentGridContainer.querySelectorAll('.relais-card'); if (!allCards || allCards.length === 0) return; let found = false; allCards.forEach(card => { const titre = card.querySelector('.relais-card-title')?.textContent.toLowerCase() || ''; const tags = Array.from(card.querySelectorAll('.tag')).map(tag => tag.textContent.toLowerCase()).join(' '); if (titre.includes(searchTermLower) || tags.includes(searchTermLower) ) { card.style.display = ''; found = true; } else { card.style.display = 'none'; } }); const noResultsMessageId = 'no-search-results-message'; let noResultsMessage = currentGridContainer.querySelector(`#${noResultsMessageId}`); if (!found && searchTermLower !== '') { if (!noResultsMessage) { noResultsMessage = document.createElement('p'); noResultsMessage.id = noResultsMessageId; noResultsMessage.style.width = '100%'; noResultsMessage.style.textAlign = 'center'; noResultsMessage.style.fontStyle = 'italic'; noResultsMessage.style.marginTop = '20px'; currentGridContainer.appendChild(noResultsMessage); } noResultsMessage.textContent = `Aucun relais correspondant à "${searchTerm}" trouvé dans les filtres actuels.`; } else if (noResultsMessage) { noResultsMessage.remove(); }
}
function setupSearch() { /* ... Identique ... */
    if (searchInput) { searchInput.addEventListener('input', () => { clearTimeout(searchDebounceTimeout); searchDebounceTimeout = setTimeout(() => { filterDisplayedRelais(searchInput.value); }, 400); }); searchInput.addEventListener('search', () => { if (searchInput.value.trim() === '') { clearTimeout(searchDebounceTimeout); filterDisplayedRelais(''); } }); } else { console.warn("Élément recherche #search-input non trouvé."); } const searchButtonElement = document.getElementById('search-button'); if (searchButtonElement) searchButtonElement.style.display = 'none';
}

// ==================================================================
// GESTIONNAIRE DE CLICS DÉLÉGUÉS SUR LES GRILLES (Version Corrigée)
// ==================================================================
// DANS js/app.js
// DANS js/app.js - REMPLACEZ VOTRE FONCTION PAR CELLE-CI

async function handleGridClick(event, gridContainer) {
    // Cible les boutons potentiels et la carte elle-même
    const card = event.target.closest('.relais-card');
    if (!card) return; // Si le clic n'est pas dans une carte, on ne fait rien

    const editBtn = event.target.closest('.btn-edit-relais');
    const deleteBtn = event.target.closest('.btn-delete-relais');
    const favBtn = event.target.closest('.btn-overlay-favorite');
    const markRelayedBtn = event.target.closest('.btn-mark-relayed');
    // Le bouton "voir" est maintenant la carte entière ou une icône spécifique
    const voirBtn = event.target.closest('.btn-voir-details, .btn-voir-details-icon');

    // --- On vérifie les actions les plus spécifiques en premier ---

    // --- Bouton Éditer (vérifié par propriété) ---
    if (editBtn && editBtn.dataset.id) {
        event.preventDefault(); // Empêche d'autres actions
        event.stopPropagation(); // Empêche le clic de "remonter" à la carte
        console.log("Clic Editer détecté:", editBtn.dataset.id);
        if (currentUser && editBtn.dataset.ownerId === currentUser.uid) {
            try {
                openEditModal(editBtn.dataset.id);
            } catch(e) {
                console.error("Erreur à l'ouverture de la modale d'édition", e);
            }
        } else {
            console.warn("Tentative d'édition non autorisée ou utilisateur déconnecté.");
        }
        return;
    }

    // --- Bouton Supprimer ---
    if (deleteBtn && deleteBtn.dataset.id) {
        event.preventDefault();
        event.stopPropagation();
        console.log("Clic Supprimer détecté:", deleteBtn.dataset.id);
        if (confirm("Êtes-vous sûr de vouloir supprimer ce relais définitivement ?")) {
            // L'appel à une fonction async nécessite await
            await deleteRelais(deleteBtn.dataset.id, deleteBtn.closest('.relais-card'));
        }
        return;
    }

    // --- Bouton Marquer Relayé ---
    if (markRelayedBtn && markRelayedBtn.dataset.id) {
        event.preventDefault();
        event.stopPropagation();
        console.log("Clic Marquer Relayé détecté:", markRelayedBtn.dataset.id);
        // L'appel à une fonction async nécessite await
        await markAsRelayed(markRelayedBtn.dataset.id, markRelayedBtn.closest('.relais-card'));
        return;
    }

    // --- Bouton Favori (Overlay) ---
    if (favBtn && favBtn.dataset.id && currentUser) {
        event.preventDefault();
        event.stopPropagation();
        
        const relaisId = favBtn.dataset.id;
        const ownerId = favBtn.dataset.ownerId;

        if (currentUser.uid === ownerId) {
            console.log("Auto-favori bloqué.");
            return;
        }

        const isCurrentlyFavorited = favBtn.dataset.favorited === 'true';
        const icon = favBtn.querySelector('i');
        favBtn.disabled = true;
        if (icon) icon.className = 'fas fa-spinner fa-spin';

        try {
            if (isCurrentlyFavorited) {
                if (await removeFavorite(currentUser.uid, relaisId)) {
                    userFavorites.delete(relaisId);
                    favBtn.classList.remove('is-favorited');
                    if (icon) icon.className = 'far fa-heart';
                    favBtn.dataset.favorited = 'false';
                }
            } else {
                if (await addFavorite(currentUser.uid, relaisId)) {
                    userFavorites.add(relaisId);
                    favBtn.classList.add('is-favorited');
                    if (icon) icon.className = 'fas fa-heart';
                    favBtn.dataset.favorited = 'true';
                }
            }
        } catch (error) {
            console.error("Erreur gestion favori:", error);
            if (icon) icon.className = isCurrentlyFavorited ? 'fas fa-heart' : 'far fa-heart'; // Rétablit l'icône
        } finally {
            favBtn.disabled = false; // Réactive le bouton dans tous les cas
        }
        return;
    }

    // --- Si aucune action spécifique, on traite le clic général pour "Voir" ---
    // Cette condition est maintenant plus large et sert de fallback.
    if (voirBtn && voirBtn.dataset.id) {
        event.preventDefault();
        console.log("Clic général sur carte (Voir) détecté:", voirBtn.dataset.id);
        afficherDetailsRelais(voirBtn.dataset.id);
    } else if (card.dataset.id) { // Fallback si le clic est sur la carte mais pas un bouton
         event.preventDefault();
         console.log("Clic fallback sur carte (Voir) détecté:", card.dataset.id);
         afficherDetailsRelais(card.dataset.id);
    }
}



// ==================================================================
// INITIALISATION DE L'APPLICATION
// ==================================================================
function setupNavigation() { /* ... Identique ... */
    if (navigation) { navigation.addEventListener('click', (event) => { const navLink = event.target.closest('.nav-link'); if (navLink && navLink.dataset.target) { event.preventDefault(); showView(navLink.dataset.target); } }); } else { console.error("Élément navigation principal non trouvé."); }
}

function initializeApp() {
    console.log("DOM loaded. Initializing App Modules...");

    // Initialisation des différents modules et listeners UI
    setupNavigation();
    console.log("Appel de setupNewRelaisForm...");
    setupNewRelaisForm();
    console.log("Retour de setupNewRelaisForm.");
    setupModalListeners();
    setupEditModalListeners();
    setupProfileListeners();
    initializeMessagesModule();
    setupCategoryFilters();
    setupSearch();

    // --- LISTENERS DÉLÉGUÉS SUR LES GRILLES ---
    if (relaisGridContainer) {
        relaisGridContainer.addEventListener('click', (e) => handleGridClick(e, relaisGridContainer));
        console.log("Listener clics (handleGridClick) ajouté à grille principale.");
    } else { console.warn("Grille principale non trouvée."); }

    if (profileGridContainer) {
         profileGridContainer.addEventListener('click', (e) => handleGridClick(e, profileGridContainer));
         console.log("Listener clics (handleGridClick) ajouté à grille profil.");
    }
// <<< AJOUTER LE LISTENER POUR LA GRILLE DES FAVORIS (Profil) >>>
    if (favorisGridContainer) {
         favorisGridContainer.addEventListener('click', (e) => handleGridClick(e, favorisGridContainer));
         console.log("Listener clics (handleGridClick) ajouté à grille profil (favoris).");
    } else { console.warn("Grille profil (favoris) non trouvée pour listener."); }
    // <<< FIN AJOUT >>>
    // --- Listener pour Infinite Scroll & Scroll-to-Top ---
    const scrollTopBtn = document.getElementById('scroll-to-top-btn');
    let isScrolling; // Timer pour debounce scroll
    window.addEventListener('scroll', () => {
        // Debounce léger pour l'affichage du bouton
        window.clearTimeout(isScrolling);
        isScrolling = setTimeout(() => {
             if (scrollTopBtn) { scrollTopBtn.classList.toggle('show', window.scrollY > 300); }
        }, 150); // délai léger

        // Infinite Scroll (Accueil seulement)
        if (document.getElementById('view-accueil')?.classList.contains('active')) {
            const scrollThreshold = 300; // Pixels avant la fin
            if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - scrollThreshold) {
                 // Appelle loadRelais pour charger la suite
                 loadRelais(null, null, null, true);
            }
        }
    }, { passive: true }); // Option passive pour performance scroll

    if (scrollTopBtn) { scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' })); }


    // Affichage initial
    const activeSection = document.querySelector('.view-section.active');
    if (!activeSection || activeSection.id !== 'view-accueil') {
         showView('accueil');
    } else {
        navLinks.forEach(link => link.classList.remove('active'));
        document.querySelector('nav .nav-link[data-target="accueil"]')?.classList.add('active');
        // Si accueil est déjà actif, onAuthStateChanged s'occupera de lancer le premier loadRelais si user est déjà connecté.
    }

    setupInitialAuthButton();
    console.log("App Initialized.");
}

// Lance l'initialisation
document.addEventListener('DOMContentLoaded', initializeApp);
