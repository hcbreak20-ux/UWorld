#!/usr/bin/env python3
"""
Script pour générer des sprites de base pour Virtual World
Crée des placeholders colorés en attendant les vrais assets
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Créer le dossier assets s'il n'existe pas
ASSETS_DIR = "client/src/assets"
SPRITES_DIR = os.path.join(ASSETS_DIR, "sprites")

os.makedirs(SPRITES_DIR, exist_ok=True)

def create_player_sprite(color, filename):
    """Créer un sprite de joueur simple"""
    size = 32
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Corps (rectangle)
    draw.rectangle([8, 12, 24, 28], fill=color)
    
    # Tête (cercle)
    draw.ellipse([10, 4, 22, 16], fill='#FFD1A3')
    
    # Yeux
    draw.ellipse([13, 8, 15, 10], fill='black')
    draw.ellipse([17, 8, 19, 10], fill='black')
    
    img.save(os.path.join(SPRITES_DIR, filename))
    print(f"✓ Créé: {filename}")

def create_furniture_sprite(color, shape, filename):
    """Créer un sprite de meuble simple"""
    size = 32
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    if shape == 'chair':
        # Dossier
        draw.rectangle([12, 4, 20, 20], fill=color)
        # Siège
        draw.rectangle([10, 18, 22, 24], fill=color)
        # Pieds
        draw.rectangle([10, 24, 12, 30], fill=color)
        draw.rectangle([20, 24, 22, 30], fill=color)
    
    elif shape == 'table':
        # Plateau
        draw.rectangle([4, 12, 28, 18], fill=color)
        # Pieds
        draw.rectangle([6, 18, 10, 28], fill=color)
        draw.rectangle([22, 18, 26, 28], fill=color)
    
    elif shape == 'bed':
        # Matelas
        draw.rectangle([4, 12, 28, 24], fill=color)
        # Oreiller
        draw.rectangle([4, 8, 12, 14], fill='white')
    
    img.save(os.path.join(SPRITES_DIR, filename))
    print(f"✓ Créé: {filename}")

def create_tile_sprite(color, pattern, filename):
    """Créer un sprite de sol/mur"""
    size = 32
    img = Image.new('RGBA', (size, size), color)
    draw = ImageDraw.Draw(img)
    
    if pattern == 'grid':
        # Grille
        draw.line([(0, 0), (size, 0)], fill=(0, 0, 0, 50), width=1)
        draw.line([(0, 0), (0, size)], fill=(0, 0, 0, 50), width=1)
    
    elif pattern == 'checkered':
        # Damier
        for i in range(0, size, 16):
            for j in range(0, size, 16):
                if (i + j) % 32 == 0:
                    draw.rectangle([i, j, i+16, j+16], 
                                 fill=tuple(max(0, c-30) for c in color))
    
    img.save(os.path.join(SPRITES_DIR, filename))
    print(f"✓ Créé: {filename}")

def main():
    print("🎨 Génération des sprites de base...")
    print()
    
    # Joueurs
    print("Joueurs:")
    create_player_sprite('#4287f5', 'player_blue.png')
    create_player_sprite('#42f554', 'player_green.png')
    create_player_sprite('#f54242', 'player_red.png')
    create_player_sprite('#f5d442', 'player_yellow.png')
    
    print()
    print("Meubles:")
    # Meubles
    create_furniture_sprite('#8B4513', 'chair', 'chair_wood.png')
    create_furniture_sprite('#DC143C', 'chair', 'chair_red.png')
    create_furniture_sprite('#8B4513', 'table', 'table_wood.png')
    create_furniture_sprite('#4169E1', 'bed', 'bed_blue.png')
    
    print()
    print("Sols et murs:")
    # Sols
    create_tile_sprite((200, 200, 200), 'grid', 'floor_gray.png')
    create_tile_sprite((139, 69, 19), 'checkered', 'floor_wood.png')
    create_tile_sprite((34, 139, 34), 'grid', 'floor_grass.png')
    
    # Murs
    create_tile_sprite((70, 70, 90), 'grid', 'wall_gray.png')
    create_tile_sprite((139, 69, 19), 'grid', 'wall_wood.png')
    
    print()
    print("=" * 50)
    print("✅ Sprites générés dans:", SPRITES_DIR)
    print()
    print("Pour des sprites professionnels, visite:")
    print("  - https://opengameart.org/")
    print("  - https://itch.io/game-assets/free")
    print("  - https://kenney.nl/assets")

if __name__ == "__main__":
    try:
        main()
    except ImportError:
        print("❌ Pillow n'est pas installé!")
        print("Installer avec: pip install Pillow")
