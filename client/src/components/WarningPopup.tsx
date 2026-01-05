// client/src/components/WarningPopup.tsx
import React, { useState, useEffect } from 'react';
import './WarningPopup.css';

interface WarningPopupProps {
  reason: string;
  warningCount: number;
  adminUsername: string;
  onClose: () => void;
}

const WarningPopup: React.FC<WarningPopupProps> = ({
  reason,
  warningCount,
  adminUsername,
  onClose
}) => {
  const [canClose, setCanClose] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);

  useEffect(() => {
    // Timer de 10 secondes
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setCanClose(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="warning-popup-overlay">
      <div className="warning-popup">
        <div className="warning-header">
          <span className="warning-icon">⚠️</span>
          <h2>AVERTISSEMENT</h2>
        </div>
        
        <div className="warning-content">
          <p className="warning-admin">
            Par: <strong>{adminUsername}</strong>
          </p>
          
          <p className="warning-reason">
            <strong>Raison:</strong> {reason}
          </p>
          
          <p className="warning-count">
            Vous avez maintenant <strong>{warningCount}</strong> avertissement{warningCount > 1 ? 's' : ''}
          </p>
          
          {warningCount >= 3 && (
            <p className="warning-danger">
              ⚠️ Attention: 3 avertissements ou plus peuvent entraîner un bannissement!
            </p>
          )}
        </div>
        
        <div className="warning-footer">
          {!canClose ? (
            <p className="warning-timer">
              Vous pourrez fermer dans {timeLeft} seconde{timeLeft > 1 ? 's' : ''}
            </p>
          ) : (
            <button 
              className="warning-close-btn"
              onClick={onClose}
            >
              J'ai compris
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WarningPopup;
