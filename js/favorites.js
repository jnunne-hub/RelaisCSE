// js/favorites.js (Version Client Simple)
import { db } from './firebase-config.js';
import {
    collection, addDoc, deleteDoc, query, where, getDocs, serverTimestamp, limit, doc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const favorisRef = collection(db, "favoris");

/**
 * Trouve le document favori spécifique liant un user et un relais.
 * Nécessite index composite (userId, relaisId).
 */
async function getSpecificFavoriteDoc(userId, relaisId) {
    if (!userId || !relaisId) return null;
    const q = query(
        favorisRef,
        where("userId", "==", userId),
        where("relaisId", "==", relaisId),
        limit(1)
    );
    try {
        const querySnapshot = await getDocs(q);
        return querySnapshot.empty ? null : querySnapshot.docs[0];
    } catch (error) {
        console.error("Erreur getSpecificFavoriteDoc:", error);
        // Gérer erreur index si besoin
        if (error.code === 'failed-precondition') {
            console.error("INDEX MANQUANT pour la requête favori spécifique (userId, relaisId).");
        }
        return null;
    }
}

/**
 * AJOUTE un document dans la collection 'favoris'.
 * Retourne true en cas de succès, false sinon.
 */
async function addFavorite(userId, relaisId) {
    if (!userId || !relaisId) return false;
    console.log(`[Client] Ajout favori DB: User ${userId}, Relais ${relaisId}`);
    try {
        // Optionnel : Vérifier si déjà favori pour éviter écriture inutile
        const existing = await getSpecificFavoriteDoc(userId, relaisId);
        if (existing) {
            console.warn(`[Client] addFavorite: Le favori existe déjà (ID: ${existing.id}).`);
            return true; // Considéré comme succès car l'état est correct
        }
        // Ajoute le document
        await addDoc(favorisRef, {
            userId: userId,
            relaisId: relaisId,
            timestamp: serverTimestamp()
        });
        console.log("[Client] Document favori ajouté à Firestore.");
        return true;
    } catch (error) {
        console.error("[Client] Erreur lors de l'ajout du document favori:", error);
        alert("Erreur lors de l'ajout aux favoris. Vérifiez les permissions Firestore pour 'favoris/create'.");
        return false;
    }
}

/**
 * SUPPRIME un document de la collection 'favoris'.
 * Retourne true en cas de succès ou si le document n'existait pas, false en cas d'erreur.
 */
async function removeFavorite(userId, relaisId) {
    if (!userId || !relaisId) return false;
    console.log(`[Client] Suppression favori DB: User ${userId}, Relais ${relaisId}`);
    try {
        const favDoc = await getSpecificFavoriteDoc(userId, relaisId);
        if (favDoc) {
            await deleteDoc(favDoc.ref); // Supprime le document trouvé
            console.log("[Client] Document favori supprimé de Firestore.");
            return true;
        } else {
            console.warn("[Client] removeFavorite: Document favori non trouvé, rien à supprimer.");
            return true; // L'état est déjà "non favori"
        }
    } catch (error) {
        console.error("[Client] Erreur lors de la suppression du document favori:", error);
        alert("Erreur lors de la suppression du favori. Vérifiez les permissions Firestore pour 'favoris/delete'.");
        return false;
    }
}

/**
 * Récupère TOUS les IDs des relais favoris pour un utilisateur donné.
 */
async function getUserFavoriteIds(userId) {
    const favoriteIds = new Set();
    if (!userId) return favoriteIds;
    console.log(`[Client] Récupération des IDs favoris pour ${userId}...`);
    const q = query(favorisRef, where("userId", "==", userId));
    try {
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            favoriteIds.add(doc.data().relaisId);
        });
        console.log(`[Client] ${favoriteIds.size} IDs favoris trouvés.`);
    } catch (error) {
        console.error("Erreur récupération IDs favoris user:", error);
        alert("Erreur lors du chargement de vos favoris. Vérifiez les permissions Firestore pour 'favoris/list'.");
        // Retourne un Set vide en cas d'erreur
    }
    return favoriteIds;
}

// Exporte les fonctions nécessaires pour app.js
export { addFavorite, removeFavorite, getUserFavoriteIds };
