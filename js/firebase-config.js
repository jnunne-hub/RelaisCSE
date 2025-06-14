// Importations nécessaires depuis le SDK Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"; // Adaptez la version si besoin
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// Si vous utilisez Storage plus tard : import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Configuration Firebase chargée depuis un fichier non versionné
import { firebaseConfig } from '../config/firebase-config.js';

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Obtenir les instances des services Firebase dont vous avez besoin
const auth = getAuth(app);
const db = getFirestore(app);
// const storage = getStorage(app); // Si vous utilisez Firebase Storage

// Exporter les instances pour les utiliser dans d'autres modules
export { app, auth, db }; // Ajoutez storage ici si vous l'utilisez
