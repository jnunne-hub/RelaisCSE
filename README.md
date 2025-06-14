# RelaisCSE

RelaisCSE est une application web qui facilite l'échange d'objets de seconde main entre salariés.
Le projet repose sur des modules JavaScript et Firebase pour l'authentification et la gestion des données.

## Lancer le projet en local

1. Copiez `config/firebase-config.example.js` vers `config/firebase-config.js` puis complétez-le avec vos identifiants Firebase.
2. Assurez-vous que `config/firebase-config.js` est exclu du dépôt (voir `.gitignore`).
3. Démarrez un petit serveur local dans le répertoire, par exemple :
   ```bash
   python -m http.server
   ```
4. Ouvrez votre navigateur à l'adresse indiquée (habituellement `http://localhost:8000`).

## Fonctionnalités principales

- Authentification avec Google
- Publication d'annonces de relais
- Messagerie interne et gestion des favoris

N'hésitez pas à améliorer le code ou l'interface selon vos besoins.

