import { GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from './firebase-config.js'; // Import des instances initialisées

const provider = new GoogleAuthProvider();

// --- Fonction pour se connecter avec Google ---
async function signInWithGoogle() {
  try {
    // Affiche la popup de connexion Google
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    console.log("Connexion Google réussie pour:", user.email);

    // Vérifier et créer le profil utilisateur dans Firestore si c'est la première fois
    await checkAndCreateUserProfile(user);

    return user; // Retourne l'objet utilisateur en cas de succès

  } catch (error) {
    console.error("Erreur lors de la connexion Google:", error.code, error.message);
    // Gérer les erreurs courantes
    if (error.code === 'auth/popup-closed-by-user') {
      console.warn("La popup de connexion a été fermée par l'utilisateur.");
    } else if (error.code === 'auth/cancelled-popup-request') {
        console.warn("Plusieurs popups de connexion ouvertes.");
    } else {
      alert("Une erreur est survenue lors de la connexion. Veuillez réessayer.");
    }
    return null; // Retourne null en cas d'échec
  }
}

// --- Fonction pour créer/vérifier le profil dans Firestore ---
async function checkAndCreateUserProfile(user) {
  // Crée une référence au document utilisateur potentiel dans Firestore
  // Utilise l'UID de l'utilisateur comme ID de document (unique et fiable)
  const userRef = doc(db, "utilisateurs", user.uid);

  try {
    const userSnap = await getDoc(userRef); // Tente de lire le document

    if (!userSnap.exists()) {
      // Le document n'existe pas = première connexion de cet utilisateur
      console.log(`Création du profil pour ${user.email} (UID: ${user.uid})`);
      await setDoc(userRef, {
        uid: user.uid,
        nom: user.displayName || user.email.split('@')[0], // Nom Google ou partie avant @ de l'email
        email: user.email,
        photo_url: user.photoURL || null, // Photo de profil Google (si disponible)
        service: "", // Champ Service à remplir par l'utilisateur plus tard
        createdAt: serverTimestamp() // Date de création du profil
      });
      console.log("Profil utilisateur créé avec succès.");
      // Idée : Peut-être afficher un message de bienvenue ou rediriger vers la page profil pour compléter le service ?

    } else {
      // Le document existe déjà = utilisateur connu
      console.log(`Utilisateur ${user.email} déjà enregistré.`);
      // Optionnel : Mettre à jour certaines informations si elles ont changé sur Google ?
      // Exemple :
      // const userData = userSnap.data();
      // if (userData.nom !== user.displayName || userData.photo_url !== user.photoURL) {
      //    await updateDoc(userRef, { nom: user.displayName, photo_url: user.photoURL });
      //    console.log("Profil utilisateur mis à jour.");
      // }
    }
  } catch (error) {
    console.error("Erreur lors de la vérification/création du profil:", error);
    // Gérer l'erreur (peut-être informer l'utilisateur)
  }
}

// --- Fonction de Déconnexion ---
async function userSignOut() {
  try {
    await signOut(auth);
    console.log("Utilisateur déconnecté avec succès.");
    // La mise à jour de l'UI sera gérée par l'observateur dans app.js
  } catch (error) {
    console.error("Erreur lors de la déconnexion:", error);
    alert("Une erreur est survenue lors de la déconnexion.");
  }
}

// Exporter les fonctions pour les utiliser dans app.js
export { signInWithGoogle, userSignOut };