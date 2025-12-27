# 🏗️ Architecture du Projet

## Vue d'Ensemble

Virtual World suit une architecture client-serveur classique avec communication temps réel via WebSockets.

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    React     │  │   Phaser 3   │  │  Socket.IO   │      │
│  │   (UI/UX)    │  │  (Gameplay)  │  │   Client     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          │ HTTP/REST        │ WebSocket        │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                         SERVER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Express    │  │  Socket.IO   │  │   Prisma     │      │
│  │  (REST API)  │  │   Server     │  │    (ORM)     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                            │
                            ▼
                  ┌─────────────────┐
                  │   PostgreSQL    │
                  │   (Database)    │
                  └─────────────────┘
```

## 📱 Frontend (Client)

### Technologies
- **React 18**: Framework UI
- **TypeScript**: Typage statique
- **Phaser 3**: Moteur de jeu 2D
- **Socket.IO Client**: Communication temps réel
- **Zustand**: State management
- **React Router**: Navigation
- **Axios**: Requêtes HTTP

### Structure

```
client/src/
├── pages/              # Pages principales de l'app
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   └── LobbyPage.tsx
│
├── components/         # Composants React réutilisables
│   ├── ChatBox.tsx    # Chat en temps réel
│   ├── UserInfo.tsx   # Profil utilisateur
│   └── RoomList.tsx   # Liste des salles
│
├── phaser/            # Configuration et scènes Phaser
│   ├── config.ts      # Configuration du jeu
│   └── scenes/
│       └── LobbyScene.ts  # Scène principale du jeu
│
├── services/          # Couche de services
│   ├── api.ts        # Client API REST
│   └── socket.ts     # Client Socket.IO
│
├── store/            # State management Zustand
│   └── index.ts      # Store global
│
├── types/            # Types TypeScript
│   └── index.ts
│
└── styles/           # CSS global
    └── global.css
```

### Flux de Données

1. **Authentification**:
   ```
   User Input → API Call → JWT Token → Store → Protected Routes
   ```

2. **Temps Réel**:
   ```
   User Action → Socket Emit → Server → Socket Broadcast → All Clients
   ```

3. **État Global**:
   ```
   Zustand Store ← React Components ← User Interactions
                 ↓
           Phaser Scenes
   ```

## 🖥️ Backend (Server)

### Technologies
- **Node.js + Express**: Serveur HTTP
- **TypeScript**: Typage statique
- **Socket.IO**: WebSocket server
- **Prisma**: ORM pour PostgreSQL
- **JWT**: Authentification
- **bcrypt**: Hashing des mots de passe

### Structure

```
server/src/
├── routes/            # Définition des endpoints API
│   ├── auth.routes.ts    # /api/auth/*
│   └── room.routes.ts    # /api/rooms/*
│
├── services/          # Logique métier
│   ├── auth.service.ts   # Gestion utilisateurs
│   └── room.service.ts   # Gestion salles
│
├── socket/            # Gestionnaire WebSocket
│   └── index.ts          # Events Socket.IO
│
├── middleware/        # Middleware Express
│   └── auth.ts           # Vérification JWT
│
├── utils/            # Utilitaires
│   ├── config.ts        # Configuration env
│   └── jwt.ts           # Génération/vérif tokens
│
└── index.ts          # Point d'entrée serveur
```

### Endpoints API

**Auth** (`/api/auth`)
```
POST   /register    - Créer un compte
POST   /login       - Se connecter
GET    /me          - Obtenir profil (protégé)
```

**Rooms** (`/api/rooms`)
```
GET    /            - Liste salles publiques
GET    /my          - Mes salles (protégé)
GET    /:id         - Détails d'une salle
POST   /            - Créer une salle (protégé)
PUT    /:id         - Modifier une salle (protégé)
DELETE /:id         - Supprimer une salle (protégé)
PUT    /:id/furniture - Sauvegarder meubles (protégé)
```

### Événements Socket.IO

**Client → Server**
```
join_room          - Rejoindre une salle
move               - Envoyer position joueur
chat_message       - Envoyer message chat
whisper            - Chuchoter à un joueur
```

**Server → Client**
```
room_joined        - Confirmation + liste joueurs
player_joined      - Nouveau joueur dans la salle
player_left        - Joueur a quitté
player_moved       - Mouvement d'un joueur
chat_message       - Nouveau message chat
whisper_received   - Message privé reçu
error              - Erreur
```

## 🗄️ Base de Données

### Schéma Prisma

```prisma
User {
  id          String   (UUID)
  username    String   (unique)
  email       String   (unique)
  password    String   (hashed)
  coins       Int      (default: 1000)
  gems        Int      (default: 0)
  level       Int      (default: 1)
  experience  Int      (default: 0)
  motto       String
  avatar      Json
  
  ownedRooms  Room[]
  messages    Message[]
}

Room {
  id          String   (UUID)
  name        String
  description String
  ownerId     String   (FK → User)
  isPublic    Boolean
  maxUsers    Int
  password    String?
  layout      String
  furnitures  Json
  wallpaper   String
  floor       String
  
  owner       User
  messages    Message[]
}

Message {
  id          String   (UUID)
  content     String
  userId      String   (FK → User)
  roomId      String   (FK → Room)
  type        String   (chat/whisper/system)
  createdAt   DateTime
  
  user        User
  room        Room
}
```

### Relations

- User **1:N** Room (un utilisateur possède plusieurs salles)
- User **1:N** Message (un utilisateur écrit plusieurs messages)
- Room **1:N** Message (une salle contient plusieurs messages)

## 🔐 Sécurité

### Authentification JWT

1. **Login/Register**:
   ```
   Client → POST /auth/login → Server
          ← JWT Token + User Data ←
   ```

2. **Requêtes Protégées**:
   ```
   Client → GET /api/rooms/my
           (Header: Authorization: Bearer <token>)
          ← Rooms Data ←
   ```

3. **WebSocket Auth**:
   ```
   Socket.connect({ auth: { token } })
   → Server vérifie token
   → Autorise connexion
   ```

### Validation

- **Express-validator**: Validation des inputs API
- **Prisma**: Contraintes DB (unique, foreign keys)
- **Middleware Auth**: Vérification JWT sur routes protégées
- **Socket Middleware**: Auth pour connexions WebSocket

## 🎮 Gameplay Flow

### Cycle de Connexion

```
1. User ouvre l'app
2. Login/Register
3. JWT stocké dans localStorage
4. Socket.IO connect avec token
5. User redirigé vers Lobby
6. Chargement des salles publiques
7. Auto-join première salle
8. Phaser initialise la scène
9. Socket.IO join_room event
10. Réception liste des joueurs
11. Affichage du monde virtuel
```

### Cycle de Mouvement

```
1. User presse flèche directionnelle
2. Phaser détecte input
3. Calcul nouvelle position
4. Validation position (limites)
5. Animation locale (Tween)
6. Socket emit 'move' event
7. Server broadcast à tous
8. Autres clients reçoivent
9. Animation sur autres écrans
```

### Cycle de Chat

```
1. User tape message
2. Validation (longueur, vide)
3. Socket emit 'chat_message'
4. Server sauvegarde en DB
5. Server broadcast à la salle
6. Tous reçoivent message
7. Ajout au state local
8. Affichage dans ChatBox
```

## 📊 État de l'Application

### Client State (Zustand)

```typescript
{
  // Auth
  user: User | null
  token: string | null
  isAuthenticated: boolean
  
  // Room
  currentRoom: Room | null
  players: Record<userId, Player>
  messages: Message[]
  
  // UI
  showChat: boolean
}
```

### Server State (En Mémoire)

```typescript
{
  roomPlayers: {
    [roomId]: {
      [userId]: {
        username: string
        position: { x, y, direction }
        avatar: Avatar
      }
    }
  }
}
```

## 🚀 Performance

### Optimisations Frontend

- **Code splitting**: Routes lazy-loaded
- **Memoization**: React.memo sur composants
- **Virtual scrolling**: Pour grandes listes
- **Debouncing**: Inputs de chat
- **Asset loading**: Phaser preload

### Optimisations Backend

- **Indexation DB**: Sur username, coins, roomId
- **Connection pooling**: Prisma
- **Room-based broadcasting**: Socket.IO rooms
- **Rate limiting**: À implémenter (Phase 2)

## 🔄 Évolutivité Future

### Phase 2 - Features

- **Redis**: Cache + Session store
- **CDN**: Assets statiques
- **Load Balancer**: Plusieurs instances
- **Microservices**: Séparer auth, game, chat

### Phase 3 - Infrastructure

- **Docker**: Containerisation
- **Kubernetes**: Orchestration
- **Monitoring**: Grafana, Prometheus
- **CI/CD**: GitHub Actions

---

Cette architecture permet une extension facile et une maintenance simplifiée tout en gardant les performances optimales pour une expérience utilisateur fluide.
