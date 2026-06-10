Partie server-backend:
Configuration (variables d'environnement):
- music_path (absolute path)
- TIME_INTERVAL_UPDATE_CHECKER (en minutes)
- log files path (public/logs/)

Features - 4 programmes principaux:
- 1: update-checker: à intervalle de temps régulier (à commencer au démarrage du serveur), vérifie s'il y a de nouveaux fichiers mp3 (uniquement) dans le répertoire de musique
- 2: meta-data extractor: à la suite de update-checker, il rassemble les méta-données **disponibles** (titre, artiste, album, etc..) de chaque fichier mp3 concernés
- 3: sender-api: après meta-data extractor, envoie une requête api contenant les fichiers du répertoire de musiques et leurs méta-données à destination du frontend (vers /public/music par exemple)
- 4: file-suppressor: après sender-api, supprime les fichiers traités depuis le répertoire de musique

Il faudra 4 fichiers logs correspondants aux 4 programmes qui enregistreront, avec timestamps, un par un les fichiers mp3 traités et la progesssion du traitement (début - en cours - terminé / échec + raison_échec).

Pour des soucis de gestion, on utilise rabbitmq (installé en docker) et sa librairie amqplib pour transitionner l'execution des programmes ci-dessus 1 -> 2 -> 3 -> 4


Partie client-frontend:
Configurations (variables d'environnement):
- music_path (relative path: /public/music)
- fichier csv (relative path: /public/data/music_files_data.csv): enregistre les méta-données des fichiers mp3 envoyées par le backend (faire attention aux doublons)
- URL_SERVER: lien vers l'api du serveur backend

Features:
- Onglets: Tous | Saved playlists | Generate playlists
- lecteur de musique, ceux se trouvant depuis un répertoire du frontend (music_path) avec affichage des méta-données titre, artiste, album et genre s'il y en a (depuis le fichier csv)
- générateur de playlists selons des critères avec/sans sur les chansons (artiste(s), genre, langue(s), année, durée totale en minutes, etc..)
- les playlists générées doivent être modifiables en ajoutant, supprimant, ou remplaçant des musiques (même si les critères de génération de la playlist ne sont plus respectées) et enregistrables (avec renommation)
- download une (liste) musique(s)/playlist(s) au format zip