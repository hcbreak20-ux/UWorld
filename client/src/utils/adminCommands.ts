// adminCommands.ts
// Système de commandes admin pour le chat

export interface AdminCommand {
  name: string;
  aliases?: string[];
  description: string;
  usage: string;
  minRole: 'moderator' | 'community_manager' | 'admin' | 'owner';
  execute: (args: string[], userRole: string, socket: any) => Promise<string>;
}

/**
 * Parse une commande admin depuis le chat
 * @param message Le message du chat (ex: ":ban John123 1h spam")
 * @returns { command, args } ou null si ce n'est pas une commande
 */
export function parseAdminCommand(message: string): { command: string; args: string[] } | null {
  if (!message.startsWith(':')) {
    return null;
  }

  const parts = message.slice(1).trim().split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  return { command, args };
}

/**
 * Vérifier si l'utilisateur a le rôle minimum requis
 */
function hasRequiredRole(userRole: string, requiredRole: string): boolean {
  const roleHierarchy: Record<string, number> = {
    user: 0,
    vip: 1,
    room_designer: 2,
    community_manager: 2,
    moderator: 3,
    admin: 4,
    owner: 5
  };

  const userLevel = roleHierarchy[userRole] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;

  return userLevel >= requiredLevel;
}

/**
 * Liste des commandes admin disponibles
 */
export const adminCommands: Record<string, AdminCommand> = {
  
  // ==================
  // MODÉRATION
  // ==================
  
  ban: {
    name: 'ban',
    description: 'Bannir un joueur',
    usage: ':ban <username> <durée> <raison>',
    minRole: 'moderator',
    execute: async (args, userRole, socket) => {
      if (args.length < 3) {
        return '❌ Usage: :ban <username> <durée> <raison>\nExemple: :ban John123 1h spam répété';
      }

      const [targetUsername, duration, ...reasonParts] = args;
      const reason = reasonParts.join(' ');

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/ban`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ targetUsername, duration, reason })
        });

        const data = await response.json();

        if (response.ok) {
          return `✅ ${targetUsername} a été banni pour ${duration}. Raison: ${reason}`;
        } else {
          return `❌ ${data.error}`;
        }
      } catch (error) {
        return '❌ Erreur lors du bannissement';
      }
    }
  },

  unban: {
    name: 'unban',
    description: 'Débannir un joueur',
    usage: ':unban <username>',
    minRole: 'moderator',
    execute: async (args) => {
      if (args.length < 1) {
        return '❌ Usage: :unban <username>';
      }

      const targetUsername = args[0];

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/unban`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ targetUsername })
        });

        const data = await response.json();

        if (response.ok) {
          return `✅ ${targetUsername} a été débanni`;
        } else {
          return `❌ ${data.error}`;
        }
      } catch (error) {
        return '❌ Erreur lors du débannissement';
      }
    }
  },

  mute: {
    name: 'mute',
    description: 'Mute un joueur',
    usage: ':mute <username> <durée> <raison>',
    minRole: 'moderator',
    execute: async (args) => {
      if (args.length < 3) {
        return '❌ Usage: :mute <username> <durée> <raison>\nExemple: :mute Alice 30m langage inapproprié';
      }

      const [targetUsername, duration, ...reasonParts] = args;
      const reason = reasonParts.join(' ');

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/mute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ targetUsername, duration, reason })
        });

        const data = await response.json();

        if (response.ok) {
          return `✅ ${targetUsername} a été mute pour ${duration}`;
        } else {
          return `❌ ${data.error}`;
        }
      } catch (error) {
        return '❌ Erreur lors du mute';
      }
    }
  },

  unmute: {
    name: 'unmute',
    description: 'Unmute un joueur',
    usage: ':unmute <username>',
    minRole: 'moderator',
    execute: async (args) => {
      if (args.length < 1) {
        return '❌ Usage: :unmute <username>';
      }

      const targetUsername = args[0];

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/unmute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ targetUsername })
        });

        const data = await response.json();

        if (response.ok) {
          return `✅ ${targetUsername} peut à nouveau parler`;
        } else {
          return `❌ ${data.error}`;
        }
      } catch (error) {
        return '❌ Erreur lors du unmute';
      }
    }
  },

  warn: {
    name: 'warn',
    description: 'Avertir un joueur',
    usage: ':warn <username> <raison>',
    minRole: 'moderator',
    execute: async (args) => {
      if (args.length < 2) {
        return '❌ Usage: :warn <username> <raison>';
      }

      const [targetUsername, ...reasonParts] = args;
      const reason = reasonParts.join(' ');

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/warn`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ targetUsername, reason })
        });

        const data = await response.json();

        if (response.ok) {
          return `✅ ${targetUsername} a été averti (${data.warnings} avertissement${data.warnings > 1 ? 's' : ''})`;
        } else {
          return `❌ ${data.error}`;
        }
      } catch (error) {
        return '❌ Erreur lors de l\'avertissement';
      }
    }
  },

  kick: {
    name: 'kick',
    description: 'Expulser un joueur',
    usage: ':kick <username> <raison>',
    minRole: 'moderator',
    execute: async (args, userRole, socket) => {
      if (args.length < 2) {
        return '❌ Usage: :kick <username> <raison>';
      }

      const [targetUsername, ...reasonParts] = args;
      const reason = reasonParts.join(' ');

      // Kick via Socket.IO
      socket.emit('admin:kick', { targetUsername, reason });

      return `✅ Commande de kick envoyée pour ${targetUsername}`;
    }
  },

  // ==================
  // BADGES
  // ==================

  givebadge: {
    name: 'givebadge',
    aliases: ['badge'],
    description: 'Donner un badge',
    usage: ':givebadge <username> <badge_code>',
    minRole: 'community_manager',
    execute: async (args) => {
      if (args.length < 2) {
        return '❌ Usage: :givebadge <username> <badge_code>\nExemple: :givebadge Alice vip_2024';
      }

      const [targetUsername, badgeCode] = args;

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
          return `✅ Badge ${badgeCode} donné à ${targetUsername}`;
        } else {
          return `❌ ${data.error}`;
        }
      } catch (error) {
        return '❌ Erreur lors du don de badge';
      }
    }
  },

  // ==================
  // ÉCONOMIE
  // ==================

  givecoins: {
    name: 'givecoins',
    aliases: ['coins'],
    description: 'Donner des uCoins',
    usage: ':givecoins <username> <montant>',
    minRole: 'admin',
    execute: async (args) => {
      if (args.length < 2) {
        return '❌ Usage: :givecoins <username> <montant>';
      }

      const [targetUsername, amountStr] = args;
      const amount = parseInt(amountStr);

      if (isNaN(amount) || amount <= 0) {
        return '❌ Montant invalide';
      }

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/coins/give`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ targetUsername, amount })
        });

        const data = await response.json();

        if (response.ok) {
          return `✅ ${amount} uCoins donnés à ${targetUsername}`;
        } else {
          return `❌ ${data.error}`;
        }
      } catch (error) {
        return '❌ Erreur lors du don de coins';
      }
    }
  },

  givenuggets: {
    name: 'givenuggets',
    aliases: ['nuggets'],
    description: 'Donner des uNuggets',
    usage: ':givenuggets <username> <montant>',
    minRole: 'admin',
    execute: async (args) => {
      if (args.length < 2) {
        return '❌ Usage: :givenuggets <username> <montant>';
      }

      const [targetUsername, amountStr] = args;
      const amount = parseInt(amountStr);

      if (isNaN(amount) || amount <= 0) {
        return '❌ Montant invalide';
      }

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/nuggets/give`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ targetUsername, amount })
        });

        const data = await response.json();

        if (response.ok) {
          return `✅ ${amount} uNuggets donnés à ${targetUsername}`;
        } else {
          return `❌ ${data.error}`;
        }
      } catch (error) {
        return '❌ Erreur lors du don de nuggets';
      }
    }
  },

  // ==================
  // TÉLÉPORTATION
  // ==================

  teleport: {
    name: 'teleport',
    aliases: ['tp'],
    description: 'Se téléporter vers un joueur',
    usage: ':teleport <username>',
    minRole: 'moderator',
    execute: async (args, userRole, socket) => {
      if (args.length < 1) {
        return '❌ Usage: :teleport <username>';
      }

      const targetUsername = args[0];

      socket.emit('admin:teleport', { targetUsername });

      return `✅ Téléportation vers ${targetUsername}...`;
    }
  },

  summon: {
    name: 'summon',
    description: 'Invoquer un joueur',
    usage: ':summon <username>',
    minRole: 'moderator',
    execute: async (args, userRole, socket) => {
      if (args.length < 1) {
        return '❌ Usage: :summon <username>';
      }

      const targetUsername = args[0];

      socket.emit('admin:summon', { targetUsername });

      return `✅ Invocation de ${targetUsername}...`;
    }
  },

  // ==================
  // COMMUNICATION
  // ==================

  announce: {
    name: 'announce',
    aliases: ['alert'],
    description: 'Annonce globale',
    usage: ':announce <message>',
    minRole: 'community_manager',
    execute: async (args, userRole, socket) => {
      if (args.length < 1) {
        return '❌ Usage: :announce <message>';
      }

      const message = args.join(' ');

      socket.emit('admin:announce', { message });

      return `✅ Annonce envoyée: "${message}"`;
    }
  },

  // ==================
  // AIDE
  // ==================

  adminhelp: {
    name: 'adminhelp',
    aliases: ['ahelp', 'commands'],
    description: 'Liste des commandes admin',
    usage: ':adminhelp',
    minRole: 'moderator',
    execute: async (args, userRole) => {
      const availableCommands = Object.values(adminCommands)
        .filter(cmd => hasRequiredRole(userRole, cmd.minRole))
        .map(cmd => `• ${cmd.name}: ${cmd.description}`)
        .join('\n');

      return `📋 Commandes disponibles:\n${availableCommands}\n\nUtilise :adminhelp <commande> pour plus d'infos`;
    }
  }
};

/**
 * Exécuter une commande admin
 */
export async function executeAdminCommand(
  message: string,
  userRole: string,
  socket: any
): Promise<string | null> {
  const parsed = parseAdminCommand(message);
  
  if (!parsed) {
    return null;
  }

  const { command, args } = parsed;

  // Chercher la commande
  let cmd = adminCommands[command];

  // Chercher dans les alias
  if (!cmd) {
    cmd = Object.values(adminCommands).find(
      c => c.aliases && c.aliases.includes(command)
    ) || null;
  }

  if (!cmd) {
    return `❌ Commande inconnue: ${command}\nUtilise :adminhelp pour voir les commandes`;
  }

  // Vérifier les permissions
  if (!hasRequiredRole(userRole, cmd.minRole)) {
    return `❌ Permission refusée. Rôle ${cmd.minRole} requis`;
  }

  // Exécuter la commande
  try {
    return await cmd.execute(args, userRole, socket);
  } catch (error) {
    console.error('Erreur commande admin:', error);
    return '❌ Erreur lors de l\'exécution de la commande';
  }
}
