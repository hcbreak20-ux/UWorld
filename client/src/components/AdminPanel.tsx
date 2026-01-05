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
      setMessage(`✅ ${result.message}`); // ✅ CORRIGÉ
      setTargetUsername('');
    } catch (error: any) {
      console.error('Erreur badge:', error);
      setMessage(`❌ ${error.response?.data?.error || 'Erreur serveur'}`); // ✅ CORRIGÉ
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
          <select 
            value={badgeKey} 
            onChange={(e) => setBadgeKey(e.target.value)}
            style={{
              backgroundColor: '#1a1a2e',
              color: '#ffffff',
              border: '2px solid #6366f1',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '14px',
              width: '100%',
              cursor: 'pointer',
            }}
          >
            {badges.map((badge) => (
              <option 
                key={badge.key} 
                value={badge.key}
                style={{
                  backgroundColor: '#252541',
                  color: '#ffffff',
                }}
              >
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
// TAB LOGS - VERSION AMÉLIORÉE
// ==================

const LogsTab: React.FC<{ userRole: string }> = ({ userRole }) => {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLogs, setSelectedLogs] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    
    try {
      const data = await adminService.getLogs(100); // Augmenté à 100
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

  const handleDeleteLog = async (logId: string) => {
    if (!confirm('Supprimer ce log?')) return;

    try {
      // Appel API pour supprimer un log
      await adminService.deleteLog(logId);
      setLogs(logs.filter((log) => log.id !== logId));
    } catch (error) {
      console.error('Erreur suppression log:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedLogs.size === 0) {
      alert('Aucun log sélectionné');
      return;
    }

    if (!confirm(`Supprimer ${selectedLogs.size} log(s)?`)) return;

    try {
      // Appel API pour supprimer plusieurs logs
      await adminService.deleteLogs(Array.from(selectedLogs));
      setLogs(logs.filter((log) => !selectedLogs.has(log.id)));
      setSelectedLogs(new Set());
      setSelectAll(false);
    } catch (error) {
      console.error('Erreur suppression logs:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedLogs(new Set());
    } else {
      setSelectedLogs(new Set(logs.map((log) => log.id)));
    }
    setSelectAll(!selectAll);
  };

  const toggleLogSelection = (logId: string) => {
    const newSelected = new Set(selectedLogs);
    if (newSelected.has(logId)) {
      newSelected.delete(logId);
    } else {
      newSelected.add(logId);
    }
    setSelectedLogs(newSelected);
  };

  const getActionColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'WARN': return '#ffd700';
      case 'MUTE': return '#ff9800';
      case 'UNMUTE': return '#4caf50';
      case 'KICK': return '#ff6b6b';
      case 'BAN': return '#c70039';
      case 'UNBAN': return '#4caf50';
      default: return '#888';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action.toUpperCase()) {
      case 'WARN': return '⚠️';
      case 'MUTE': return '🔇';
      case 'UNMUTE': return '🔊';
      case 'KICK': return '👢';
      case 'BAN': return '🚫';
      case 'UNBAN': return '✅';
      default: return '📋';
    }
  };

  return (
    <div className="logs-tab">
      {/* Header avec actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Historique des actions</h3>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Checkbox Select All */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={selectAll}
              onChange={handleSelectAll}
              style={{ cursor: 'pointer' }}
            />
            Tout sélectionner
          </label>

          {/* Bouton Supprimer la sélection */}
          <button 
            onClick={handleDeleteSelected}
            disabled={selectedLogs.size === 0}
            style={{
              backgroundColor: selectedLogs.size > 0 ? '#ff6b6b' : '#555',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: selectedLogs.size > 0 ? 'pointer' : 'not-allowed',
              fontSize: '14px',
            }}
          >
            🗑️ Supprimer ({selectedLogs.size})
          </button>

          {/* Bouton Actualiser */}
          <button onClick={loadLogs} className="refresh-btn">
            🔄 Actualiser
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Chargement...</div>
      ) : (
        <div className="logs-list">
          {logs.length === 0 ? (
            <div className="no-logs">Aucun log</div>
          ) : (
            logs.map(log => (
              <div 
                key={log.id} 
                className="log-item"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  borderLeft: `4px solid ${getActionColor(log.action)}`
                }}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={selectedLogs.has(log.id)}
                  onChange={() => toggleLogSelection(log.id)}
                  style={{ cursor: 'pointer' }}
                />

                {/* Icon */}
                <span style={{ fontSize: '20px' }}>{getActionIcon(log.action)}</span>

                {/* Contenu */}
                <div style={{ flex: 1 }}>
                  <div className="log-header">
                    <span 
                      className="action-badge"
                      style={{ color: getActionColor(log.action) }}
                    >
                      {log.action}
                    </span>
                    <span className="log-date">
                      {new Date(log.createdAt).toLocaleString('fr-FR')}
                    </span>
                  </div>
                  <div className="log-details">
                    <strong>{log.admin.username}</strong> → {log.targetUser?.username || 'N/A'}
                  </div>
                  {log.reason && (
                    <div className="log-reason">Raison: {log.reason}</div>
                  )}
                </div>

                {/* Bouton X pour supprimer */}
                <button
                  onClick={() => handleDeleteLog(log.id)}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#ff6b6b',
                    border: '2px solid #ff6b6b',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: 'bold',
                  }}
                  title="Supprimer ce log"
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};


// ==================
// TAB STATS - VERSION AMÉLIORÉE
// ==================

const StatsTab: React.FC<{ userRole: string }> = ({ userRole }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'overview' | 'users' | 'banned' | 'muted' | 'rooms'>('overview');
  const [detailsData, setDetailsData] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

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

  const loadUsersList = async () => {
    setLoadingDetails(true);
    try {
      const users = await adminService.getUsers(); // Appel API
      setDetailsData(users);
      setViewMode('users');
    } catch (error) {
      console.error('Erreur chargement utilisateurs:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const loadBannedUsers = async () => {
    setLoadingDetails(true);
    try {
      const banned = await adminService.getBannedUsers(); // Appel API
      setDetailsData(banned);
      setViewMode('banned');
    } catch (error) {
      console.error('Erreur chargement bannis:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const loadMutedUsers = async () => {
    setLoadingDetails(true);
    try {
      const muted = await adminService.getMutedUsers(); // Appel API
      setDetailsData(muted);
      setViewMode('muted');
    } catch (error) {
      console.error('Erreur chargement mutes:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const loadRooms = async () => {
    setLoadingDetails(true);
    try {
      const rooms = await adminService.getRooms(); // Appel API
      setDetailsData(rooms);
      setViewMode('rooms');
    } catch (error) {
      console.error('Erreur chargement salles:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  if (loading || !stats) {
    return <div className="loading">Chargement des statistiques...</div>;
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return '#ff1744';
      case 'admin': return '#ff9800';
      case 'moderator': return '#2196f3';
      case 'community_manager': return '#9c27b0';
      case 'room_designer': return '#4caf50';
      case 'vip': return '#ffd700';
      default: return '#888';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return '👑';
      case 'admin': return '⚡';
      case 'moderator': return '🛡️';
      case 'community_manager': return '🎭';
      case 'room_designer': return '🏗️';
      case 'vip': return '💎';
      default: return '👤';
    }
  };

  // Vue d'ensemble (carrés cliquables)
  if (viewMode === 'overview') {
    return (
      <div className="stats-tab">
        <h3>Statistiques du serveur</h3>
        
        <div className="stats-grid">
          {/* Utilisateurs - CLIQUABLE */}
          <div 
            className="stat-card clickable"
            onClick={loadUsersList}
            style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div className="stat-icon">👥</div>
            <div className="stat-value">{stats.totalUsers}</div>
            <div className="stat-label">Utilisateurs</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🟢</div>
            <div className="stat-value">{stats.onlineUsers}</div>
            <div className="stat-label">En ligne</div>
          </div>
          
          {/* Bannis - CLIQUABLE */}
          <div 
            className="stat-card clickable"
            onClick={loadBannedUsers}
            style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div className="stat-icon">🚫</div>
            <div className="stat-value">{stats.bannedUsers}</div>
            <div className="stat-label">Bannis</div>
          </div>
          
          {/* Mutes - CLIQUABLE */}
          <div 
            className="stat-card clickable"
            onClick={loadMutedUsers}
            style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div className="stat-icon">🔇</div>
            <div className="stat-value">{stats.mutedUsers}</div>
            <div className="stat-label">Mutes</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🏅</div>
            <div className="stat-value">{stats.totalBadges}</div>
            <div className="stat-label">Badges</div>
          </div>
          
          {/* Salles - CLIQUABLE */}
          <div 
            className="stat-card clickable"
            onClick={loadRooms}
            style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
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
  }

  // Vue détails avec bouton retour
  return (
    <div className="stats-tab">
      <button 
        onClick={() => setViewMode('overview')}
        style={{
          backgroundColor: '#6366f1',
          color: '#fff',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '6px',
          cursor: 'pointer',
          marginBottom: '16px',
        }}
      >
        ← Retour
      </button>

      {loadingDetails ? (
        <div className="loading">Chargement...</div>
      ) : (
        <>
          {viewMode === 'users' && detailsData && (
            <>
              <h3>Liste des utilisateurs ({detailsData.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {detailsData.map((user: any) => (
                  <div 
                    key={user.id}
                    style={{
                      backgroundColor: '#252541',
                      borderRadius: '8px',
                      padding: '16px',
                      borderLeft: `4px solid ${getRoleColor(user.role)}`,
                    }}
                  >
                    <div style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>
                      {getRoleIcon(user.role)} {user.username}
                    </div>
                    <div style={{ color: '#aaa', fontSize: '13px' }}>
                      {user.email} • Niveau {user.level} • {user.role}
                    </div>
                    <div style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>
                      💰 {user.coins} coins • 💎 {user.gems} gems
                      {user.warnings > 0 && ` • ⚠️ ${user.warnings} warning(s)`}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {viewMode === 'banned' && detailsData && (
            <>
              <h3>Joueurs bannis ({detailsData.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {detailsData.map((user: any) => (
                  <div 
                    key={user.id}
                    style={{
                      backgroundColor: '#252541',
                      borderRadius: '8px',
                      padding: '16px',
                      borderLeft: '4px solid #c70039',
                    }}
                  >
                    <div style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>
                      🚫 {user.username}
                    </div>
                    <div style={{ color: '#aaa', fontSize: '13px' }}>
                      {user.email}
                    </div>
                    <div style={{ color: '#ff6b6b', fontSize: '13px', marginTop: '4px' }}>
                      Raison: {user.banReason || 'Aucune raison'}
                    </div>
                    {user.banExpiresAt && (
                      <div style={{ color: '#888', fontSize: '12px' }}>
                        Expire le {new Date(user.banExpiresAt).toLocaleString('fr-FR')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {viewMode === 'muted' && detailsData && (
            <>
              <h3>Joueurs mute ({detailsData.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {detailsData.map((user: any) => (
                  <div 
                    key={user.id}
                    style={{
                      backgroundColor: '#252541',
                      borderRadius: '8px',
                      padding: '16px',
                      borderLeft: '4px solid #ff9800',
                    }}
                  >
                    <div style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>
                      🔇 {user.username}
                    </div>
                    <div style={{ color: '#aaa', fontSize: '13px' }}>
                      {user.email}
                    </div>
                    <div style={{ color: '#ff9800', fontSize: '13px', marginTop: '4px' }}>
                      Raison: {user.muteReason || 'Aucune raison'}
                    </div>
                    {user.muteExpiresAt && (
                      <div style={{ color: '#888', fontSize: '12px' }}>
                        Expire le {new Date(user.muteExpiresAt).toLocaleString('fr-FR')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {viewMode === 'rooms' && detailsData && (
            <>
              <h3>Liste des salles ({detailsData.length})</h3>
              
              <h4 style={{ color: '#10b981', marginTop: '20px', marginBottom: '12px' }}>
                🌐 Salles publiques ({detailsData.filter((r: any) => !r.isPrivate).length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                {detailsData.filter((room: any) => !room.isPrivate).map((room: any) => (
                  <div 
                    key={room.id}
                    style={{
                      backgroundColor: '#252541',
                      borderRadius: '8px',
                      padding: '16px',
                      borderLeft: '4px solid #10b981',
                    }}
                  >
                    <div style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>
                      {room.name}
                    </div>
                    <div style={{ color: '#aaa', fontSize: '13px' }}>
                      Propriétaire: {room.owner?.username || 'N/A'} • Max: {room.maxPlayers} joueurs
                    </div>
                  </div>
                ))}
              </div>

              <h4 style={{ color: '#6366f1', marginBottom: '12px' }}>
                🔒 Salles privées ({detailsData.filter((r: any) => r.isPrivate).length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {detailsData.filter((room: any) => room.isPrivate).map((room: any) => (
                  <div 
                    key={room.id}
                    style={{
                      backgroundColor: '#252541',
                      borderRadius: '8px',
                      padding: '16px',
                      borderLeft: '4px solid #6366f1',
                    }}
                  >
                    <div style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>
                      🔒 {room.name}
                    </div>
                    <div style={{ color: '#aaa', fontSize: '13px' }}>
                      Propriétaire: {room.owner?.username || 'N/A'} • Max: {room.maxPlayers} joueurs
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
