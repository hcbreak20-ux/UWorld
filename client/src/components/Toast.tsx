import React, { useEffect, useState } from 'react';
import './Toast.css';

interface ToastProps {
  message: string;
  username?: string;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ 
  message, 
  username,
  onClose, 
  duration = 4000 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Attendre la fin de l'animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className={`toast ${isVisible ? 'toast-visible' : 'toast-hidden'}`}>
      <div className="toast-icon">💬</div>
      <div className="toast-content">
        <div className="toast-title">Nouveau message</div>
        {username && (
          <div className="toast-username">de {username}</div>
        )}
        <div className="toast-message">{message}</div>
      </div>
      <button className="toast-close" onClick={() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }}>
        ✕
      </button>
    </div>
  );
};
