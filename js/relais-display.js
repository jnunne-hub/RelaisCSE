// ==================================================================
// MODULE: relais-display.js (v4 - Favoris Client Simple, Pas de Compteur)
// Gère le chargement (avec pagination) et l'affichage des cartes de relais
// pour la grille d'accueil. Utilise le Set global de favoris de l'utilisateur
// pour déterminer l'état du cœur (plein/vide).
// N'affiche PAS le compteur total de favoris.
// ==================================================================

import { db } from './firebase-config.js';
import {
    collection, query, orderBy, limit, getDocs, where, startAfter
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { currentUser, userFavorites } from './app.js';
import { CATEGORY_ICONS, GENDER_ICONS } from './config.js';

// --- Références DOM ---
const relaisGridContainer = document.getElementById('relais-grid')?.querySelector('.grid-container');
const loadingMessage = document.getElementById('loading-message');
const profilRelaisGrid = document.getElementById('profil-relais-grid');
let loadingMoreIndicator = document.getElementById('loading-more-indicator');
if (!loadingMoreIndicator && document.getElementById('relais-grid')) {
    loadingMoreIndicator = document.createElement('div');
    loadingMoreIndicator.id = 'loading-more-indicator';
    loadingMoreIndicator.style.textAlign = 'center';
    loadingMoreIndicator.style.padding = '20px';
    loadingMoreIndicator.style.display = 'none';
    loadingMoreIndicator.innerHTML = '<i class="fas fa-spinner fa-spin fa-2x" style="color: var(--primary-color);"></i>';
    document.getElementById('relais-grid').appendChild(loadingMoreIndicator);
}

// --- État du Module ---
const state = {
    isLoadingRelais: false,
    isLoadingMore: false,
    lastVisibleDoc: null,
    itemsPerLoad: 12,
    noMoreItems: false,
    currentFilters: {}
};

/**
 * Charge les relais depuis Firestore avec pagination pour la vue Accueil.
 */
async function loadRelais(filtreCategorie = null, filtreSousCategorie = null, filtreGenreAge = null, loadMore = false) {
    // Gérer les flags pour éviter les chargements concurrents ou inutiles
    if (loadMore && (state.isLoadingRelais || state.isLoadingMore || state.noMoreItems)) {
        return;
    }
    if (!loadMore && state.isLoadingRelais) {
        return;
    }
    if (!relaisGridContainer) {
        console.error("loadRelais (Accueil): La grille #relais-grid .grid-container est introuvable!");
        state.isLoadingRelais = false;
        state.isLoadingMore = false;
        return;
    }

    // --- Mise à jour de l'état de chargement ---
    if (loadMore) {
        state.isLoadingMore = true;
        if (loadingMoreIndicator) loadingMoreIndicator.style.display = 'block';
        console.log(`[Accueil] Chargement de la suite... (après doc ID: ${state.lastVisibleDoc?.id})`);
    } else {
        state.isLoadingRelais = true;
        if (loadingMessage) { loadingMessage.textContent = "Chargement..."; loadingMessage.style.display = 'block'; }
        relaisGridContainer.innerHTML = '';
        state.lastVisibleDoc = null;
        state.noMoreItems = false;
        state.currentFilters = { filtreCategorie, filtreSousCategorie, filtreGenreAge };
        if (loadingMoreIndicator) loadingMoreIndicator.style.display = 'none';
        console.log(`[Accueil] Chargement initial/reset - Filtres:`, state.currentFilters);
    }

    const currentUserFavorites = userFavorites;
    console.log("[Accueil] Utilisation du Set 'userFavorites' global:", currentUserFavorites);

    try {
        const annoncesRef = collection(db, "annonces");
        let conditions = [];
        conditions.push(where("statut", "==", "disponible"));
        if (state.currentFilters.filtreCategorie && state.currentFilters.filtreCategorie !== 'all') conditions.push(where("categorie", "==", state.currentFilters.filtreCategorie));
        if (state.currentFilters.filtreSousCategorie && state.currentFilters.filtreSousCategorie !== 'all') conditions.push(where("sous_categorie", "==", state.currentFilters.filtreSousCategorie));
        if (state.currentFilters.filtreGenreAge && state.currentFilters.filtreGenreAge !== 'all') conditions.push(where("genreAge", "==", state.currentFilters.filtreGenreAge));

        let q = query(annoncesRef, ...conditions, orderBy("timestamp", "desc"));
        if (loadMore && state.lastVisibleDoc) {
            q = query(q, startAfter(state.lastVisibleDoc));
        }
        q = query(q, limit(state.itemsPerLoad));
        const annonceSnapshot = await getDocs(q);

        if (!loadMore && loadingMessage) loadingMessage.style.display = 'none';

        if (annonceSnapshot.empty) {
            if (!loadMore) {
                let msg = "Aucun relais trouvé";
                let filtersApplied = Object.values(state.currentFilters).filter(f => f && f !== 'all');
                if (filtersApplied.length > 0) { msg += ` pour les filtres: "${filtersApplied.join(' / ')}"`; }
                msg += ".";
                relaisGridContainer.innerHTML = `<p style="text-align:center; color:var(--text-color-medium); padding: 20px;">${msg}</p>`;
            } else {
                console.log("[Accueil] Plus aucun relais à charger pour ces filtres.");
            }
            state.noMoreItems = true;
        } else {
            console.log(`[Accueil] ${annonceSnapshot.size} relais chargés.`);
            state.lastVisibleDoc = annonceSnapshot.docs[annonceSnapshot.docs.length - 1];
            if (annonceSnapshot.size < state.itemsPerLoad) {
                state.noMoreItems = true;
            }
            annonceSnapshot.forEach((doc) => {
                createRelaisCard({ id: doc.id, ...doc.data() }, relaisGridContainer, currentUserFavorites);
            });
        }

    } catch (error) {
        console.error("[Accueil] Erreur lors du chargement des relais:", error);
        if (!loadMore && loadingMessage) loadingMessage.style.display = 'none';
        if (!loadMore && relaisGridContainer) {
            let errorMsg = "Impossible de charger les relais.";
            if (error.code === 'failed-precondition') errorMsg += " (Index manquant)";
            relaisGridContainer.innerHTML = `<p style="color:red; padding:20px; text-align:center;">${errorMsg}</p>`;
        }
        state.noMoreItems = true;
    } finally {
        if (loadMore) {
            state.isLoadingMore = false;
            if (loadingMoreIndicator) loadingMoreIndicator.style.display = 'none';
        } else {
            state.isLoadingRelais = false;
        }
    }
}

/**
 * Crée la carte HTML pour un relais et l'ajoute au conteneur cible.
 * Affiche la première image du tableau `images`, ou `url_image`, ou un placeholder.
 */
// DANS js/relais-display.js
function createRelaisCard(relaisData, targetContainer, favoritedIds) {
    if (!targetContainer || !(targetContainer instanceof HTMLElement)) {
        const fallbackGrid = document.getElementById('relais-grid')?.querySelector('.grid-container');
        if (!fallbackGrid) { console.error(`CRITIQUE: createRelaisCard n'a ni cible ni fallback pour ${relaisData?.id}.`); return; }
        targetContainer = fallbackGrid;
        console.warn(`createRelaisCard: Cible invalide, fallback sur grille accueil pour ${relaisData?.id}.`);
    }
    if (targetContainer.querySelector(`article[data-id="${relaisData.id}"]`)) {
        console.warn(`Carte déjà présente pour ${relaisData.id}, saut de création.`);
        return;
    }
    if (!(favoritedIds instanceof Set)) {
        favoritedIds = new Set();
    }
    if (!relaisData || !relaisData.id) {
        console.error("createRelaisCard: Données relais invalides ou ID manquant.");
        return;
    }

    const isOwnRelais = currentUser && currentUser.uid === relaisData.user_id;
    const isFavoritedByUser = currentUser ? favoritedIds.has(relaisData.id) : false;
    const isOwnProposedGrid = profilRelaisGrid && targetContainer === profilRelaisGrid;

    const displayFavoriteButton = currentUser && !isOwnRelais;
    const displayStatusTag = relaisData.statut && relaisData.statut !== 'disponible';
    const displayOwnerActions = isOwnRelais && relaisData.statut === 'disponible'; // Affiche Editer/Suppr/Marquer si c'est mon annonce et dispo
    const displayFavoriteCount = isOwnProposedGrid && typeof relaisData.favoriteCount === 'number' && relaisData.favoriteCount > 0;
    const shouldGreyOutCard = relaisData.statut !== 'disponible';

    const categoryIconClass = CATEGORY_ICONS[relaisData.categorie] || CATEGORY_ICONS["default"];
    const genderIconClass = GENDER_ICONS[relaisData.genreAge] || GENDER_ICONS["default"];
    const favoriteIconClass = isFavoritedByUser ? 'fas fa-heart' : 'far fa-heart';

    const categoryTag = `<span class="tag tag-category"><i class="${categoryIconClass} fa-fw" aria-hidden="true"></i> ${relaisData.categorie || 'N/A'}</span>`;
    const conditionTag = relaisData.etat ? `<span class="tag tag-condition">${relaisData.etat}</span>` : '';
    const genreAgeTag = (relaisData.genreAge && (relaisData.categorie === 'Vêtements' || relaisData.categorie === 'Chaussures'))
        ? `<span class="tag tag-genre"><i class="${genderIconClass} fa-fw" aria-hidden="true"></i> ${relaisData.genreAge}</span>` : '';
    const statusTag = displayStatusTag
        ? `<span class="tag tag-status tag-status-${relaisData.statut}">${relaisData.statut === 'relayé' ? 'Relayé' : relaisData.statut}</span>` : '';
    const favCountSpan = displayFavoriteCount
        ? `<span class="card-favorite-count" title="${relaisData.favoriteCount} ${relaisData.favoriteCount > 1 ? 'favoris' : 'favori'}"><i class="fas fa-heart" aria-hidden="true"></i> ${relaisData.favoriteCount}</span>` : '';

    const isGratuit = relaisData.prix === 0;
    const prixText = isGratuit ? 'Gratuit' : `${(relaisData.prix || 0).toFixed(2)} €`;
    const favoriteButtonTitle = isFavoritedByUser ? 'Retirer des favoris' : 'Ajouter aux favoris';
    const favoriteDataState = isFavoritedByUser ? 'true' : 'false';

    const card = document.createElement('article');
    card.className = 'relais-card btn-voir-details'; // Ajout de la classe pour le clic général
    card.dataset.id = relaisData.id;
    if (relaisData.etat) card.dataset.condition = relaisData.etat;
    if (shouldGreyOutCard) card.classList.add('is-relayed');

    card.innerHTML = `
        <div class="relais-card-image-container">
            <img src="/RelaisCSE/${relaisData.images && relaisData.images.length > 0 ? relaisData.images[0] : 'https://via.placeholder.com/300x200/EFEFEF/AAAAAA?text=Image+Indispo'}" alt="Image pour ${relaisData.titre || 'relais sans titre'}" loading="lazy">
            ${displayFavoriteButton ? `
            <button class="btn btn-overlay-favorite ${isFavoritedByUser ? 'is-favorited' : ''}"
                    data-id="${relaisData.id}" data-favorited="${favoriteDataState}"
                    title="${favoriteButtonTitle}" aria-label="${favoriteButtonTitle}"
                    data-owner-id="${relaisData.user_id}">
                <i class="${favoriteIconClass}"></i>
            </button>` : ''}
        </div>
        <div class="relais-card-content">
            <div class="relais-card-tags">
                ${categoryTag} ${conditionTag} ${genreAgeTag} ${statusTag}
            </div>
            <h3 class="relais-card-title">${relaisData.titre || 'Titre indisponible'}</h3>
            <p class="relais-card-price ${isGratuit ? 'gratuit' : ''}">
                ${isGratuit ? '<i class="fas fa-leaf fa-fw"></i>' : ''} ${prixText}
            </p>
            <div class="relais-card-actions">
                <button class="btn btn-sm btn-voir-details-icon" data-id="${relaisData.id}" title="Voir les détails">
                    <i class="fas fa-eye fa-fw"></i>
                    <span class="button-text-sr-only">Voir</span>
                </button>

                ${displayOwnerActions ? `
                    <button class="btn btn-sm btn-mark-relayed" data-id="${relaisData.id}" title="Marquer comme effectué/donné">
                        <i class="fas fa-check-circle fa-fw"></i>
                        <span class="button-text-sr-only">Marquer Relayé</span>
                    </button>
                    <button class="btn btn-sm btn-edit-relais" data-id="${relaisData.id}" data-owner-id="${relaisData.user_id}" title="Modifier">
                        <i class="fas fa-pencil-alt fa-fw"></i>
                        <span class="button-text-sr-only">Modifier</span>
                    </button>
                    <button class="btn btn-sm btn-delete-relais" data-id="${relaisData.id}" title="Supprimer">
                        <i class="fas fa-trash-alt fa-fw"></i>
                        <span class="button-text-sr-only">Supprimer</span>
                    </button>
                ` : ''}

                ${favCountSpan}
            </div>
        </div>
    `;
    targetContainer.appendChild(card);
}

// --- Export des fonctions nécessaires ---
export { loadRelais, createRelaisCard };
