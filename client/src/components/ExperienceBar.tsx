import { useEffect, useState } from 'react';
import { api } from '@/services/api';

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
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40">
      <div className="bg-gradient-to-r from-indigo-900/90 to-purple-900/90 backdrop-blur-sm rounded-2xl px-6 py-3 shadow-xl border border-indigo-500/30">
        <div className="flex items-center gap-4">
          {/* Niveau */}
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-bold px-3 py-1 rounded-lg text-sm shadow-md">
              Niveau {progress.level}
            </div>
          </div>

          {/* Barre de progression */}
          <div className="flex-1 min-w-[300px]">
            <div className="relative h-6 bg-gray-800/50 rounded-full overflow-hidden border border-indigo-500/20">
              {/* Barre de remplissage */}
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-1000 ease-out"
                style={{ width: `${progress.progressPercentage}%` }}
              >
                {/* Animation de brillance */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              </div>

              {/* Texte XP */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white font-semibold text-sm drop-shadow-md z-10">
                  {progress.currentXp.toLocaleString()} / {progress.xpForNextLevel.toLocaleString()} XP
                </span>
              </div>
            </div>
          </div>

          {/* Pourcentage */}
          <div className="text-white font-bold text-sm">
            {progress.progressPercentage}%
          </div>
        </div>
      </div>
    </div>
  );
};