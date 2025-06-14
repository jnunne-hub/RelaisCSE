// Importations nécessaires depuis le SDK Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"; // Adaptez la version si besoin
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// Si vous utilisez Storage plus tard : import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Votre configuration Firebase personnelle (NE PAS PARTAGER LA CLÉ BRUTE PUBLIQUEMENT)
const firebaseConfig = {
  apiKey: "AIzaSyCAyHUsKhQ9HdUQkizEKEsn37rOUmHuqrk", // VOTRE CLÉ API (gardez-la secrète idéalement via variables d'env. pour projet pro)
  authDomain: "vinted-entreprise.firebaseapp.com",
  projectId: "vinted-entreprise",
  storageBucket: "vinted-entreprise.appspot.com", // Vérifiez ce nom dans votre console Firebase (généralement sans firebase)
  messagingSenderId: "301194568056",
  appId: "1:301194568056:web:ef6da7eb1c0795e2eae88d",
  measurementId: "G-EEGS88XHHB" // Optionnel pour Analytics
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Obtenir les instances des services Firebase dont vous avez besoin
const auth = getAuth(app);
const db = getFirestore(app);
// const storage = getStorage(app); // Si vous utilisez Firebase Storage

// Exporter les instances pour les utiliser dans d'autres modules
export { app, auth, db }; // Ajoutez storage ici si vous l'utilisez