import React, { useState, useEffect } from 'react';
import { adminService, AdminLog, AdminStats, Badge } from '../services/adminService';
import './AdminPanel.css';

interface AdminPanelProps {
  onClose: () => void;
  userRole: string;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose, userRole }) => {
  const [activeTab, setActiveTab] = useState('moderation');
  
  return (
    <div className="admin-panel-overlay">
      <div className="admin-panel">
        <div className="admin-panel-header">
          <h2>👑 Panel Admin</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        
        <div className="admin-panel-tabs">
          <button 
            className={`tab ${activeTab === 'moderation' ? 'active' : ''}`}
            onClick={() => setActiveTab('moderation')}
          >
            🔨 Modération
          </button>
          <button 
            className={`tab ${activeTab === 'badges' ? 'active' : ''}`}
            onClick={() => setActiveTab('badges')}
          >
            🏅 Badges
          </button>
          <button 
            className={`tab ${activeTab === 'economy' ? 'active' : ''}`}
            onClick={() => setActiveTab('economy')}
          >
            💰 Économie
          </button>
          <button 
            className={`tab ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            📋 Logs
          </button>
          <button 
            className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
          >
            📊 Stats
          </button>
        </div>
        
        <div className="admin-panel-content">
          {activeTab === 'moderation' && <ModerationTab userRole={userRole} />}
          {activeTab === 'badges' && <BadgesTab userRole={userRole} />}
          {activeTab === 'economy' && <EconomyTab userRole={userRole} />}
          {activeTab === 'logs' && <LogsTab userRole={userRole} />}
          {activeTab === 'stats' && <StatsTab userRole={userRole} />}
        </div>
      </div>
    </div>
  );
};

// ==================
// TAB MODÉRATION
// ==================

const ModerationTab: React.FC<{ userRole: string }> = ({ userRole }) => {
  const [action, setAction] = useState<'ban' | 'mute' | 'warn' | 'kick'>('ban');
  const [targetUsername, setTargetUsername] = useState('');
  const [duration, setDuration] = useState('1h');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    if (!targetUsername || !reason) {
      setMessage('⚠️ Tous les champs sont requis');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      let result;

      switch (action) {
        case 'ban':
          result = await adminService.banUser(targetUsername, duration, reason);
          break;
        case 'mute':
          result = await adminService.muteUser(targetUsername, duration, reason);
          break;
        case 'warn':
          result = await adminService.warnUser(targetUsername, reason);
          break;
        case 'kick':
          result = await adminService.kickUser(targetUsername, reason);
          break;
      }

      setMessage(`✅ ${result.message}`);
      setTargetUsername('');
      setReason('');
    } catch (error: any) {
      console.error('Erreur modération:', error);
      setMessage(`❌ ${error.response?.data?.error || 'Erreur serveur'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="moderation-tab">
      <h3>Actions de modération</h3>
      
      <div className="action-selector">
        <button 
          className={action === 'ban' ? 'active' : ''}
          onClick={() => setAction('ban')}
        >
          🚫 Ban
        </button>
        <button 
          className={action === 'mute' ? 'active' : ''}
          onClick={() => setAction('mute')}
        >
          🔇 Mute
        </button>
        <button 
          className={action === 'warn' ? 'active' : ''}
          onClick={() => setAction('warn')}
        >
          ⚠️ Warn
        </button>
        <button 
          className={action === 'kick' ? 'active' : ''}
          onClick={() => setAction('kick')}
        >
          👢 Kick
        </button>
      </div>

      <div className="form-group">
        <label>Nom d'utilisateur:</label>
        <input 
          type="text"
          placeholder="Ex: John123"
          value={targetUsername}
          onChange={(e) => setTargetUsername(e.target.value)}
        />
      </div>

      {(action === 'ban' || action === 'mute') && (
        <div className="form-group">
          <label>Durée:</label>
          <select value={duration} onChange={(e) => setDuration(e.target.value)}>
            <option value="5m">5 minutes</option>
            <option value="10m">10 minutes</option>
            <option value="15m">15 minutes</option>
            <option value="30m">30 minutes</option>
            <option value="1h">1 heure</option>
            <option value="3h">3 heures</option>
            <option value="6h">6 heures</option>
            <option value="12h">12 heures</option>
            <option value="24h">24 heures</option>
            <option value="3d">3 jours</option>
            <option value="7d">7 jours</option>
            {(userRole === 'admin' || userRole === 'owner') && (
              <option value="permanent">Permanent</option>
            )}
          </select>
        </div>
      )}

      <div className="form-group">
        <label>Raison:</label>
        <input 
          type="text"
          placeholder="Ex: Spam répété"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      <button 
        className="submit-btn"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? 'Traitement...' : `${action.toUpperCase()}`}
      </button>

      {message && <div className="message">{message}</div>}

      <div className="info-box">
        <h4>ℹ️ Limites par rôle:</h4>
        <ul>
          <li><strong>Moderator:</strong> Ban max 7j, Mute max 24h</li>
          <li><strong>Admin/Owner:</strong> Ban/Mute permanent possible</li>
        </ul>
      </div>
    </div>
  );
};

// ==================
// TAB BADGES
// ==================

const BadgesTab: React.FC<{ userRole: string }> = ({ userRole }) => {
  const [targetUsername, setTargetUsername] = useState('');
  const [badgeKey, setBadgeKey] = useState('vip_2024');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(true);

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    try {
      const allBadges = await adminService.getBadges();
      setBadges(allBadges);
    } catch (error) {
      console.error('Erreur chargement badges:', error);
    } finally {
      setLoadingBadges(false);
    }
  };

  const handleGiveBadge = async () => {
    if (!targetUsername) {
      setMessage('⚠️ Entrez un nom d\'utilisateur');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const result = await adminService.giveBadge(targetUsername, badgeKey);
      setMessage(`✅ ${result.message}`);
      setTargetUsername('');
    } catch (error: any) {
      console.error('Erreur badge:', error);
      setMessage(`❌ ${error.response?.data?.error || 'Erreur serveur'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="badges-tab">
      <h3>Gestion des badges</h3>
      
      <div className="form-group">
        <label>Nom d'utilisateur:</label>
        <input 
          type="text"
          placeholder="Ex: Alice"
          value={targetUsername}
          onChange={(e) => setTargetUsername(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Badge:</label>
        {loadingBadges ? (
          <div>Chargement des badges...</div>
        ) : (
          <select value={badgeKey} onChange={(e) => setBadgeKey(e.target.value)}>
            {badges.map((badge) => (
              <option key={badge.key} value={badge.key}>
                {badge.icon} {badge.name} {badge.isAdminOnly ? '(Admin)' : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      <button 
        className="submit-btn"
        onClick={handleGiveBadge}
        disabled={loading || loadingBadges}
      >
        {loading ? 'Traitement...' : 'Donner le badge'}
      </button>

      {message && <div className="message">{message}</div>}

      <div className="info-box">
        <h4>📋 Badges disponibles:</h4>
        <div className="badges-grid">
          {badges.slice(0, 6).map((badge) => (
            <div key={badge.key} className="badge-preview">
              <span className="badge-icon">{badge.icon}</span>
              <span className="badge-name">{badge.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==================
// TAB ÉCONOMIE
// ==================

const EconomyTab: React.FC<{ userRole: string }> = ({ userRole }) => {
  const [currency, setCurrency] = useState<'coins' | 'gems'>('coins');
  const [targetUsername, setTargetUsername] = useState('');
  const [amount, setAmount] = useState('1000');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleGive = async () => {
    if (!targetUsername || !amount) {
      setMessage('⚠️ Tous les champs sont requis');
      return;
    }

    const amountNum = parseInt(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setMessage('⚠️ Montant invalide');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      let result;
      
      if (currency === 'coins') {
        result = await adminService.giveCoins(targetUsername, amountNum);
      } else {
        result = await adminService.giveGems(targetUsername, amountNum);
      }

      setMessage(`✅ ${result.message}`);
      setTargetUsername('');
      setAmount('1000');
    } catch (error: any) {
      console.error('Erreur économie:', error);
      setMessage(`❌ ${error.response?.data?.error || 'Erreur serveur'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="economy-tab">
      <h3>Gestion de l'économie</h3>
      
      <div className="form-group">
        <label>Nom d'utilisateur:</label>
        <input 
          type="text"
          placeholder="Ex: Bob"
          value={targetUsername}
          onChange={(e) => setTargetUsername(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label>Monnaie:</label>
        <div className="currency-selector">
          <button 
            className={currency === 'coins' ? 'active' : ''}
            onClick={() => setCurrency('coins')}
          >
            💰 uCoins
          </button>
          <button 
            className={currency === 'gems' ? 'active' : ''}
            onClick={() => setCurrency('gems')}
          >
            💎 uNuggets
          </button>
        </div>
      </div>

      <div className="form-group">
        <label>Montant:</label>
        <input 
          type="number"
          placeholder="1000"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="1"
        />
      </div>

      <button 
        className="submit-btn"
        onClick={handleGive}
        disabled={loading}
      >
        {loading ? 'Traitement...' : `Donner ${amount} ${currency === 'coins' ? 'uCoins' : 'uNuggets'}`}
      </button>

      {message && <div className="message">{message}</div>}
    </div>
  );
};

// ==================
// TAB LOGS
// ==================

const LogsTab: React.FC<{ userRole: string }> = ({ userRole }) => {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    
    try {
      const data = await adminService.getLogs(50);
      setLogs(data);
    } catch (error) {
      console.error('Erreur logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="logs-tab">
      <h3>Historique des actions</h3>
      
      <div className="filter-bar">
        <button onClick={loadLogs}>🔄 Actualiser</button>
      </div>

      {loading ? (
        <div className="loading">Chargement...</div>
      ) : (
        <div className="logs-list">
          {logs.length === 0 ? (
            <div className="no-logs">Aucun log</div>
          ) : (
            logs.map(log => (
              <div key={log.id} className="log-item">
                <div className="log-header">
                  <span className={`action-badge ${log.action}`}>{log.action}</span>
                  <span className="log-date">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="log-details">
                  <strong>{log.admin.username}</strong> → {log.targetUser?.username || 'N/A'}
                </div>
                {log.reason && (
                  <div className="log-reason">Raison: {log.reason}</div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ==================
// TAB STATS
// ==================

const StatsTab: React.FC<{ userRole: string }> = ({ userRole }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    
    try {
      const data = await adminService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Erreur stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  if (loading || !stats) {
    return <div className="loading">Chargement des statistiques...</div>;
  }

  return (
    <div className="stats-tab">
      <h3>Statistiques du serveur</h3>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-value">{stats.totalUsers}</div>
          <div className="stat-label">Utilisateurs</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🟢</div>
          <div className="stat-value">{stats.onlineUsers}</div>
          <div className="stat-label">En ligne</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🚫</div>
          <div className="stat-value">{stats.bannedUsers}</div>
          <div className="stat-label">Bannis</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🔇</div>
          <div className="stat-value">{stats.mutedUsers}</div>
          <div className="stat-label">Mutes</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🏅</div>
          <div className="stat-value">{stats.totalBadges}</div>
          <div className="stat-label">Badges</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🏛️</div>
          <div className="stat-value">{stats.totalRooms}</div>
          <div className="stat-label">Salles</div>
        </div>
      </div>

      <button className="refresh-btn" onClick={loadStats}>
        🔄 Actualiser
      </button>
    </div>
  );
};
