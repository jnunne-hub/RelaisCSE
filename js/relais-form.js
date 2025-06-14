// js/relais-form.js

import { db, auth } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { currentUser, showView } from './app.js';
// Import des constantes et fonctions utilitaires partagées
import { ITEM_CONDITIONS, SUB_CATEGORIES, IMGUR_CLIENT_ID, GENDER_AGE_OPTIONS } from './config.js';
// Pas besoin d'importer populateSelectWithOptions s'il est défini localement

// --- Références DOM ---
const formNouveauRelais = document.getElementById('form-nouveau-relais');
const relaisCategorieSelect = document.getElementById('relais-categorie');
const sousCategorieContainer = document.getElementById('sous-categorie-container');
const relaisSousCategorieSelect = document.getElementById('relais-sous-categorie');
const genreAgeContainer = document.getElementById('genre-age-container');
const relaisGenreAgeSelect = document.getElementById('relais-genre-age');
const relaisEtatSelect = document.getElementById('relais-etat');
const relaisImageInput = document.getElementById('relais-image');
const imagePreview = document.getElementById('image-preview');
const noImageText = document.getElementById('no-image-text');
const submitRelaisButton = document.getElementById('submit-relais-button');
const submitRelaisStatus = document.getElementById('submit-relais-status');
const relaisTitreInput = document.getElementById('relais-titre');
const relaisDescriptionTextarea = document.getElementById('relais-description');
const relaisPrixInput = document.getElementById('relais-prix');
const imagePreviewContainer = document.getElementById('image-preview-container');


// --- Fonctions Utilitaires ---

/**
 * Peuple un élément <select> avec des options.
 * @param {HTMLSelectElement|null} selectEl L'élément select à peupler.
 * @param {string[]} options Tableau des valeurs/textes des options.
 * @param {string} [defaultText] Texte pour l'option désactivée par défaut (ex: "-- Choisir --").
 */
function populateSelectWithOptions(selectEl, options, defaultText) {
    if (!selectEl) {
        // Si on logue une erreur ici pour chaque champ non trouvé (comme sous-cat au début), ça pollue.
        // Mieux vaut vérifier l'existence avant l'appel si nécessaire.
        // console.error("populateSelectWithOptions: Element Select non trouvé !");
        return;
    }
    console.log(`Peuplement Select: ID=${selectEl.id}, Default='${defaultText}', Options:`, options); // LOG AJOUTÉ
    selectEl.innerHTML = ''; // Vide les options existantes

    // Ajoute l'option par défaut (si fournie)
    if (defaultText) {
        const defaultOpt = document.createElement('option');
        defaultOpt.value = "";
        defaultOpt.textContent = defaultText;
        defaultOpt.disabled = true; // Grisée
        defaultOpt.selected = true; // Sélectionnée par défaut
        selectEl.appendChild(defaultOpt);
    console.log(` > Option défaut ajoutée: value="", text=${defaultText}`); // LOG AJOUTÉ
    }

    // Ajoute les options fournies
    options.forEach(val => {
        const opt = document.createElement('option');
        opt.value = val; // La valeur envoyée sera le texte lui-même
        opt.textContent = val; // Le texte affiché
        selectEl.appendChild(opt);
    });
}

/**
 * Met à jour l'affichage et le statut 'required' des champs dépendants
 * (sous-catégorie et genre/âge) en fonction de la catégorie principale sélectionnée.
 */
function updateDependentFields() {
    // Note : on utilise les références globales définies au début du fichier.
    if (!relaisCategorieSelect || !sousCategorieContainer || !relaisSousCategorieSelect || !genreAgeContainer || !relaisGenreAgeSelect) {
        console.error("updateDependentFields: Un ou plusieurs éléments DOM dépendants sont introuvables! Vérifiez les ID HTML (relais-categorie, sous-categorie-container, relais-sous-categorie, genre-age-container, relais-genre-age).");
        return; // Arrêter si un élément crucial manque
    }

    const cat = relaisCategorieSelect.value; // Récupère la valeur SÉLECTIONNÉE

    // Si aucune catégorie n'est réellement sélectionnée (ex: on est sur "-- Choisir Catégorie --")
    if (!cat) {
        sousCategorieContainer.style.display = 'none';
        relaisSousCategorieSelect.required = false;
        relaisSousCategorieSelect.innerHTML = ''; // Vide les options

        genreAgeContainer.style.display = 'none';
        relaisGenreAgeSelect.required = false;
        relaisGenreAgeSelect.innerHTML = '';
        return; // C'est tout, on masque
    }

    // Récupérer les options de sous-catégorie pour la catégorie choisie
    const subOpts = SUB_CATEGORIES[cat] || [];
    // Déterminer si on doit montrer le champ Genre/Age
    const showGenreAge = (cat === "Vêtements" || cat === "Chaussures");

    // Gestion Affichage/Peuplement Sous-catégories
    if (subOpts.length > 0) {
        populateSelectWithOptions(relaisSousCategorieSelect, subOpts, "-- Choisir Sous-catégorie --");
        sousCategorieContainer.style.display = 'block'; // Affiche le conteneur
        relaisSousCategorieSelect.required = true; // Rend le champ obligatoire
    } else {
        sousCategorieContainer.style.display = 'none'; // Masque le conteneur
        relaisSousCategorieSelect.required = false; // Non obligatoire
        relaisSousCategorieSelect.innerHTML = ''; // Vide au cas où
    }

    // Gestion Affichage/Peuplement Genre/Age
    if (showGenreAge) {
        populateSelectWithOptions(relaisGenreAgeSelect, GENDER_AGE_OPTIONS, "-- Pour qui ? --");
        genreAgeContainer.style.display = 'block'; // Affiche le conteneur
        relaisGenreAgeSelect.required = true; // Rend obligatoire
    } else {
        genreAgeContainer.style.display = 'none'; // Masque le conteneur
        relaisGenreAgeSelect.required = false; // Non obligatoire
        relaisGenreAgeSelect.innerHTML = ''; // Vide au cas où
    }
}

/**
 * Configure la prévisualisation de l'image sélectionnée dans le champ 'file'.
 */
function setupImagePreview() {
    if (!relaisImageInput || !imagePreview || !noImageText) {
         console.warn("Éléments pour l'aperçu image non trouvés.");
         return;
     }
    relaisImageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            // Vérification de taille (ex: 10MB)
            if (file.size > 10 * 1024 * 1024) {
                alert("L'image est trop volumineuse (maximum 10 Mo).");
                relaisImageInput.value = ""; // Réinitialise le champ
                imagePreview.src = '#'; imagePreview.style.display = 'none';
                noImageText.style.display = 'inline'; // Remet le texte "Aucune image"
                return;
            }
            // Afficher l'aperçu
            const reader = new FileReader();
            reader.onload = (e) => {
                imagePreview.src = e.target.result;
                imagePreview.style.display = 'block'; // Affiche l'image
                noImageText.style.display = 'none'; // Masque le texte
            };
            reader.readAsDataURL(file); // Lit le fichier pour déclencher onload
        } else {
            // Si aucun fichier (ou sélection annulée)
            imagePreview.src = '#'; imagePreview.style.display = 'none';
            noImageText.style.display = 'inline';
        }
    });
}
function setupMultiImagePreview() {
    if (!relaisImageInput || !imagePreviewContainer || !noImageText) return;
    relaisImageInput.addEventListener('change', (event) => {
        const files = Array.from(event.target.files).slice(0, 3);
        imagePreviewContainer.innerHTML = '';
        if (files.length === 0) {
            noImageText.style.display = 'inline';
            return;
        }
        noImageText.style.display = 'none';
        files.forEach(file => {
            if (!file.type.match(/image.*/)) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.style.maxWidth = '90px';
                img.style.maxHeight = '90px';
                img.style.marginRight = '6px';
                imagePreviewContainer.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    });
}
async function uploadImagesToServer(files) {
    if (!files.length) throw new Error("Aucune image sélectionnée.");
    if (files.length > 3) throw new Error("Maximum 3 images.");
    const formData = new FormData();
    Array.from(files).slice(0, 3).forEach((file, i) => {
        formData.append('images[]', file);
    });

    // Adapte ici le chemin si ton upload.php est ailleurs
    const response = await fetch('/RelaisCSE/upload.php', {
        method: 'POST',
        body: formData
    });
    const data = await response.json();
    if (!data.urls || !Array.isArray(data.urls) || data.urls.length === 0) {
        throw new Error("Upload des images échoué.");
    }
    return data.urls;
}

/**
 * Uploade un fichier image sur Imgur via l'API anonyme.
 * @param {File} imageFile Le fichier image à uploader.
 * @returns {Promise<string>} Une promesse résolue avec l'URL de l'image uploadée.
 * @throws {Error} Lance une erreur si l'upload échoue ou si la config est manquante.
 */
async function uploadToImgur(imageFile) {
    if (!imageFile) throw new Error("Aucun fichier image fourni pour l'upload.");
    if (!IMGUR_CLIENT_ID || IMGUR_CLIENT_ID === 'VOTRE_CLIENT_ID_IMGUR') { // Vérification simple
        throw new Error("Configuration Imgur Client ID manquante ou invalide.");
    }

    const formData = new FormData();
    formData.append('image', imageFile);

    // Utilise le span de statut du formulaire actif (nouveau ou édition)
    const statusEl = document.getElementById('submit-relais-status') // Nouveau
                      || document.getElementById('edit-submit-relais-status'); // Edition

    if (statusEl) statusEl.textContent = "Téléversement image...";
    console.log("Tentative d'upload sur Imgur...");

    try {
        const response = await fetch('https://api.imgur.com/3/image', {
            method: 'POST',
            headers: {
                Authorization: `Client-ID ${IMGUR_CLIENT_ID}`
            },
            body: formData
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            console.error("Erreur réponse Imgur:", data);
            throw new Error(`Échec upload Imgur: ${data.data?.error || 'Réponse invalide'}`);
        }

        console.log('Upload Imgur réussi! Lien:', data.data.link);
        if (statusEl) statusEl.textContent = "Image téléversée.";
        return data.data.link; // Retourne l'URL de l'image

    } catch (error) {
        console.error("Erreur pendant l'upload Imgur:", error);
        if (statusEl) statusEl.textContent = "Échec upload image.";
        // Propage l'erreur pour qu'elle soit gérée par l'appelant (handleNewRelaisSubmit)
        throw error;
    }
}

/**
 * Gère la soumission du formulaire de création d'un nouveau relais.
 * Valide les champs, upload l'image, et enregistre dans Firestore.
 * @param {Event} event L'événement de soumission.
 */
async function handleNewRelaisSubmit(event) {
    event.preventDefault();
    if (!currentUser) {
        alert("Veuillez vous connecter pour proposer un relais.");
        return;
    }

    if (submitRelaisButton) submitRelaisButton.disabled = true;
    if (submitRelaisStatus) submitRelaisStatus.textContent = "Vérification...";

    // 1. Upload images (multi)
    const imageFiles = relaisImageInput.files;
    let imageUrls = [];
    if (!imageFiles || imageFiles.length === 0) {
        alert("Veuillez sélectionner au moins une image pour votre relais.");
        if (submitRelaisButton) submitRelaisButton.disabled = false;
        if (submitRelaisStatus) submitRelaisStatus.textContent = "";
        return;
    }
    if (imageFiles.length > 3) {
        alert("Vous ne pouvez sélectionner que 3 images maximum.");
        if (submitRelaisButton) submitRelaisButton.disabled = false;
        if (submitRelaisStatus) submitRelaisStatus.textContent = "";
        return;
    }
    try {
        imageUrls = await uploadImagesToServer(imageFiles);
    } catch (error) {
        alert("Erreur lors de l'upload des images: " + error.message);
        if (submitRelaisButton) submitRelaisButton.disabled = false;
        if (submitRelaisStatus) submitRelaisStatus.textContent = "";
        return;
    }

    // 2. Valider les autres champs
    try {
        if (submitRelaisStatus) submitRelaisStatus.textContent = "Préparation des données...";
        const titre = relaisTitreInput.value.trim();
        const description = relaisDescriptionTextarea.value.trim();
        const prixInputVal = relaisPrixInput.value;
        const categorie = relaisCategorieSelect.value;
        const sousCategorie = relaisSousCategorieSelect.value;
        const etat = relaisEtatSelect.value;
        const genreAge = relaisGenreAgeSelect.value;

        // Validations des champs obligatoires
        if (!titre || !description || !categorie || prixInputVal === "" || !etat) {
            throw new Error("Veuillez remplir tous les champs obligatoires (*).");
        }
        // Valider les champs dépendants seulement s'ils sont requis (visibles)
        if (relaisSousCategorieSelect.required && !sousCategorie) {
            throw new Error("Veuillez choisir une sous-catégorie.");
        }
        if (relaisGenreAgeSelect.required && !genreAge) {
            throw new Error("Veuillez choisir pour qui est l'article (Homme/Femme/Enfant...).");
        }
        // Valider le prix
        const prix = parseFloat(prixInputVal);
        if (isNaN(prix) || prix < 0) {
            throw new Error("Le prix saisi est invalide. Entrez un nombre (0 pour gratuit).");
        }

        if (submitRelaisStatus) submitRelaisStatus.textContent = "Enregistrement...";

        // 3. Préparer l'objet de données pour Firestore
        const data = {
            titre,
            description,
            prix,
            categorie,
            etat,
            images: imageUrls, // <- Champ tableau d'URLs
            user_id: currentUser.uid,
            user_nom: currentUser.displayName || currentUser.email.split('@')[0],
            user_photo: currentUser.photoURL || null,
            timestamp: serverTimestamp(),
            statut: 'disponible',
            favoriteCount: 0
        };
        if (relaisSousCategorieSelect.required && sousCategorie) {
            data.sous_categorie = sousCategorie;
        }
        if (relaisGenreAgeSelect.required && genreAge) {
            data.genreAge = genreAge;
        }

        // 4. Ajouter le document à Firestore
        await addDoc(collection(db, "annonces"), data);
        if (submitRelaisStatus) submitRelaisStatus.textContent = "Relais ajouté !";
        alert("Votre relais a été proposé avec succès !");

        // 5. Réinitialiser le formulaire complet
        formNouveauRelais.reset();
        if (imagePreviewContainer) imagePreviewContainer.innerHTML = '';
        if (noImageText) noImageText.style.display = 'inline';
        updateDependentFields();

        // 6. Rediriger vers l'accueil après un délai
        setTimeout(() => {
            if (submitRelaisButton) submitRelaisButton.disabled = false;
            if (submitRelaisStatus) submitRelaisStatus.textContent = "";
            showView('accueil');
        }, 1500);

    } catch (error) {
        console.error("Erreur lors de la sauvegarde du relais:", error);
        alert(`Erreur lors de la création du relais: ${error.message}`);
        if (submitRelaisButton) submitRelaisButton.disabled = false;
        if (submitRelaisStatus) submitRelaisStatus.textContent = "Échec de l'enregistrement.";
    }
}



/**
 * Met en place les listeners et le peuplement initial du formulaire "Nouveau Relais".
 */
function setupNewRelaisForm() {
    // Vérification initiale des éléments clés
    if (!formNouveauRelais || !relaisCategorieSelect || !relaisEtatSelect || !relaisImageInput) {
        console.error("Init Form: Éléments essentiels manquants (#form-nouveau-relais, #relais-categorie, #relais-etat, #relais-image).");
        return;
    }
    console.log("Initialisation formulaire Nouveau Relais...");

    // 1. Attacher listener de soumission
    formNouveauRelais.addEventListener('submit', handleNewRelaisSubmit);

    // 2. Configurer l'aperçu image et l'affichage du nom de fichier
    setupMultiImagePreview();
    //setupFileNameDisplay('relais-image', 'file-name-display-new');

    // 3. Peupler le select "État"
    if (relaisEtatSelect) {
        populateSelectWithOptions(relaisEtatSelect, ITEM_CONDITIONS, "-- Choisir État --");
    } else { console.warn("Init Form: #relais-etat non trouvé."); }

    // 4. Peupler le select principal "Catégorie" AVEC l'option par défaut
    if (relaisCategorieSelect) {
        const mainCategories = Object.keys(SUB_CATEGORIES);
        populateSelectWithOptions(relaisCategorieSelect, mainCategories, "-- Choisir Catégorie --"); // Texte par défaut ajouté ici

        // 5. Attacher le listener 'change' UNIQUEMENT APRÈS peuplement
        relaisCategorieSelect.addEventListener('change', updateDependentFields);
        console.log("Listener 'change' ajouté à #relais-categorie.");

        // --- CORRECTIF : Forcer la sélection initiale avec setTimeout ---
        // Pour contrer le remplissage auto du navigateur qui pourrait sélectionner "Vêtements"
        setTimeout(() => {
            if (relaisCategorieSelect.options.length > 0 && relaisCategorieSelect.options[0].value === "") {
                relaisCategorieSelect.value = ""; // Force la sélection de l'option avec value=""
                console.log("Valeur initiale de #relais-categorie forcée à ''.");
                // On s'assure que les champs dépendants sont bien masqués au cas où
                // l'état initial aurait été perturbé par le navigateur.
                updateDependentFields();
            } else {
                 console.warn("L'option par défaut ('') n'a pas été trouvée pour forcer la sélection.");
                 // Appeler updateDependentFields quand même pour assurer l'état initial correct des dépendances
                  updateDependentFields();
            }
        }, 1000); // Un délai très court suffit souvent
        // --- FIN CORRECTIF ---

    } else { console.warn("Init Form: #relais-categorie non trouvé."); }

    // 6. L'appel initial à updateDependentFields est maintenant DANS le setTimeout
    //    pour s'exécuter APRES le forçage potentiel de la valeur.
    // updateDependentFields(); // Plus besoin ici
}

// --- Exports pour utilisation externe (principalement par app.js) ---
export { setupNewRelaisForm, uploadToImgur, populateSelectWithOptions };