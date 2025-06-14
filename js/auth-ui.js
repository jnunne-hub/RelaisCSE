import { signInWithGoogle, userSignOut } from './auth.js'; // Importe les fonctions d'action

// Références DOM spécifiques à l'authentification dans le header
const authContainer = document.getElementById('auth-container');

// Met à jour l'UI du header pour un utilisateur connecté
function updateUIForLoggedInUser(user) {
    if (!authContainer || !user) return; // Sécurité
    authContainer.innerHTML = ''; // Vide le contenu actuel

    const profileInfo = document.createElement('div');
    profileInfo.className = 'user-info';
    if (user.photoURL) {
        const profilePic = document.createElement('img');
        profilePic.src = user.photoURL; profilePic.alt = "Profil";
        profileInfo.appendChild(profilePic);
    }
    const userName = document.createElement('span');
    userName.textContent = `Bonjour, ${user.displayName || user.email.split('@')[0]}`;
    profileInfo.appendChild(userName);

    const logoutButton = document.createElement('button');
    logoutButton.id = 'signout-button'; logoutButton.textContent = 'Déconnexion'; logoutButton.className = 'btn';
    logoutButton.addEventListener('click', userSignOut); // Appel de la fonction importée

    authContainer.appendChild(profileInfo); authContainer.appendChild(logoutButton);
}

// Met à jour l'UI du header pour un utilisateur déconnecté
function updateUIForLoggedOutUser() {
    if (!authContainer) return;
    authContainer.innerHTML = `<button id="google-signin-button-header" class="btn btn-primary">Connexion avec Google</button>`;
    const googleSignInButton = document.getElementById('google-signin-button-header');
    if (googleSignInButton) {
        googleSignInButton.addEventListener('click', signInWithGoogle); // Appel de la fonction importée
    }
}

// Attache l'écouteur initial (utile si l'utilisateur n'est pas connecté au chargement initial)
function setupInitialAuthButton() {
    const initialGoogleButton = document.querySelector('#google-signin-button-login, #google-signin-button-header');
     // Attache seulement s'il existe ET si currentUser (importé depuis app.js ou passé en arg) est null.
     // Pour simplifier, on suppose ici que app.js gérera cet état initial.
     // OU on pourrait juste s'assurer que updateUIForLoggedOutUser le refait toujours.
     if (initialGoogleButton) {
         // Vérifier si un listener existe déjà pour éviter doublons ?
         // Ou simplement s'assurer que updateUIForLoggedOutUser recrée et rattache toujours.
         initialGoogleButton.addEventListener('click', signInWithGoogle);
     }
}
// Affiche l'écran de connexion et masque le reste du site
function showLoginScreen(message = "") {
    console.log("APPEL showLoginScreen");
    document.getElementById('loginScreen').style.display = 'flex';
    document.querySelector('main').style.display = 'none';
    document.querySelector('header').style.display = 'none';
    const err = document.getElementById('login-error');
    if (err) {
        err.style.display = message ? 'block' : 'none';
        err.textContent = message || '';
    }
}

// Affiche le site après connexion et masque l'écran de connexion
function showAppScreen(user) {
    console.log("APPEL showAppScreen");
    document.getElementById('loginScreen').style.display = 'none';
    document.querySelector('main').style.display = '';
    document.querySelector('header').style.display = '';
    document.querySelector('footer').style.display = '';
    // Optionnel : log de bienvenue
    if(user) console.log("Bienvenue", user.email || user.displayName);
}

export { updateUIForLoggedInUser, updateUIForLoggedOutUser, setupInitialAuthButton, showLoginScreen, showAppScreen };
