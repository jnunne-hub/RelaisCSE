import { db, auth } from './firebase-config.js'; // Besoin de auth pour currentUser
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { currentUser, showView } from './app.js'; // Importe état global et navigation

import { ITEM_CONDITIONS, SUB_CATEGORIES, GENDER_AGE_OPTIONS } from './config.js'; // <- MODIFIÉ: Import

// Importe les fonctions partagées depuis relais-form.js (ou un utils.js)
import { uploadToImgur, populateSelectWithOptions } from './relais-form.js';
import { closeAllModals } from './app.js';


const editModalOverlay = document.getElementById('edit-relais-modal');
const editModalCloseButton = document.getElementById('edit-modal-close-button');
const editModalLoading = document.getElementById('edit-modal-loading');
const editModalError = document.getElementById('edit-modal-error');
const editRelaisForm = document.getElementById('edit-relais-form');
const editRelaisIdInput = document.getElementById('edit-relais-id');
const editOriginalImageUrlInput = document.getElementById('edit-original-image-url');
const editRelaisTitreInput = document.getElementById('edit-relais-titre');
const editRelaisDescriptionTextarea = document.getElementById('edit-relais-description');
const editRelaisCategorieSelect = document.getElementById('edit-relais-categorie');
const editSousCategorieContainer = document.getElementById('edit-sous-categorie-container');
const editRelaisSousCategorieSelect = document.getElementById('edit-relais-sous-categorie');
const editRelaisPrixInput = document.getElementById('edit-relais-prix');
const editRelaisEtatSelect = document.getElementById('edit-relais-etat');
const editCurrentImage = document.getElementById('edit-current-image');
const editRelaisImageInput = document.getElementById('edit-relais-image');
const editNewImagePreview = document.getElementById('edit-new-image-preview');
const editNoNewImageText = document.getElementById('edit-no-new-image-text');
const editSubmitRelaisButton = document.getElementById('edit-submit-relais-button');
const editSubmitRelaisStatus = document.getElementById('edit-submit-relais-status');
const editGenreAgeContainer = document.getElementById('edit-genre-age-container');
const editRelaisGenreAgeSelect = document.getElementById('edit-relais-genre-age');

let newImageFileToUpload = null; // Variable pour le fichier de la modale d'édition


// Ouvre la modale d'édition et pré-remplit
async function openEditModal(relaisId) {
    document.getElementById('edit-relais-modal').style.display = 'flex';

    // Références des éléments DOM
    const editModalOverlay = document.getElementById('edit-relais-modal');
    const editRelaisForm = document.getElementById('edit-relais-form');
    const editModalLoading = document.getElementById('edit-modal-loading');
    const editModalError = document.getElementById('edit-modal-error');
    const editRelaisImageInput = document.getElementById('edit-relais-image');
    const editNewImagePreview = document.getElementById('edit-new-image-preview');
    const editNoNewImageText = document.getElementById('edit-no-new-image-text');

    if (!editModalOverlay || !currentUser) return;
    console.log(`Opening edit for ID: ${relaisId}`);

    // Reset état visuel
    if (editRelaisImageInput) editRelaisImageInput.value = "";
    if (editNewImagePreview) editNewImagePreview.style.display = 'none';
    if (editNoNewImageText) editNoNewImageText.style.display = 'inline';
    if (editModalLoading) editModalLoading.style.display = 'block';
    if (editRelaisForm) editRelaisForm.style.display = 'none';
    if (editModalError) editModalError.style.display = 'none';

    // Montre la modale d'édition
    editModalOverlay.style.display = 'flex';
console.log('edit-relais-modal display =', editModalOverlay.style.display);
console.log('edit-relais-modal visibility =', window.getComputedStyle(editModalOverlay).visibility);
console.log('edit-relais-modal opacity =', window.getComputedStyle(editModalOverlay).opacity);

    try {
        const ref = doc(db, "annonces", relaisId);
        const snap = await getDoc(ref);
        if (!snap.exists()) throw new Error("Relais non trouvé.");
        const data = snap.data();
        if (data.user_id !== currentUser.uid) throw new Error("Non autorisé.");
        // Peuple le formulaire (ta fonction à toi)
        populateEditForm(data, relaisId);

        // Affiche le formulaire, cache le loading
        if (editModalLoading) editModalLoading.style.display = 'none';
        if (editRelaisForm) editRelaisForm.style.display = 'block';

    } catch (error) {
        console.error("Error opening edit modal:", error);
        if (editModalLoading) editModalLoading.style.display = 'none';
        if (editModalError) {
            editModalError.textContent = `Erreur: ${error.message || "Impossible de charger."}`;
            editModalError.style.display = 'block';
        }
    }
}


// Remplit le formulaire d'édition
function populateEditForm(d, relaisId) { /* ... (Copiez la fonction ici) ... */
     if (!editRelaisForm) 
         return; 
    editRelaisIdInput.value = relaisId; 
    editOriginalImageUrlInput.value = d.url_image || ''; 
    
    if(editRelaisTitreInput) editRelaisTitreInput.value = d.titre || ''; 
    if(editRelaisDescriptionTextarea) editRelaisDescriptionTextarea.value = d.description || ''; 
    if(editRelaisPrixInput) editRelaisPrixInput.value = d.prix !== undefined ? d.prix : ''; 
    if (editRelaisCategorieSelect) { 
        if(editRelaisCategorieSelect.options.length <=1) populateSelectWithOptions(editRelaisCategorieSelect, Object.keys(SUB_CATEGORIES), "-- Catégorie --"); 
        editRelaisCategorieSelect.value = d.categorie || ''; } 
    if (editRelaisEtatSelect) { 
        if(editRelaisEtatSelect.options.length <=1) populateSelectWithOptions(editRelaisEtatSelect, ITEM_CONDITIONS, "-- État --"); 
        editRelaisEtatSelect.value = d.etat || ''; } 
    
    updateEditSubCategoryOptions(d.categorie, d.sous_categorie); 
    updateEditGenreAgeOptions(d.categorie, d.genreAge); // <- Appel pour genre/age

    if(editCurrentImage) { 
        editCurrentImage.src = d.url_image || '...'; 
        editCurrentImage.alt = `Actuelle: ${d.titre}`; } if(editRelaisImageInput) editRelaisImageInput.value = null; if(editNewImagePreview) editNewImagePreview.style.display = 'none'; if(editNoNewImageText) editNoNewImageText.style.display = 'inline'; newImageFileToUpload = null; if(editSubmitRelaisStatus) editSubmitRelaisStatus.textContent = ''; if(editSubmitRelaisButton) editSubmitRelaisButton.disabled = false;
}


// Met à jour les sous-catégories dans le form d'édition
function updateEditSubCategoryOptions(cat, selectedVal) { /* ... (Copiez la fonction ici) ... */
     if (!editSousCategorieContainer || !editRelaisSousCategorieSelect) return; const opts = SUB_CATEGORIES[cat] || []; if (opts.length > 0) { populateSelectWithOptions(editRelaisSousCategorieSelect, opts, "-- Sous-catégorie --"); if (selectedVal) editRelaisSousCategorieSelect.value = selectedVal; editSousCategorieContainer.style.display = 'block'; editRelaisSousCategorieSelect.required = true; } else { editSousCategorieContainer.style.display = 'none'; editRelaisSousCategorieSelect.required = false; editRelaisSousCategorieSelect.innerHTML = ''; }
}

// NOUVEAU: Met à jour le champ Genre/Age dans le form d'édition
function updateEditGenreAgeOptions(cat, selectedVal) {
    if (!editGenreAgeContainer || !editRelaisGenreAgeSelect) return;
    const showGenreAge = (cat === "Vêtements" || cat === "Chaussures");

    if (showGenreAge) {
        populateSelectWithOptions(editRelaisGenreAgeSelect, GENDER_AGE_OPTIONS, "-- Pour qui ? --");
        if (selectedVal) editRelaisGenreAgeSelect.value = selectedVal;
        editGenreAgeContainer.style.display = 'block';
        editRelaisGenreAgeSelect.required = true;
    } else {
        editGenreAgeContainer.style.display = 'none';
        editRelaisGenreAgeSelect.required = false;
        editRelaisGenreAgeSelect.innerHTML = '';
    }
}

// Gère la soumission du formulaire d'édition
async function handleEditFormSubmit(event) { /* ... (Copiez la fonction ici, elle utilise uploadToImgur importé) ... */
    event.preventDefault(); if (!currentUser) { alert("Connectez-vous."); return; } const relaisId = editRelaisIdInput.value; const originalImageUrl = editOriginalImageUrlInput.value; if (!relaisId) { alert("Erreur ID relais."); return; } if (editSubmitRelaisButton) editSubmitRelaisButton.disabled = true; if (editSubmitRelaisStatus) editSubmitRelaisStatus.textContent = "Sauvegarde..."; let finalImageUrl = originalImageUrl; if (newImageFileToUpload) { console.log("Uploading new image for edit..."); try { finalImageUrl = await uploadToImgur(newImageFileToUpload); } catch (error) { alert(`Échec upload: ${error.message}`); if (editSubmitRelaisButton) editSubmitRelaisButton.disabled = false; if (editSubmitRelaisStatus) editSubmitRelaisStatus.textContent = "Échec upload img."; return; } } 
    
    try { 
        const titre = editRelaisTitreInput.value.trim(); 
        const description = editRelaisDescriptionTextarea.value.trim(); 
        const prixInput = editRelaisPrixInput.value; 
        const categorie = editRelaisCategorieSelect.value; 
        const sousCategorie = editRelaisSousCategorieSelect.value; 
        const etat = editRelaisEtatSelect.value; 
        const genreAge = editRelaisGenreAgeSelect.value; // <- Récupérer valeur genre/age
        
         if (!titre || !description || !categorie || prixInput === "" || !etat) throw new Error("Remplissez champs (*)."); 
        if (editRelaisSousCategorieSelect.required && !sousCategorie) throw new Error("Choisissez sous-cat."); 
        if (editRelaisGenreAgeSelect.required && !genreAge) throw new Error("Choisissez pour qui est l'article."); // <- Validation
        
        const prix = parseFloat(prixInput); 
        if (isNaN(prix) || prix < 0) throw new Error("Prix invalide."); 
        
        const data = { titre, description, prix, categorie, etat, url_image: finalImageUrl, }; 
        if (sousCategorie && editRelaisSousCategorieSelect.required) {
            data.sous_categorie = sousCategorie;
        } else {
            data.sous_categorie = null; // Ou utiliser deleteField() si vous préférez
        }
        // Gérer genre/age
        if (genreAge && editRelaisGenreAgeSelect.required) {
            data.genreAge = genreAge; // <- Ajout ou MàJ
        } else {
            data.genreAge = null; // Ou deleteField() si non applicable
        }
        
        const ref = doc(db, "annonces", relaisId); 
        await updateDoc(ref, data); console.log("Update OK!"); if (editSubmitRelaisStatus) editSubmitRelaisStatus.textContent = "Enregistré !"; setTimeout(() => { fermerEditModal(); if (document.getElementById('view-profil')?.classList.contains('active')) { import('./profile.js').then(profileModule => profileModule.loadProfileData()); } else if (document.getElementById('view-accueil')?.classList.contains('active')) { import('./relais-display.js').then(displayModule => displayModule.loadRelais()); } }, 1500); } catch (error) { console.error("Err update relais:", error); alert(`Erreur sauvegarde: ${error.message}`); if (editSubmitRelaisButton) editSubmitRelaisButton.disabled = false; if (editSubmitRelaisStatus) editSubmitRelaisStatus.textContent = "Erreur."; }
}


// Ferme la modale d'édition
function fermerEditModal() { /* ... (Copiez la fonction ici) ... */
     if(editModalOverlay) editModalOverlay.style.display = 'none'; newImageFileToUpload = null;
}

// Met en place les listeners pour la modale d'édition
function setupEditModalListeners() { /* ... (Copiez la fonction ici) ... */
    if(editModalCloseButton) editModalCloseButton.addEventListener('click', closeAllModals); if(editModalOverlay) editModalOverlay.addEventListener('click', (e) => { if (e.target === editModalOverlay) fermerEditModal(); }); 
    if(editRelaisForm) editRelaisForm.addEventListener('submit', handleEditFormSubmit); 
    
    if(editRelaisCategorieSelect) {
        editRelaisCategorieSelect.addEventListener('change', () => {
            const selectedCategory = editRelaisCategorieSelect.value;
            // Met à jour les selects dépendants SANS valeur pré-sélectionnée (l'utilisateur doit choisir)
            updateEditSubCategoryOptions(selectedCategory, null);
            updateEditGenreAgeOptions(selectedCategory, null);
        });
    }
    
    
    if (editRelaisImageInput && editNewImagePreview && editNoNewImageText) {
    editRelaisImageInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        newImageFileToUpload = file; // Stocke le fichier pour un upload potentiel

        if (file) {
            // Vérification de la taille
            if (file.size > 10 * 1024 * 1024) { // Limite 10MB
                alert("L'image est trop volumineuse (max 10MB).");
                editRelaisImageInput.value = ""; // Réinitialise l'input file
                newImageFileToUpload = null; // Oublie le fichier
                // Réinitialise l'aperçu
                editNewImagePreview.src = '#';
                editNewImagePreview.style.display = 'none';
                editNoNewImageText.style.display = 'inline';
                return; // Arrête le traitement pour ce fichier
            }

            // Créer le lecteur de fichier pour l'aperçu
            const reader = new FileReader();

            // Définir ce qui se passe quand l'image est lue
            reader.onload = (e) => {
                editNewImagePreview.src = e.target.result;
                editNewImagePreview.style.display = 'block';
                editNoNewImageText.style.display = 'none';
            }; // Fin de onload

            // Lire le fichier pour déclencher onload
            reader.readAsDataURL(file);

        } else {
            // Si aucun fichier n'est sélectionné (ou sélection annulée)
            newImageFileToUpload = null; // Oublie un fichier précédent potentiel
            editNewImagePreview.src = '#';
            editNewImagePreview.style.display = 'none';
            editNoNewImageText.style.display = 'inline';
        }
    }); // Fin de addEventListener
} // Fin de if (vérification existence éléments DOM)

}

// Exporte les fonctions nécessaires
export { setupEditModalListeners, openEditModal };