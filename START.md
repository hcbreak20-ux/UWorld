# 🎮 DÉMARRAGE RAPIDE - Virtual World

## Installation Automatique (Recommandé)

### macOS / Linux
```bash
chmod +x setup.sh
./setup.sh
```

### Windows (PowerShell)
```powershell
.\setup.ps1
```

---

## Installation Manuelle

### 1. Base de Données PostgreSQL

**Créer la base:**
```bash
psql postgres
```

```sql
CREATE DATABASE virtualworld;
CREATE USER virtualuser WITH PASSWORD 'virtualpass';
GRANT ALL PRIVILEGES ON DATABASE virtualworld TO virtualuser;
\q
```

### 2. Backend

```bash
cd server
npm install
cp .env.example .env

# Éditer .env avec tes informations PostgreSQL
# DATABASE_URL="postgresql://virtualuser:virtualpass@localhost:5432/virtualworld"

npx prisma generate
npx prisma migrate dev --name init
```

### 3. Frontend

```bash
cd client
npm install
cp .env.example .env
```

---

## Lancement

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

**Ouvrir:** http://localhost:3000

---

## Commandes Utiles

### Backend
```bash
npm run dev              # Développement avec hot-reload
npm run build            # Build production
npm start                # Lancer en production
npx prisma studio        # Interface graphique DB (http://localhost:5555)
npx prisma migrate reset # Reset DB
```

### Frontend
```bash
npm run dev      # Développement
npm run build    # Build production
npm run preview  # Prévisualiser build
```

### Base de Données
```bash
# Voir les données
npx prisma studio

# Créer une migration
npx prisma migrate dev --name nom_migration

# Reset complet
npx prisma migrate reset
```

---

## Premiers Pas

1. **Créer un compte** sur http://localhost:3000
2. **Se connecter** avec ton username/password
3. **Explorer le lobby** avec les flèches directionnelles
4. **Envoyer un message** dans le chat
5. **Créer plusieurs comptes** dans différents onglets pour tester le multi-joueur!

---

## Documentation

- **README.md** - Vue d'ensemble complète
- **QUICKSTART.md** - Guide détaillé d'installation
- **ARCHITECTURE.md** - Architecture technique
- **EXAMPLES.md** - Exemples de code pour étendre
- **TODO.md** - Roadmap et features à venir

---

## Dépannage Rapide

**"Port already in use"**
```bash
# Backend (3001)
lsof -i :3001 && kill -9 <PID>

# Frontend (3000)
lsof -i :3000 && kill -9 <PID>
```

**"Cannot connect to database"**
```bash
# Vérifier que PostgreSQL tourne
brew services list                    # macOS
sudo systemctl status postgresql      # Linux
```

**"Prisma Client not generated"**
```bash
cd server
npx prisma generate
```

---

## Support & Contribution

- Issues: Créer un issue sur GitHub
- Contributions: Fork, branch, pull request!
- Questions: Consulter ARCHITECTURE.md et EXAMPLES.md

**Bon développement! 🚀**
