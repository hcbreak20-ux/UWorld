# 🏨 Uworld- Jeu Social 

Un monde virtuel social avec chat en temps réel, système de salles, avatars personnalisables et économie virtuelle compétitive.

## 🎯 Fonctionnalités (MVP)

### ✅ Implémenté
- **Authentification complète** : Inscription, connexion, JWT
- **Système de salles** : Création, liste publique, navigation
- **Chat en temps réel** : Messages instantanés via Socket.IO
- **Mouvement isométrique** : Déplacement des joueurs avec flèches directionnelles
- **Multi-joueurs** : Voir les autres joueurs en temps réel
- **Économie de base** : Système de pièces et gemmes
- **Progression** : Niveaux et expérience

### 🚧 À venir (Phase 2+)
- Avatars visuels personnalisables
- Meubles et décoration de salles
- Mini-jeux pour gagner des pièces
- Système de classement (leaderboard)
- Boutique d'items
- Échanges entre joueurs

## 🛠️ Stack Technique

### Backend
- **Node.js** + **Express** : Serveur API REST
- **Socket.IO** : Communication temps réel
- **PostgreSQL** + **Prisma** : Base de données
- **JWT** : Authentification sécurisée
- **TypeScript** : Typage strict

### Frontend
- **React 18** : Interface utilisateur
- **Phaser 3** : Moteur de jeu 2D
- **Socket.IO Client** : Communication temps réel
- **Zustand** : Gestion d'état
- **Vite** : Build tool rapide
- **TypeScript** : Typage strict

## 📦 Installation

### Prérequis
- Node.js 18+
- PostgreSQL 14+
- npm ou yarn

### 1. Clone le projet
```bash
cd virtual-world
```

### 2. Configuration Backend

```bash
cd server
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Éditer .env et configurer PostgreSQL
# DATABASE_URL="postgresql://username:password@localhost:5432/virtualworld"
# JWT_SECRET="votre-clé-secrète-forte"

# Générer le client Prisma et créer la base de données
npx prisma generate
npx prisma migrate dev --name init
```

### 3. Configuration Frontend

```bash
cd ../client
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Les valeurs par défaut sont déjà correctes pour le développement local
```

## 🚀 Lancement

### Terminal 1 - Backend
```bash
cd server
npm run dev
```
Le serveur démarre sur **http://localhost:3001**

### Terminal 2 - Frontend
```bash
cd client
npm run dev
```
L'application démarre sur **http://localhost:3000**

## 🎮 Utilisation

1. **Inscription** : Créez un compte avec username, email et mot de passe
2. **Connexion** : Vous recevrez 1000 pièces de départ
3. **Navigation** : Utilisez les flèches directionnelles pour vous déplacer
4. **Chat** : Tapez des messages pour communiquer avec les autres joueurs
5. **Salles** : Cliquez sur "📋 Salles" pour voir et rejoindre d'autres salles

## 📁 Structure du Projet

```
virtual-world/
├── server/                 # Backend Node.js
│   ├── src/
│   │   ├── routes/        # Endpoints API
│   │   ├── services/      # Logique métier
│   │   ├── socket/        # Gestionnaire Socket.IO
│   │   ├── middleware/    # Auth, validation
│   │   └── utils/         # Utilitaires
│   ├── prisma/
│   │   └── schema.prisma  # Schéma de base de données
│   └── package.json
│
├── client/                # Frontend React
│   ├── src/
│   │   ├── pages/         # Pages React
│   │   ├── components/    # Composants réutilisables
│   │   ├── phaser/        # Scènes Phaser
│   │   ├── services/      # API & Socket
│   │   ├── store/         # State management
│   │   └── types/         # Types TypeScript
│   └── package.json
│
└── README.md
```

## 🔧 Commandes Utiles

### Backend
```bash
npm run dev          # Mode développement avec hot reload
npm run build        # Compiler TypeScript
npm start            # Lancer en production
npx prisma studio    # Interface graphique base de données
```

### Frontend
```bash
npm run dev          # Mode développement
npm run build        # Build production
npm run preview      # Prévisualiser le build
```

## 🗄️ Modèle de Données

### User (Utilisateur)
- Identifiants (username, email, password)
- Ressources (coins, gems, level, experience)
- Personnalisation (motto, avatar)

### Room (Salle)
- Informations (name, description, owner)
- Configuration (isPublic, maxUsers, password)
- Décoration (layout, furnitures, wallpaper, floor)

### Message (Chat)
- Contenu et type
- Relations avec User et Room

## 🎨 Prochaines Étapes

### Phase 2 - Personnalisation (2-3 semaines)
- [ ] Éditeur d'avatar visuel
- [ ] Catalogue de meubles
- [ ] Éditeur de salle en mode construction
- [ ] Système d'inventaire

### Phase 3 - Économie (2-3 semaines)
- [ ] Mini-jeux (dés, quiz, course)
- [ ] Leaderboard des plus riches
- [ ] Boutique d'items premium
- [ ] Système de trading

### Phase 4 - Social (2-3 semaines)
- [ ] Système d'amis
- [ ] Messages privés
- [ ] Badges et réalisations
- [ ] Groupes/guildes

## 🐛 Debugging

### Problèmes courants

**Port déjà utilisé**
```bash
# Trouver et arrêter le processus
lsof -i :3001  # Backend
lsof -i :3000  # Frontend
kill -9 <PID>
```

**Base de données**
```bash
# Reset complet
npx prisma migrate reset
npx prisma generate
npx prisma migrate dev
```

**Socket.IO ne connecte pas**
- Vérifier que le backend tourne sur le bon port
- Vérifier le fichier .env du client
- Regarder la console du navigateur pour les erreurs

## 📝 License

Projet personnel - Libre d'utilisation

## 👤 Auteur

Chris - Projet de jeu social communautaire

---

**Note** : Ce projet est en développement actif. Les features sont ajoutées progressivement selon la roadmap
