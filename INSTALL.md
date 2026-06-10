# 🎵 Music Library — Guide d'installation

## Prérequis

- **Node.js** ≥ 18
- **Docker** (pour RabbitMQ)
- **npm** ≥ 9

---

## 1. RabbitMQ via Docker

```bash
docker run -d \
  --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3-management
```

Interface de gestion disponible sur : http://localhost:15672  
(user: `guest` / pass: `guest`)

---

## 2. Backend — server-backend

### Installation des dépendances

```bash
cd server-backend
npm install
```

### Configuration

```bash
cp .env.example .env
```

Éditez `.env` avec vos valeurs :

```env
MUSIC_PATH=/chemin/absolu/vers/vos/musiques
TIME_INTERVAL_UPDATE_CHECKER=5          # en minutes
PORT=3000
RABBITMQ_URL=amqp://localhost
LOG_PATH=public/logs/
FRONTEND_URL=http://localhost:5173
FRONTEND_MUSIC_OUTPUT_PATH=../client-frontend/public/music
FRONTEND_CSV_OUTPUT_PATH=../client-frontend/public/data/music_files_data.csv
```

### Démarrage (développement)

```bash
npm run dev
```

### Build production

```bash
npm run build
npm start
```

---

## 3. Frontend — client-frontend

### Installation des dépendances

```bash
cd client-frontend
npm install
```

### Configuration

```bash
cp .env.example .env
```

Éditez `.env` :

```env
VITE_MUSIC_PATH=/music
VITE_CSV_PATH=/data/music_files_data.csv
VITE_URL_SERVER=http://localhost:3000
```

### Démarrage (développement)

```bash
npm run dev
```

### Build production

```bash
npm run build
npm run preview
```

---

## 4. Ordre de démarrage recommandé

1. `docker start rabbitmq` (ou lancer la commande Docker ci-dessus)
2. `cd server-backend && npm run dev`
3. `cd client-frontend && npm run dev`

---

## 5. Fonctionnement du pipeline

```
[Dossier MUSIC_PATH]
       │  (scan toutes les X minutes)
       ▼
  update-checker  ──RabbitMQ──►  meta-data-extractor
                                        │
                                  RabbitMQ
                                        ▼
                                   sender-api  ──► /public/music/ + CSV
                                        │
                                  RabbitMQ
                                        ▼
                                file-suppressor  ──► supprime les fichiers source
```

### Logs
Les 4 fichiers de logs se trouvent dans `server-backend/public/logs/` :
- `update-checker.log`
- `meta-data-extractor.log`
- `sender-api.log`
- `file-suppressor.log`

---

## 6. Structure des fichiers générés

```
client-frontend/public/
├── music/                  ← fichiers MP3 copiés par le backend
└── data/
    └── music_files_data.csv  ← métadonnées (titre, artiste, album, genre...)
```

---

## Notes

- Les fichiers MP3 source sont **supprimés** après traitement (file-suppressor). Assurez-vous de pointer `MUSIC_PATH` vers un dossier de transit, pas votre collection principale.
- Les playlists sont sauvegardées dans le `localStorage` du navigateur.
- Le téléchargement ZIP se fait côté client avec JSZip.
