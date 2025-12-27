Write-Host "🏨 Virtual World - Setup Automatique" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier Node.js
Write-Host "Vérification de Node.js..." -ForegroundColor Yellow
$nodeVersion = node -v 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Node.js n'est pas installé" -ForegroundColor Red
    Write-Host "Installer Node.js depuis https://nodejs.org/"
    exit 1
}
Write-Host "✓ Node.js $nodeVersion" -ForegroundColor Green

# Vérifier PostgreSQL
Write-Host "Vérification de PostgreSQL..." -ForegroundColor Yellow
$psqlVersion = psql --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  PostgreSQL n'est pas trouvé dans le PATH" -ForegroundColor Yellow
    Write-Host "Assurez-vous que PostgreSQL est installé et en cours d'exécution"
    $response = Read-Host "Continuer quand même? (y/n)"
    if ($response -ne "y" -and $response -ne "Y") {
        exit 1
    }
} else {
    Write-Host "✓ PostgreSQL trouvé" -ForegroundColor Green
}

Write-Host ""
Write-Host "📦 Installation des dépendances..." -ForegroundColor Yellow
Write-Host ""

# Backend
Write-Host "Backend..." -ForegroundColor Yellow
Set-Location server
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de l'installation des dépendances backend" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Backend installé" -ForegroundColor Green

# Frontend
Write-Host "Frontend..." -ForegroundColor Yellow
Set-Location ../client
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de l'installation des dépendances frontend" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Frontend installé" -ForegroundColor Green

Set-Location ..

Write-Host ""
Write-Host "⚙️  Configuration..." -ForegroundColor Yellow
Write-Host ""

# Créer .env pour le serveur
if (-not (Test-Path "server/.env")) {
    Write-Host "Création du fichier .env du serveur..." -ForegroundColor Yellow
    Copy-Item "server/.env.example" "server/.env"
    Write-Host "⚠️  N'oubliez pas d'éditer server/.env avec vos informations PostgreSQL!" -ForegroundColor Yellow
} else {
    Write-Host "✓ server/.env existe déjà" -ForegroundColor Green
}

# Créer .env pour le client
if (-not (Test-Path "client/.env")) {
    Write-Host "Création du fichier .env du client..." -ForegroundColor Yellow
    Copy-Item "client/.env.example" "client/.env"
    Write-Host "✓ client/.env créé" -ForegroundColor Green
} else {
    Write-Host "✓ client/.env existe déjà" -ForegroundColor Green
}

Write-Host ""
Write-Host "🗄️  Configuration de la base de données..." -ForegroundColor Yellow
Write-Host ""

$response = Read-Host "Voulez-vous initialiser la base de données maintenant? (y/n)"
if ($response -eq "y" -or $response -eq "Y") {
    Set-Location server
    Write-Host "Génération du client Prisma..." -ForegroundColor Yellow
    npx prisma generate
    
    Write-Host ""
    Write-Host "Création de la migration..." -ForegroundColor Yellow
    npx prisma migrate dev --name init
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Base de données initialisée avec succès!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erreur lors de l'initialisation de la base de données" -ForegroundColor Red
        Write-Host "Vérifiez votre configuration PostgreSQL dans server/.env"
    }
    Set-Location ..
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ Installation terminée!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pour lancer l'application:"
Write-Host ""
Write-Host "Terminal 1 (Backend):"
Write-Host "  cd server"
Write-Host "  npm run dev"
Write-Host ""
Write-Host "Terminal 2 (Frontend):"
Write-Host "  cd client"
Write-Host "  npm run dev"
Write-Host ""
Write-Host "Puis ouvrir http://localhost:3000"
Write-Host ""
Write-Host "Documentation complète: README.md"
Write-Host "Guide de démarrage rapide: QUICKSTART.md"
Write-Host ""
