import React, { useState, useEffect } from 'react';
import { useStore } from '@/store';
import { QuestPanel } from './QuestPanel';
import { questAPI } from '@/services/quest.service';
import './InventoryPanel.css';

interface FurnitureItem {
  id: string;
  name: string;
  type: string;
  icon: string;
  quantity: number;
}

interface InventoryPanelProps {
  showRoomList: boolean;
  onToggleRoomList: () => void;
}

export const InventoryPanel: React.FC<InventoryPanelProps> = ({ 
  showRoomList, 
  onToggleRoomList 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showQuests, setShowQuests] = useState(false);
  const [questsToClaimCount, setQuestsToClaimCount] = useState(3);
  const { setPlacementMode, user } = useStore();

  // Vérifier les quêtes à réclamer
  useEffect(() => {
    const checkQuests = async () => {
      if (!user) return;
      
      try {
        const data = await questAPI.getProgress();
        const count = data.stats.rewardsToClaim;
        
        // Si le nombre a augmenté, jouer le son
        if (count > questsToClaimCount) {
          playNotificationSound();
        }
        
        setQuestsToClaimCount(count);
      } catch (error) {
        // Ignorer les erreurs silencieusement
      }
    };

    checkQuests();
    
    // Vérifier toutes les 10 secondes
    const interval = setInterval(checkQuests, 10000);
    
    return () => clearInterval(interval);
  }, [user, questsToClaimCount]);

  // Fonction pour jouer un son de notification
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Note brillante (Do aigu)
      const oscillator1 = audioContext.createOscillator();
      const gainNode1 = audioContext.createGain();
      
      oscillator1.connect(gainNode1);
      gainNode1.connect(audioContext.destination);
      
      oscillator1.frequency.value = 1046.5; // Do aigu
      oscillator1.type = 'sine';
      
      gainNode1.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode1.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator1.start(audioContext.currentTime);
      oscillator1.stop(audioContext.currentTime + 0.5);
      
      // Note harmonie (Mi aigu)
      setTimeout(() => {
        const oscillator2 = audioContext.createOscillator();
        const gainNode2 = audioContext.createGain();
        
        oscillator2.connect(gainNode2);
        gainNode2.connect(audioContext.destination);
        
        oscillator2.frequency.value = 1318.5; // Mi aigu
        oscillator2.type = 'sine';
        
        gainNode2.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        
        oscillator2.start(audioContext.currentTime);
        oscillator2.stop(audioContext.currentTime + 0.4);
      }, 100);
      
    } catch (error) {
      console.error('Erreur son:', error);
    }
  };

  // Meubles exemple (plus tard ce sera dans le store/base de données)
  const furnitureItems: FurnitureItem[] = [
    { id: '1', name: 'Chaise en bois', type: 'furniture_chair', icon: '🪑', quantity: 3 },
    { id: '2', name: 'Table basse', type: 'furniture_table', icon: '🪑', quantity: 1 },
    { id: '3', name: 'Plante verte', type: 'furniture_plant', icon: '🌿', quantity: 5 },
    { id: '4', name: 'Canapé', type: 'furniture_sofa', icon: '🛋️', quantity: 2 },
    { id: '5', name: 'Lampe', type: 'furniture_lamp', icon: '💡', quantity: 4 },
    { id: '6', name: 'Tapis rouge', type: 'furniture_rug', icon: '🟥', quantity: 2 },
  ];

  const handlePlaceFurniture = (item: FurnitureItem) => {
    console.log('Mode placement activé pour:', item.name);
    
    // Activer le mode placement
    setPlacementMode(true, item.type, item.name, item.icon);
    
    // Fermer l'inventaire
    setIsOpen(false);
  };

  return (
    <>
      {/* Barre d'outils style Habbo en bas */}
      <div className="habbo-toolbar">
        {/* Bouton Inventaire */}
        <div 
          className={`toolbar-button ${isOpen ? 'active' : ''}`}
          onClick={() => setIsOpen(!isOpen)}
          title="Inventaire"
        >
          <div className="toolbar-icon inventory-icon">
            🎒
          </div>
        </div>

        {/* Bouton Quêtes */}
        <div 
          className={`toolbar-button ${showQuests ? 'active' : ''} ${questsToClaimCount > 0 ? 'quest-glow has-notification' : ''}`}
          onClick={() => setShowQuests(!showQuests)}
          title="Quêtes"
          data-count={questsToClaimCount}
        >
          <div className="toolbar-icon">
            📋
          </div>
        </div>

        {/* Bouton Catalogue */}
        <div className="toolbar-button disabled" title="Catalogue (bientôt)">
          <div className="toolbar-icon">🏪</div>
        </div>
        
        {/* Bouton Navigateur/Salles */}
        <div 
          className={`toolbar-button ${showRoomList ? 'active' : ''}`}
          onClick={onToggleRoomList}
          title="Salles"
        >
          <div className="toolbar-icon">🗺️</div>
        </div>
        
        {/* Bouton Amis */}
        <div className="toolbar-button disabled" title="Amis (bientôt)">
          <div className="toolbar-icon">👥</div>
        </div>
      </div>

      {/* Panneau de Quêtes */}
      {showQuests && (
        <QuestPanel 
          onClose={() => setShowQuests(false)} 
          onQuestClaimed={() => setQuestsToClaimCount(prev => Math.max(0, prev - 1))}
        />
      )}

      {/* Panneau d'inventaire */}
      {isOpen && (
        <div className="inventory-panel">
          <div className="inventory-header">
            <div className="inventory-title">
              <span className="inventory-title-icon">🎒</span>
              <span className="inventory-title-text">Mon Inventaire</span>
            </div>
            <button className="inventory-close-btn" onClick={() => setIsOpen(false)}>
              ✕
            </button>
          </div>

          <div className="inventory-tabs">
            <div className="inventory-tab active">
              🪑 Meubles
            </div>
          </div>

          <div className="inventory-content">
            <div className="furniture-grid">
              {furnitureItems.length === 0 ? (
                <div className="inventory-empty">
                  <div className="empty-icon">📦</div>
                  <p>Ton inventaire est vide</p>
                  <small>Achète des meubles dans le catalogue!</small>
                </div>
              ) : (
                furnitureItems.map((item) => (
                  <div 
                    key={item.id} 
                    className="furniture-item"
                    onClick={() => handlePlaceFurniture(item)}
                  >
                    <div className="furniture-item-icon">{item.icon}</div>
                    <div className="furniture-item-name">{item.name}</div>
                    {item.quantity > 1 && (
                      <div className="furniture-item-quantity">×{item.quantity}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="inventory-footer">
            <div className="inventory-info">
              💡 Clique sur un meuble pour le placer
            </div>
          </div>
        </div>
      )}
    </>
  );
};
