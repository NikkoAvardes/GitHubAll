# Carnet de ronde PM

Application web légère pour consigner les passages et observations effectués par la Police Municipale de Vallauris et de Golfe-Juan.

## Fonctionnalités

- suivi des adresses et secteurs à surveiller à Vallauris et Golfe-Juan ;
- ajout de plusieurs passages pour une même adresse, avec heure et description ;
- compteur de passages et progression de la journée ;
- sauvegarde automatique des données dans le navigateur ;
- synchronisation en ligne lorsqu’un compte et le service de stockage sont disponibles ;
- génération et copie rapide du compte rendu quotidien ;
- réinitialisation des notes pour commencer une nouvelle journée ;
- interface adaptée aux téléphones et aux ordinateurs, avec prise en charge du thème clair ou sombre.

## Utilisation

Ouvrir [`index.html`](index.html) dans un navigateur. Pour chaque adresse, cliquer sur **+ Note**, renseigner l’heure et ajouter une observation. Le bouton **Copier le compte rendu** génère un texte prêt à être transmis.

Les données sont associées à la date du jour et sont conservées automatiquement sur l’appareil. Elles sont réinitialisées lorsque la date change ou lorsque l’utilisateur choisit **Nouvelle journée**.

## Structure

Le projet est volontairement compact : toute l’application, son style et sa logique sont regroupés dans [`index.html`](index.html). Aucune installation ni dépendance externe n’est nécessaire pour l’utilisation locale.
