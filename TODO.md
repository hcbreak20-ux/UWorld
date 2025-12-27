# 📋 Roadmap & TODO List

## ✅ Phase 1 - MVP (TERMINÉ)

- [x] Authentification (register, login, JWT)
- [x] Système de salles basique
- [x] Chat en temps réel
- [x] Mouvement des joueurs
- [x] Multi-joueurs temps réel
- [x] Base de données PostgreSQL + Prisma
- [x] Interface React avec Phaser

---

## 🚧 Phase 2 - Personnalisation & UI (2-3 semaines)

### Avatars
- [ ] Créer sprites pour différentes parties du corps
- [ ] Système de couleurs pour peau/cheveux/vêtements
- [ ] Éditeur d'avatar visuel
- [ ] Sauvegarder les choix d'avatar en JSON
- [ ] Afficher avatars personnalisés dans le jeu

**Fichiers à créer/modifier:**
- `client/src/components/AvatarEditor.tsx`
- `client/src/assets/sprites/avatar/` (dossier)
- `server/src/routes/avatar.routes.ts`
- Mettre à jour le modèle User pour avatar JSON plus détaillé

### Système d'Inventaire
- [ ] Modèle de données pour items/meubles
- [ ] API CRUD pour inventaire
- [ ] Composant Inventory React
- [ ] Système d'achat/vente
- [ ] Donner items de départ aux nouveaux joueurs

**Fichiers à créer:**
- `prisma/schema.prisma` - Ajouter FurnitureItem, UserInventory
- `server/src/services/inventory.service.ts`
- `server/src/routes/inventory.routes.ts`
- `client/src/components/Inventory.tsx`
- `client/src/components/Shop.tsx`

### Édition de Salles
- [ ] Mode "construction" pour placer des meubles
- [ ] Drag & drop des items
- [ ] Rotation des objets
- [ ] Sauvegarde des positions
- [ ] Catalogue de meubles visuels

**Fichiers à créer:**
- `client/src/phaser/scenes/RoomEditorScene.ts`
- `client/src/components/FurnitureCatalog.tsx`
- `client/src/components/RoomSettings.tsx`

### Améliorations UI
- [ ] Animations de transition
- [ ] Son et musique de fond
- [ ] Effets visuels (particules)
- [ ] Tooltips informatifs
- [ ] Notifications toast

**Fichiers à créer:**
- `client/src/components/Notification.tsx`
- `client/src/services/sound.ts`
- `client/src/assets/sounds/` (dossier)

---

## 💰 Phase 3 - Économie & Mini-Jeux (2-3 semaines)

### Mini-Jeux
- [ ] **Jeu de Dés**: Parier des pièces
- [ ] **Quiz**: Questions/réponses pour gagner
- [ ] **Course**: Parcours contre d'autres joueurs
- [ ] **Machine à Sous**: Style casino
- [ ] **Pierre-Papier-Ciseaux**: Contre d'autres joueurs

**Fichiers à créer:**
- `client/src/phaser/scenes/DiceGameScene.ts`
- `client/src/phaser/scenes/QuizGameScene.ts`
- `client/src/phaser/scenes/RaceGameScene.ts`
- `server/src/services/game.service.ts`
- Endpoints pour gérer les paris et gains

### Système de Classement
- [ ] Leaderboard des plus riches
- [ ] Classement par niveau
- [ ] Classement par mini-jeux
- [ ] Récompenses hebdomadaires
- [ ] Badges et titres

**Fichiers à créer:**
- `client/src/components/Leaderboard.tsx`
- `server/src/routes/leaderboard.routes.ts`
- `server/src/services/leaderboard.service.ts`

### Boutique Premium
- [ ] Items exclusifs contre gemmes
- [ ] Packs de démarrage
- [ ] Abonnement VIP (optionnel)
- [ ] Système de codes promo
- [ ] Historique d'achats

**Fichiers à créer:**
- `client/src/components/PremiumShop.tsx`
- `server/src/services/shop.service.ts`
- `server/src/routes/shop.routes.ts`

### Trading Entre Joueurs
- [ ] Système d'échange d'items
- [ ] Interface de trade
- [ ] Validation des deux côtés
- [ ] Historique des échanges
- [ ] Protection contre les arnaques

**Fichiers à créer:**
- `client/src/components/TradeWindow.tsx`
- `server/src/socket/trade.ts`
- `server/src/services/trade.service.ts`

---

## 👥 Phase 4 - Social & Communauté (2-3 semaines)

### Système d'Amis
- [ ] Envoyer/accepter demandes d'ami
- [ ] Liste d'amis
- [ ] Statut en ligne/hors ligne
- [ ] Téléportation vers amis
- [ ] Bloquer des utilisateurs

**Fichiers à créer:**
- `server/src/services/friend.service.ts`
- `server/src/routes/friend.routes.ts`
- `client/src/components/FriendsList.tsx`
- Ajouter modèle Friendship au schema Prisma

### Messages Privés
- [ ] Chat privé 1-to-1
- [ ] Historique des conversations
- [ ] Notifications de nouveaux messages
- [ ] Émojis et stickers
- [ ] Partage d'images (optionnel)

**Fichiers à créer:**
- `client/src/components/PrivateChat.tsx`
- `server/src/socket/privateMessages.ts`
- Modèle PrivateMessage dans Prisma

### Groupes/Guildes
- [ ] Créer des groupes
- [ ] Système de rôles (owner, admin, member)
- [ ] Chat de groupe
- [ ] Salles de groupe privées
- [ ] Banque de groupe

**Fichiers à créer:**
- `server/src/services/guild.service.ts`
- `server/src/routes/guild.routes.ts`
- `client/src/components/GuildPanel.tsx`
- Modèles Guild, GuildMember dans Prisma

### Badges & Achievements
- [ ] Système d'achievements
- [ ] Badges visuels sur profil
- [ ] Récompenses pour achievements
- [ ] Partage sur profil
- [ ] Achievements secrets

**Fichiers à créer:**
- `server/src/services/achievement.service.ts`
- `client/src/components/Achievements.tsx`
- Modèle Achievement dans Prisma

---

## 🚀 Phase 5 - Performance & Scale (3-4 semaines)

### Backend Optimization
- [ ] Implémenter Redis pour cache
- [ ] Session management avec Redis
- [ ] Rate limiting sur API
- [ ] Optimisation des requêtes Prisma
- [ ] Pagination pour toutes les listes

**Fichiers à créer:**
- `server/src/utils/redis.ts`
- `server/src/middleware/rateLimit.ts`
- `server/src/middleware/cache.ts`

### Frontend Optimization
- [ ] Code splitting par route
- [ ] Lazy loading des composants
- [ ] Image optimization
- [ ] PWA (Progressive Web App)
- [ ] Service Worker pour offline

**Fichiers à modifier:**
- `client/vite.config.ts` - Optimisations build
- Ajouter `manifest.json` pour PWA
- Créer Service Worker

### Monitoring & Analytics
- [ ] Logging centralisé (Winston)
- [ ] Error tracking (Sentry)
- [ ] Analytics utilisateurs
- [ ] Performance monitoring
- [ ] Alertes automatiques

**Packages à installer:**
- winston, sentry, analytics tools

### Infrastructure
- [ ] Docker configuration
- [ ] Docker Compose pour dev
- [ ] CI/CD avec GitHub Actions
- [ ] Tests unitaires (Jest)
- [ ] Tests e2e (Playwright)

**Fichiers à créer:**
- `Dockerfile` (backend et frontend)
- `docker-compose.yml`
- `.github/workflows/ci.yml`
- Tests dans `server/tests/` et `client/tests/`

---

## 🎨 Phase 6 - Polish & Features Avancées

### Graphismes Améliorés
- [ ] Sprites isométriques professionnels
- [ ] Animations fluides
- [ ] Effets de lumière
- [ ] Météo dynamique dans les salles
- [ ] Transitions visuelles

### Systèmes Avancés
- [ ] Pets/Animaux de compagnie
- [ ] Crafting system
- [ ] Jardin personnel
- [ ] Quêtes quotidiennes
- [ ] Événements saisonniers

### Admin Panel
- [ ] Dashboard administrateur
- [ ] Modération du chat
- [ ] Ban/mute utilisateurs
- [ ] Statistiques en temps réel
- [ ] Gestion du contenu

**Fichiers à créer:**
- `client/src/pages/AdminDashboard.tsx`
- `server/src/routes/admin.routes.ts`
- `server/src/middleware/adminAuth.ts`

---

## 🐛 Bugs Connus & Améliorations Mineures

### À Corriger
- [ ] Validation plus stricte des inputs
- [ ] Gestion des déconnexions Socket.IO
- [ ] Nettoyage des joueurs inactifs
- [ ] Messages d'erreur plus clairs
- [ ] Responsive design pour mobile

### Améliorations UX
- [ ] Aide contextuelle (tutorials)
- [ ] Raccourcis clavier
- [ ] Personnalisation des contrôles
- [ ] Accessibilité (ARIA labels)
- [ ] Support multi-langues

---

## 📚 Documentation

### À Écrire
- [ ] API Documentation (Swagger/OpenAPI)
- [ ] Guide contributeur
- [ ] Guide de déploiement
- [ ] Changelog détaillé
- [ ] FAQ utilisateurs

---

## 🎯 Priorités Recommandées

**Court terme (1-2 semaines):**
1. Avatars personnalisables
2. Inventaire basique
3. Un mini-jeu (dés ou quiz)

**Moyen terme (1 mois):**
1. Système d'amis
2. Messages privés
3. Leaderboard

**Long terme (2-3 mois):**
1. Groupes/guildes
2. Trading
3. Admin panel

---

## 💡 Idées Futures

- Système de quêtes narratives
- Intégration Discord
- Application mobile native
- Système de streaming (regarder d'autres joueurs)
- Tournois officiels
- Marketplace externe
- API publique pour extensions

---

**Note**: Cette roadmap est flexible. Priorise selon les besoins de ta communauté!
