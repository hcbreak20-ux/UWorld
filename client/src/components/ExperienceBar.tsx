import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import './ExperienceBar.css';

interface LevelProgress {
  level: number;
  currentXp: number;
  xpForNextLevel: number;
  progressPercentage: number;
  totalXp: number;
}

export const ExperienceBar = () => {
  const [progress, setProgress] = useState<LevelProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProgress = async () => {
    try {
      const response = await api.get('/level/progress');
      setProgress(response.data);
      setIsLoading(false);
    } catch (error) {
      console.error('Erreur chargement progression:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
    
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(fetchProgress, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading || !progress) {
    return null;
  }

  return (
    <div className="experience-bar-container">
      <div className="experience-bar-wrapper">
        {/* Niveau */}
        <div className="experience-bar-level">
          Niveau {progress.level}
        </div>

        {/* Barre de progression */}
        <div className="experience-bar-progress-container">
          <div className="experience-bar-track">
            {/* Barre de remplissage */}
            <div
              className="experience-bar-fill"
              style={{ width: `${progress.progressPercentage}%` }}
            >
              {/* Animation de brillance */}
              <div className="experience-bar-shimmer"></div>
            </div>

            {/* Texte XP */}
            <div className="experience-bar-text">
              {progress.currentXp.toLocaleString()} / {progress.xpForNextLevel.toLocaleString()} XP
            </div>
          </div>
        </div>

        {/* Pourcentage */}
        <div className="experience-bar-percentage">
          {progress.progressPercentage}%
        </div>
      </div>
    </div>
  );
};