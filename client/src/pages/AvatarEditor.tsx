import React, { useState, useEffect } from 'react';
import { useStore } from '@/store';
import { api } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import './AvatarEditor.css';

interface AvatarConfig {
  gender: 'male' | 'female';
  headType: number;
  hairStyle: number;
  clothingStyle: number;
  skinColor: string;
  hairColor: string;
  clothingColor: string;
  pantsColor: string;
}

interface AvatarOptions {
  genders: string[];
  headTypes: number[];
  headNames: string[];
  hairStyles: number[];
  hairNames: string[];
  clothingStyles: number[];
  clothingNames: string[];
  skinColors: string[];
  hairColors: string[];
  clothingColors: string[];
}

export const AvatarEditor: React.FC = () => {
  const { user, setUser } = useStore();
  const navigate = useNavigate();
  
  const [avatar, setAvatar] = useState<AvatarConfig>({
    gender: 'male',
    headType: 1,
    hairStyle: 1,
    clothingStyle: 1,
    skinColor: 'light',
    hairColor: 'brown',
    clothingColor: 'blue',
    pantsColor: 'blue',
  });
  
  const [options, setOptions] = useState<AvatarOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    loadOptions();
    loadCurrentAvatar();
  }, []);

  useEffect(() => {
    // Mettre à jour l'aperçu quand l'avatar change
    updatePreview();
  }, [avatar]);

  const loadOptions = async () => {
    try {
      const response = await api.get('/avatar/options');
      setOptions(response.data);
    } catch (error) {
      console.error('Erreur chargement options:', error);
    }
  };

  const loadCurrentAvatar = async () => {
    try {
      const response = await api.get('/avatar');
      if (response.data.avatar) {
        setAvatar(response.data.avatar);
      }
    } catch (error) {
      console.error('Erreur chargement avatar:', error);
    }
  };

  const updatePreview = () => {
    // Générer l'URL de l'aperçu basé sur la config actuelle
    // Pour l'instant on affiche juste un placeholder
    // Dans une vraie implémentation, on générerait l'image côté serveur
    const params = new URLSearchParams(avatar as any).toString();
    setPreviewUrl(`/api/avatar/preview?${params}`);
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await api.put('/avatar', avatar);
      
      // Mettre à jour l'utilisateur dans le store
      if (user && response.data.user) {
        setUser({
          ...user,
          avatar: response.data.user.avatar,
        });
      }
      
      alert('Avatar sauvegardé avec succès!');
      navigate('/lobby');
    } catch (error) {
      console.error('Erreur sauvegarde avatar:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/lobby');
  };

  if (!options) {
    return <div className="avatar-editor-loading">Chargement...</div>;
  }

  return (
    <div className="avatar-editor">
      <div className="avatar-editor-container">
        <h1>🎨 Personnaliser ton Avatar</h1>
        
        <div className="avatar-editor-content">
          {/* Aperçu */}
          <div className="avatar-preview-section">
            <h2>Aperçu</h2>
            <div className="avatar-preview">
              <div className="avatar-display">
                {/* Affichage simplifié pour l'instant */}
                <div className="avatar-placeholder">
                  <div style={{ 
                    fontSize: '64px',
                    textAlign: 'center',
                  }}>
                    {avatar.gender === 'male' ? '👨' : '👩'}
                  </div>
                  <p>{avatar.gender === 'male' ? 'Homme' : 'Femme'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="avatar-options-section">
            {/* Genre */}
            <div className="option-group">
              <h3>Genre</h3>
              <div className="option-buttons">
                <button
                  className={avatar.gender === 'male' ? 'active' : ''}
                  onClick={() => setAvatar({ ...avatar, gender: 'male' })}
                >
                  👨 Homme
                </button>
                <button
                  className={avatar.gender === 'female' ? 'active' : ''}
                  onClick={() => setAvatar({ ...avatar, gender: 'female' })}
                >
                  👩 Femme
                </button>
              </div>
            </div>

            {/* Tête */}
            <div className="option-group">
              <h3>Type de Tête</h3>
              <div className="option-buttons">
                {options.headTypes.map((type, index) => (
                  <button
                    key={type}
                    className={avatar.headType === type ? 'active' : ''}
                    onClick={() => setAvatar({ ...avatar, headType: type })}
                  >
                    {options.headNames[index]}
                  </button>
                ))}
              </div>
            </div>

            {/* Cheveux */}
            <div className="option-group">
              <h3>Coiffure</h3>
              <div className="option-buttons">
                {options.hairStyles.map((style, index) => (
                  <button
                    key={style}
                    className={avatar.hairStyle === style ? 'active' : ''}
                    onClick={() => setAvatar({ ...avatar, hairStyle: style })}
                  >
                    {options.hairNames[index]}
                  </button>
                ))}
              </div>
            </div>

            {/* Vêtements */}
            <div className="option-group">
              <h3>Vêtements</h3>
              <div className="option-buttons">
                {options.clothingStyles.map((style, index) => (
                  <button
                    key={style}
                    className={avatar.clothingStyle === style ? 'active' : ''}
                    onClick={() => setAvatar({ ...avatar, clothingStyle: style })}
                  >
                    {options.clothingNames[index]}
                  </button>
                ))}
              </div>
            </div>

            {/* Couleur de peau */}
            <div className="option-group">
              <h3>Couleur de Peau</h3>
              <div className="option-colors">
                {options.skinColors.map((color) => (
                  <button
                    key={color}
                    className={`color-btn ${avatar.skinColor === color ? 'active' : ''}`}
                    onClick={() => setAvatar({ ...avatar, skinColor: color })}
                    title={color}
                  >
                    <div className={`color-preview skin-${color}`}></div>
                  </button>
                ))}
              </div>
            </div>

            {/* Couleur de cheveux */}
            <div className="option-group">
              <h3>Couleur de Cheveux</h3>
              <div className="option-colors">
                {options.hairColors.map((color) => (
                  <button
                    key={color}
                    className={`color-btn ${avatar.hairColor === color ? 'active' : ''}`}
                    onClick={() => setAvatar({ ...avatar, hairColor: color })}
                    title={color}
                  >
                    <div className={`color-preview hair-${color}`}></div>
                  </button>
                ))}
              </div>
            </div>

            {/* Couleur de vêtements */}
            <div className="option-group">
              <h3>Couleur de Vêtements</h3>
              <div className="option-colors">
                {options.clothingColors.map((color) => (
                  <button
                    key={color}
                    className={`color-btn ${avatar.clothingColor === color ? 'active' : ''}`}
                    onClick={() => setAvatar({ ...avatar, clothingColor: color })}
                    title={color}
                  >
                    <div className={`color-preview clothing-${color}`}></div>
                  </button>
                ))}
              </div>
            </div>

            {/* Couleur de pantalon */}
            <div className="option-group">
              <h3>Couleur de Pantalon</h3>
              <div className="option-colors">
                {options.clothingColors.map((color) => (
                  <button
                    key={color}
                    className={`color-btn ${avatar.pantsColor === color ? 'active' : ''}`}
                    onClick={() => setAvatar({ ...avatar, pantsColor: color })}
                    title={color}
                  >
                    <div className={`color-preview clothing-${color}`}></div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="avatar-editor-actions">
          <button onClick={handleCancel} className="btn-cancel">
            Annuler
          </button>
          <button onClick={handleSave} className="btn-save" disabled={loading}>
            {loading ? 'Sauvegarde...' : '💾 Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
};
