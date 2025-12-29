import React, { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { useStore } from '@/store';
import './MessagesPanel.css';

interface Conversation {
  userId: string;
  username: string;
  avatar: any;
  lastMessage: PrivateMessage;
  unreadCount: number;
}

interface PrivateMessage {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  read: boolean;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    avatar: any;
  };
  receiver: {
    id: string;
    username: string;
    avatar: any;
  };
}

interface MessagesPanelProps {
  onClose: () => void;
  initialUserId?: string; // Pour ouvrir directement une conversation
}

export const MessagesPanel: React.FC<MessagesPanelProps> = ({ onClose, initialUserId }) => {
  const { user } = useStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(initialUserId || null);
  const [selectedUsername, setSelectedUsername] = useState<string>('');
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // ✅ AJOUTER: Quand initialUserId change, mettre à jour selectedUserId
useEffect(() => {
  if (initialUserId) {
    setSelectedUserId(initialUserId);

    // On devra récupérer le username plus tard
  }
}, [initialUserId]);

  // Charger les conversations
  useEffect(() => {
    loadConversations();
  }, []);

  // Charger les messages d'une conversation
  useEffect(() => {
    if (selectedUserId) {
      loadMessages(selectedUserId);
    }
  }, [selectedUserId]);

  const loadConversations = async () => {
    try {
      const response = await api.get('/messages/conversations');
      setConversations(response.data);
    } catch (error) {
      console.error('Erreur chargement conversations:', error);
    }
  };

  const loadMessages = async (otherUserId: string) => {
    try {
      const response = await api.get(`/messages/${otherUserId}`);
      setMessages(response.data);
      
      // Rafraîchir les conversations pour mettre à jour les non lus
      loadConversations();
    } catch (error) {
      console.error('Erreur chargement messages:', error);
    }
  };

const sendMessage = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!newMessage.trim() || !selectedUserId || loading) return;
  
  setLoading(true);
  
  try {
    console.log('📤 Envoi message à:', selectedUserId); // ✅ DEBUG
    
    const response = await api.post('/messages/send', {
      receiverId: selectedUserId,
      content: newMessage.trim()
    });
    
    setMessages([...messages, response.data]);
    setNewMessage('');
    loadConversations();
  } catch (error: any) {
    console.error('Erreur envoi message:', error);
    console.error('userId:', selectedUserId); // ✅ DEBUG
    alert(error.response?.data?.error || 'Erreur envoi message');
  } finally {
    setLoading(false);
  }
};

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const selectedConversation = conversations.find(c => c.userId === selectedUserId);

  return (
    <div className="messages-panel-overlay" onClick={onClose}>
      <div className="messages-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="messages-header">
          <h3>💬 Messages</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="messages-content">
          {/* Liste des conversations */}
          <div className="conversations-list">
            <h4>Conversations</h4>
            {conversations.length === 0 ? (
              <div className="no-conversations">
                <p>📭 Aucune conversation</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.userId}
                  className={`conversation-item ${selectedUserId === conv.userId ? 'active' : ''}`}
                  onClick={() => setSelectedUserId(conv.userId)}
                >
                  <div className="conversation-avatar">
                    {conv.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="conversation-info">
                    <div className="conversation-username">{conv.username}</div>
                    <div className="conversation-preview">
                      {conv.lastMessage.content.substring(0, 30)}...
                    </div>
                  </div>
                  {conv.unreadCount > 0 && (
                    <div className="unread-badge">{conv.unreadCount}</div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Zone de messages */}
          <div className="messages-area">
            {!selectedUserId ? (
              <div className="no-selection">
                <p>👈 Sélectionnez une conversation</p>
              </div>
            ) : (
              <>
                {/* Header conversation */}
                <div className="conversation-header">
                  <div className="conversation-user">
                    <div className="user-avatar">
                      {selectedConversation?.username.charAt(0).toUpperCase()}
                    </div>
                    <span>{selectedConversation?.username}</span>
                  </div>
                </div>

                {/* Messages */}
                <div className="messages-list">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`message-item ${msg.senderId === user?.id ? 'sent' : 'received'}`}
                    >
                      <div className="message-bubble">
                        <div className="message-content">{msg.content}</div>
                        <div className="message-time">{formatTime(msg.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input */}
                <form className="message-input" onSubmit={sendMessage}>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Écrivez un message..."
                    maxLength={500}
                    disabled={loading}
                  />
                  <button type="submit" disabled={!newMessage.trim() || loading}>
                    Envoyer
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
