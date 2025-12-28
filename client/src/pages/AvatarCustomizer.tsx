import React, { useState, useEffect } from 'react';
import { useStore } from '@/store';
import { api } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import './AvatarCustomizer.css';

interface AvatarColors {
  avatarSkinColor: string;
  avatarHairColor: string;
  avatarShirtColor: string;
  avatarPantsColor: string;
}

export const AvatarCustomizer: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useStore();

  // Couleurs actuelles
  const [colors, setColors] = useState<AvatarColors>({
    avatarSkinColor: '#FFDCB1',
    avatarHairColor: '#654321',
    avatarShirtColor: '#4287F5',
    avatarPantsColor: '#323250',
  });

  // Couleurs initiales (pour savoir si changé)
  const [initialColors, setInitialColors] = useState<AvatarColors>(colors);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Charger les couleurs actuelles
  useEffect(() => {
    const loadColors = async () => {
      try {
        const response = await api.get('/avatar/colors');
        const loadedColors = response.data;
        setColors(loadedColors);
        setInitialColors(loadedColors);
      } catch (error) {
        console.error('Erreur chargement couleurs:', error);
      } finally {
        setLoading(false);
      }
    };

    loadColors();
  }, []);

  // Vérifier si les couleurs ont changé
  const hasChanged = () => {
    return (
      colors.avatarSkinColor !== initialColors.avatarSkinColor ||
      colors.avatarHairColor !== initialColors.avatarHairColor ||
      colors.avatarShirtColor !== initialColors.avatarShirtColor ||
      colors.avatarPantsColor !== initialColors.avatarPantsColor
    );
  };

  // Sauvegarder les couleurs
  const handleSave = async () => {
    if (!hasChanged()) {
      alert('Aucun changement à sauvegarder!');
      return;
    }

    // TODO: Vérifier si l'utilisateur a assez de uCoins (50 coins par changement)
    // const COST = 50;
    // if (user && user.coins < COST) {
    //   alert(`Vous n'avez pas assez de uCoins! (Coût: ${COST})`);
    //   return;
    // }

       // ✅ AJOUTE CECI
  console.log('💾 Sauvegarde des couleurs:', colors);
  console.log('Type de avatarSkinColor:', typeof colors.avatarSkinColor);
  console.log('Valeur:', colors.avatarSkinColor);

    setSaving(true);
    try {
      await api.put('/avatar/colors', colors);
      alert('✅ Avatar sauvegardé avec succès!');
      setInitialColors(colors);
      // Retourner au lobby
      navigate('/lobby');
    } catch (error) {
      console.error('Erreur sauvegarde avatar:', error);
      alert('❌ Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Réinitialiser aux couleurs par défaut
  const handleReset = () => {
    setColors({
      avatarSkinColor: '#FFDCB1',
      avatarHairColor: '#654321',
      avatarShirtColor: '#4287F5',
      avatarPantsColor: '#323250',
    });
  };

  if (loading) {
    return (
      <div className="avatar-customizer">
        <div className="loading">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="avatar-customizer">
      <div className="customizer-container">
        {/* Header */}
        <div className="customizer-header">
          <h1>🎨 Personnaliser mon Avatar</h1>
          <button className="close-btn" onClick={() => navigate('/lobby')}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="customizer-content">
          {/* Preview */}
          <div className="avatar-preview">
            <h2>Aperçu</h2>
            <div className="preview-container">
              <svg width="200" height="300" viewBox="0 0 200 300">
                {/* Jambes */}
                <rect
                  x="70"
                  y="180"
                  width="25"
                  height="80"
                  fill={colors.avatarPantsColor}
                  stroke="#000"
                  strokeWidth="2"
                />
                <rect
                  x="105"
                  y="180"
                  width="25"
                  height="80"
                  fill={colors.avatarPantsColor}
                  stroke="#000"
                  strokeWidth="2"
                />

                {/* Chaussures */}
                <rect
                  x="65"
                  y="255"
                  width="35"
                  height="15"
                  fill="#282828"
                  stroke="#000"
                  strokeWidth="2"
                  rx="5"
                />
                <rect
                  x="100"
                  y="255"
                  width="35"
                  height="15"
                  fill="#282828"
                  stroke="#000"
                  strokeWidth="2"
                  rx="5"
                />

                {/* Corps (T-shirt) */}
                <rect
                  x="60"
                  y="120"
                  width="80"
                  height="70"
                  fill={colors.avatarShirtColor}
                  stroke="#000"
                  strokeWidth="2"
                  rx="10"
                />

                {/* Bras */}
                <rect
                  x="35"
                  y="125"
                  width="20"
                  height="60"
                  fill={colors.avatarSkinColor}
                  stroke="#000"
                  strokeWidth="2"
                  rx="10"
                />
                <rect
                  x="145"
                  y="125"
                  width="20"
                  height="60"
                  fill={colors.avatarSkinColor}
                  stroke="#000"
                  strokeWidth="2"
                  rx="10"
                />

                {/* Cou */}
                <rect
                  x="85"
                  y="100"
                  width="30"
                  height="25"
                  fill={colors.avatarSkinColor}
                  stroke="#000"
                  strokeWidth="2"
                />

                {/* Tête */}
                <circle
                  cx="100"
                  cy="70"
                  r="40"
                  fill={colors.avatarSkinColor}
                  stroke="#000"
                  strokeWidth="2"
                />

                {/* Cheveux */}
                <ellipse
                  cx="100"
                  cy="50"
                  rx="45"
                  ry="30"
                  fill={colors.avatarHairColor}
                  stroke="#000"
                  strokeWidth="2"
                />

                {/* Yeux */}
                <circle cx="85" cy="65" r="5" fill="#000" />
                <circle cx="115" cy="65" r="5" fill="#000" />
                <circle cx="87" cy="63" r="2" fill="#fff" />
                <circle cx="117" cy="63" r="2" fill="#fff" />

                {/* Sourire */}
                <path
                  d="M 85 80 Q 100 90 115 80"
                  stroke="#000"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            </div>
          </div>

          {/* Color pickers */}
          <div className="color-controls">
            <h2>Couleurs</h2>

            <div className="color-group">
              <label>
                <span className="color-label">👤 Peau</span>
                <div className="color-picker-wrapper">
                  <input
                    type="color"
                    value={colors.avatarSkinColor}
                    onChange={(e) =>
                      setColors({ ...colors, avatarSkinColor: e.target.value })
                    }
                  />
                  <span className="color-hex">{colors.avatarSkinColor}</span>
                </div>
              </label>

              <label>
                <span className="color-label">💇 Cheveux</span>
                <div className="color-picker-wrapper">
                  <input
                    type="color"
                    value={colors.avatarHairColor}
                    onChange={(e) =>
                      setColors({ ...colors, avatarHairColor: e.target.value })
                    }
                  />
                  <span className="color-hex">{colors.avatarHairColor}</span>
                </div>
              </label>

              <label>
                <span className="color-label">👕 T-Shirt</span>
                <div className="color-picker-wrapper">
                  <input
                    type="color"
                    value={colors.avatarShirtColor}
                    onChange={(e) =>
                      setColors({ ...colors, avatarShirtColor: e.target.value })
                    }
                  />
                  <span className="color-hex">{colors.avatarShirtColor}</span>
                </div>
              </label>

              <label>
                <span className="color-label">👖 Pantalon</span>
                <div className="color-picker-wrapper">
                  <input
                    type="color"
                    value={colors.avatarPantsColor}
                    onChange={(e) =>
                      setColors({ ...colors, avatarPantsColor: e.target.value })
                    }
                  />
                  <span className="color-hex">{colors.avatarPantsColor}</span>
                </div>
              </label>
            </div>

            {/* Boutons */}
            <div className="button-group">
              <button className="btn-reset" onClick={handleReset}>
                🔄 Réinitialiser
              </button>
              <button
                className="btn-save"
                onClick={handleSave}
                disabled={!hasChanged() || saving}
              >
                {saving ? '💾 Sauvegarde...' : '💾 Sauvegarder'}
              </button>
            </div>

            {hasChanged() && (
              <p className="change-notice">
                ⚠️ Vous avez des modifications non sauvegardées
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
