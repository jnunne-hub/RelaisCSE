// ==================================================================
// MODULE: config.js
// Contient les constantes et configurations partagées de l'application.
// ==================================================================

/**
 * Conditions possibles pour un article proposé en relais.
 * Utilisé pour les menus déroulants dans les formulaires.
 * @type {string[]}
 */
export const ITEM_CONDITIONS = [
    "Neuf avec étiquette",
    "Très bon état",
    "Bon état",
    "Satisfaisant"
];

/**
 * Mappage des catégories principales vers leurs sous-catégories respectives.
 * Utilisé pour les menus déroulants dépendants dans les formulaires et les filtres.
 * Une catégorie principale sans entrée ici ou avec un tableau vide n'aura pas de sous-catégories.
 * @type {Object.<string, string[]>}
 */
export const SUB_CATEGORIES = {
    "Vêtements": ["Haut (T-shirt, Pull...)", "Bas (Pantalon, Jupe...)", "Robe", "Manteau/Veste", "Accessoires (Écharpe...)", "Autre Vêtement"],
    "Chaussures": ["Baskets", "Chaussures de ville", "Bottes/Bottines", "Sandales", "Autre Chaussure"],
    "Jouets": ["Jeux de société", "Peluches/Poupées", "Véhicules", "Construction", "Électronique", "Premier âge", "Autre Jouet"],
    "Maison": ["Décoration", "Vaisselle/Cuisine", "Linge de maison", "Petit électroménager", "Mobilier (petit)", "Autre Maison"],
    "Livres": ["Roman/Littérature", "BD/Manga", "Jeunesse", "Documentaire/Pratique", "Magazine", "Autre Livre"],
    "Animaux": ["Nourriture", "Accessoires", "Santé"],
    "Divers": ["Accessoires Mode", "Électronique", "Sport/Loisirs", "Culture/Musique", "Bricolage", "Autre Divers"]
    // Note: Pas besoin d'entrée pour 'all' ou les catégories sans sous-catégories définies.
};

/**
 * Icônes Font Awesome associées aux catégories principales.
 * Utiliser des icônes FA v6 Free (fas = solid, far = regular, fab = brands).
 * @type {Object.<string, string>}
 */
export const CATEGORY_ICONS = {
    "Vêtements": "fas fa-tshirt", // ou fa-user-tie, fa-vest...
    "Chaussures": "fas fa-shoe-prints",
    "Jouets": "fas fa-puzzle-piece", // ou fa-shapes, fa-baby-carriage...
    "Maison": "fas fa-house-chimney-window", // ou fa-couch, fa-lamp...
    "Livres": "fas fa-book-open",
    "Divers": "fas fa-box-open", // Ou fa-shapes
    "default": "fas fa-tag" // Icône par défaut si catégorie inconnue
};

/**
 * Icônes Font Awesome associées aux genres/âges.
 * @type {Object.<string, string>}
 */
export const GENDER_ICONS = {
    "Homme": "fas fa-male", // Ou fa-person
    "Femme": "fas fa-female", // Ou fa-person-dress
    "Enfant": "fas fa-child", // Ou fa-baby
    "Mixte/Non spécifié": "fas fa-genderless", // Ou fa-circle-question
    "default": "fas fa-genderless"
};

/**
 * Client ID pour l'API Imgur (Upload anonyme).
 * TODO: Pour une meilleure sécurité en production, envisagez de passer par une fonction Cloud
 * pour masquer cet ID côté client.
 * @type {string}
 */
export const IMGUR_CLIENT_ID = 'd838204b9e0528c'; // Vous pouvez aussi déplacer ceci ici

/**
 * Options pour le filtre/champ Genre/Âge, applicable aux vêtements et chaussures.
 * @type {string[]}
 */
export const GENDER_AGE_OPTIONS = ["Homme", "Femme", "Enfant", "Mixte/Non spécifié"];
