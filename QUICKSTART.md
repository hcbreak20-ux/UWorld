# 🚀 Guide de Démarrage Rapide

## Installation Rapide (5 minutes)

### 1. Installer PostgreSQL (si pas déjà installé)

**macOS (avec Homebrew)**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows**
Télécharger depuis https://www.postgresql.org/download/windows/

### 2. Créer la base de données

```bash
# Se connecter à PostgreSQL
psql postgres

# Créer la base de données et un utilisateur
CREATE DATABASE virtualworld;
CREATE USER virtualuser WITH PASSWORD 'virtualpass';
GRANT ALL PRIVILEGES ON DATABASE virtualworld TO virtualuser;
\q
```

### 3. Installer les dépendances

```bash
# Backend
cd server
npm install

# Frontend (dans un nouveau terminal)
cd client
npm install
```

### 4. Configuration

**Backend (.env)**
```bash
cd server
cp .env.example .env
```

Éditer `server/.env`:
```env
DATABASE_URL="postgresql://virtualuser:virtualpass@localhost:5432/virtualworld?schema=public"
JWT_SECRET="changez-ceci-par-une-vraie-cle-secrete-aleatoire"
PORT=3001
```

**Frontend (.env)**
```bash
cd client
cp .env.example .env
# Les valeurs par défaut sont OK pour le développement
```

### 5. Initialiser la base de données

```bash
cd server
npx prisma generate
npx prisma migrate dev --name init
```

### 6. Lancer l'application

**Terminal 1 - Backend**
```bash
cd server
npm run dev
```

Vous devriez voir:
```
🚀 Serveur démarré sur le port 3001
📡 Socket.IO prêt pour les connexions en temps réel
```

**Terminal 2 - Frontend**
```bash
cd client
npm run dev
```

Vous devriez voir:
```
  VITE v5.0.11  ready in XXX ms

  ➜  Local:   http://localhost:3000/
```

### 7. Tester l'application

1. Ouvrir http://localhost:3000
2. Cliquer sur "S'inscrire"
3. Créer un compte
4. Vous serez automatiquement connecté au lobby!

## Tester avec plusieurs utilisateurs

1. Ouvrir l'application dans plusieurs onglets/fenêtres
2. Créer différents comptes
3. Rejoindre la même salle
4. Vous verrez les autres joueurs bouger en temps réel!

## Commandes de Test Rapides

### Créer un utilisateur test via Prisma Studio
```bash
cd server
npx prisma studio
```
Ouvrir http://localhost:5555 et créer des utilisateurs manuellement

### Voir les logs en temps réel
```bash
# Backend avec logs détaillés
cd server
npm run dev

# Frontend avec logs Vite
cd client
npm run dev
```

### Reset complet (si problèmes)
```bash
cd server
npx prisma migrate reset
npx prisma generate
npx prisma migrate dev
```

## Problèmes Fréquents

### "Port 3001 already in use"
```bash
lsof -i :3001
kill -9 <PID>
```

### "Connection refused" (PostgreSQL)
```bash
# Vérifier que PostgreSQL tourne
brew services list  # macOS
sudo systemctl status postgresql  # Linux

# Redémarrer si nécessaire
brew services restart postgresql@14  # macOS
sudo systemctl restart postgresql  # Linux
```

### "Prisma Client not generated"
```bash
cd server
npx prisma generate
```

### Le jeu Phaser n'apparaît pas
- Ouvrir la console du navigateur (F12)
- Vérifier qu'il n'y a pas d'erreurs
- Vérifier que le backend est bien lancé

## Prochaines Étapes

Une fois que tout fonctionne:

1. **Tester le chat** - Envoyer des messages
2. **Tester les mouvements** - Utiliser les flèches directionnelles
3. **Créer une nouvelle salle** - Via l'API (à venir dans l'interface)
4. **Explorer le code** - Commencer à personnaliser!

## Ressources Utiles

- **Prisma Studio**: `npx prisma studio` pour voir la BDD graphiquement
- **API Docs**: Les endpoints sont dans `server/src/routes/`
- **Socket Events**: Voir `server/src/socket/index.ts`
- **Phaser Scenes**: Dans `client/src/phaser/scenes/`

Bon développement! 🎮
