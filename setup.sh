#!/bin/bash

echo "🏨 Virtual World - Setup Automatique"
echo "===================================="
echo ""

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier Node.js
echo "Vérification de Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js n'est pas installé${NC}"
    echo "Installer Node.js depuis https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# Vérifier PostgreSQL
echo "Vérification de PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}⚠️  PostgreSQL n'est pas trouvé dans le PATH${NC}"
    echo "Assurez-vous que PostgreSQL est installé et en cours d'exécution"
    read -p "Continuer quand même? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✓ PostgreSQL trouvé${NC}"
fi

echo ""
echo "📦 Installation des dépendances..."
echo ""

# Backend
echo "Backend..."
cd server
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erreur lors de l'installation des dépendances backend${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Backend installé${NC}"

# Frontend
echo "Frontend..."
cd ../client
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erreur lors de l'installation des dépendances frontend${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Frontend installé${NC}"

cd ..

echo ""
echo "⚙️  Configuration..."
echo ""

# Créer .env pour le serveur si nécessaire
if [ ! -f "server/.env" ]; then
    echo "Création du fichier .env du serveur..."
    cp server/.env.example server/.env
    echo -e "${YELLOW}⚠️  N'oubliez pas d'éditer server/.env avec vos informations PostgreSQL!${NC}"
else
    echo -e "${GREEN}✓ server/.env existe déjà${NC}"
fi

# Créer .env pour le client si nécessaire
if [ ! -f "client/.env" ]; then
    echo "Création du fichier .env du client..."
    cp client/.env.example client/.env
    echo -e "${GREEN}✓ client/.env créé${NC}"
else
    echo -e "${GREEN}✓ client/.env existe déjà${NC}"
fi

echo ""
echo "🗄️  Configuration de la base de données..."
echo ""

read -p "Voulez-vous initialiser la base de données maintenant? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd server
    echo "Génération du client Prisma..."
    npx prisma generate
    
    echo ""
    echo "Création de la migration..."
    npx prisma migrate dev --name init
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Base de données initialisée avec succès!${NC}"
    else
        echo -e "${RED}❌ Erreur lors de l'initialisation de la base de données${NC}"
        echo "Vérifiez votre configuration PostgreSQL dans server/.env"
    fi
    cd ..
fi

echo ""
echo "============================================"
echo -e "${GREEN}✅ Installation terminée!${NC}"
echo "============================================"
echo ""
echo "Pour lancer l'application:"
echo ""
echo "Terminal 1 (Backend):"
echo "  cd server"
echo "  npm run dev"
echo ""
echo "Terminal 2 (Frontend):"
echo "  cd client"
echo "  npm run dev"
echo ""
echo "Puis ouvrir http://localhost:3000"
echo ""
echo "Documentation complète: README.md"
echo "Guide de démarrage rapide: QUICKSTART.md"
echo ""
