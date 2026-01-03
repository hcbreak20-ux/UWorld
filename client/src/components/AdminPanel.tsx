import React, { useState, useEffect } from 'react';
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
      const token = localStorage.getItem('token');
      
      let endpoint = '';
      let body: any = { targetUsername, reason };

      if (action === 'ban' || action === 'mute') {
        endpoint = `/api/admin/${action}`;
        body.duration = duration;
      } else if (action === 'warn') {
        endpoint = '/api/admin/warn';
      } else if (action === 'kick') {
        // Kick se fait via Socket.IO (voir plus bas)
        setMessage('⚠️ Utilisez la commande :kick pour expulser');
        setLoading(false);
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ ${data.message}`);
        setTargetUsername('');
        setReason('');
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (error) {
      console.error('Erreur modération:', error);
      setMessage('❌ Erreur serveur');
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
            <option value="30m">30 minutes</option>
            <option value="1h">1 heure</option>
            <option value="24h">24 heures</option>
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
  const [badgeCode, setBadgeCode] = useState('vip_2024');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [badges, setBadges] = useState<any[]>([]);

  useEffect(() => {
    // Tu peux charger la liste des badges depuis l'API
    // Pour l'instant, badges en dur
    setBadges([
      { code: 'vip_2024', name: 'VIP 2024', isAdminOnly: false },
      { code: 'staff', name: 'Staff', isAdminOnly: true },
      { code: 'moderator', name: 'Modérateur', isAdminOnly: true },
      { code: 'founder', name: 'Fondateur', isAdminOnly: true },
      { code: 'event_summer_2024', name: 'Été 2024', isAdminOnly: false },
      { code: 'beta_tester', name: 'Beta Tester', isAdminOnly: false },
    ]);
  }, []);

  const handleGiveBadge = async () => {
    if (!targetUsername) {
      setMessage('⚠️ Entrez un nom d\'utilisateur');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/badge/give`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetUsername, badgeCode })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ ${data.message}`);
        setTargetUsername('');
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (error) {
      console.error('Erreur badge:', error);
      setMessage('❌ Erreur serveur');
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
        <select value={badgeCode} onChange={(e) => setBadgeCode(e.target.value)}>
          {badges.map(badge => (
            <option 
              key={badge.code} 
              value={badge.code}
              disabled={badge.isAdminOnly && userRole !== 'admin' && userRole !== 'owner'}
            >
              {badge.name} {badge.isAdminOnly ? '(Admin)' : ''}
            </option>
          ))}
        </select>
      </div>

      <button 
        className="submit-btn"
        onClick={handleGiveBadge}
        disabled={loading}
      >
        {loading ? 'Traitement...' : 'Donner le badge'}
      </button>

      {message && <div className="message">{message}</div>}

      <div className="info-box">
        <h4>ℹ️ Permissions:</h4>
        <ul>
          <li><strong>Community Manager:</strong> Badges événements uniquement</li>
          <li><strong>Admin/Owner:</strong> Tous les badges</li>
        </ul>
      </div>
    </div>
  );
};

// ==================
// TAB ÉCONOMIE
// ==================

const EconomyTab: React.FC<{ userRole: string }> = ({ userRole }) => {
  const [targetUsername, setTargetUsername] = useState('');
  const [amount, setAmount] = useState('1000');
  const [currency, setCurrency] = useState<'coins' | 'nuggets'>('coins');
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
      const token = localStorage.getItem('token');
      const endpoint = currency === 'coins' ? '/api/admin/coins/give' : '/api/admin/nuggets/give';
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ targetUsername, amount: amountNum })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ ${data.message}`);
        setTargetUsername('');
        setAmount('1000');
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch (error) {
      console.error('Erreur économie:', error);
      setMessage('❌ Erreur serveur');
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
            className={currency === 'nuggets' ? 'active' : ''}
            onClick={() => setCurrency('nuggets')}
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
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  const loadLogs = async () => {
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      const url = filter === 'all' 
        ? `${import.meta.env.VITE_API_URL}/api/admin/logs`
        : `${import.meta.env.VITE_API_URL}/api/admin/logs?action=${filter}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setLogs(data);
      }
    } catch (error) {
      console.error('Erreur logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [filter]);

  return (
    <div className="logs-tab">
      <h3>Historique des actions</h3>
      
      <div className="filter-bar">
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">Toutes les actions</option>
          <option value="ban">Bans</option>
          <option value="mute">Mutes</option>
          <option value="warn">Warns</option>
          <option value="give_badge">Badges donnés</option>
          <option value="give_coins">Coins donnés</option>
        </select>
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
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setStats(data);
      }
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
          <div className="stat-label">Salles totales</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">🌐</div>
          <div className="stat-value">{stats.publicRooms}</div>
          <div className="stat-label">Salles publiques</div>
        </div>
      </div>

      <button className="refresh-btn" onClick={loadStats}>
        🔄 Actualiser
      </button>
    </div>
  );
};
