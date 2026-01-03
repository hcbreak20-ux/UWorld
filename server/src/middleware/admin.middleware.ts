import { Request, Response, NextFunction } from 'express';

// Énumération des rôles
export enum UserRole {
  USER = 'user',
  VIP = 'vip',
  ROOM_DESIGNER = 'room_designer',
  COMMUNITY_MANAGER = 'community_manager',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
  OWNER = 'owner'
}

// Hiérarchie des rôles (plus élevé = plus de pouvoir)
const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.USER]: 0,
  [UserRole.VIP]: 1,
  [UserRole.ROOM_DESIGNER]: 2,
  [UserRole.COMMUNITY_MANAGER]: 2,
  [UserRole.MODERATOR]: 3,
  [UserRole.ADMIN]: 4,
  [UserRole.OWNER]: 5
};

// Permissions par rôle
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.USER]: [],
  
  [UserRole.VIP]: [
    'use_vip_commands'
  ],
  
  [UserRole.ROOM_DESIGNER]: [
    'edit_public_rooms',
    'create_public_rooms',
    'change_room_colors',
    'add_room_furniture'
  ],
  
  [UserRole.COMMUNITY_MANAGER]: [
    'give_event_badges',
    'create_events',
    'send_announcements',
    'view_stats'
  ],
  
  [UserRole.MODERATOR]: [
    'ban_temporary',      // Max 7 jours
    'unban',
    'mute_temporary',     // Max 24h
    'unmute',
    'kick',
    'warn',
    'alert_user',
    'view_user_info',
    'view_chat_history',
    'teleport',
    'summon',
    'freeze',
    'lock_room',
    'clear_room',
    'view_reports',
    'invisible_mode'
  ],
  
  [UserRole.ADMIN]: [
    // Toutes les permissions Moderator
    ...['ban_temporary', 'unban', 'mute_temporary', 'unmute', 'kick', 'warn', 
        'alert_user', 'view_user_info', 'view_chat_history', 'teleport', 
        'summon', 'freeze', 'lock_room', 'clear_room', 'view_reports', 'invisible_mode'],
    
    // Permissions supplémentaires
    'ban_permanent',
    'mute_permanent',
    'give_any_badge',
    'remove_badge',
    'create_badge',
    'give_coins',
    'give_nuggets',
    'edit_public_rooms',
    'delete_public_rooms',
    'view_all_logs',
    'send_announcements'
  ],
  
  [UserRole.OWNER]: [
    'ALL' // Accès complet
  ]
};

/**
 * Vérifie si un rôle a une permission spécifique
 */
export function hasPermission(role: UserRole, permission: string): boolean {
  // Owner a toutes les permissions
  if (role === UserRole.OWNER) {
    return true;
  }
  
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

/**
 * Vérifie si un rôle est supérieur ou égal à un autre
 */
export function isRoleHigherOrEqual(userRole: UserRole, requiredRole: UserRole): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
}

/**
 * Middleware pour vérifier le rôle minimum requis
 */
export function requireRole(minRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Non authentifié',
        message: 'Vous devez être connecté pour accéder à cette ressource'
      });
    }
    
    const userRole = user.role as UserRole;
    
    if (!isRoleHigherOrEqual(userRole, minRole)) {
      return res.status(403).json({ 
        error: 'Permissions insuffisantes',
        required: minRole,
        current: userRole,
        message: `Rôle ${minRole} requis, vous avez ${userRole}`
      });
    }
    
    next();
  };
}

/**
 * Middleware pour vérifier une permission spécifique
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({ 
        error: 'Non authentifié',
        message: 'Vous devez être connecté'
      });
    }
    
    const userRole = user.role as UserRole;
    
    if (!hasPermission(userRole, permission)) {
      return res.status(403).json({ 
        error: 'Permission refusée',
        required: permission,
        role: userRole,
        message: `Vous n'avez pas la permission: ${permission}`
      });
    }
    
    next();
  };
}

// Middlewares pratiques
export const isAdmin = requireRole(UserRole.ADMIN);
export const isModerator = requireRole(UserRole.MODERATOR);
export const isCommunityManager = requireRole(UserRole.COMMUNITY_MANAGER);
export const isRoomDesigner = requireRole(UserRole.ROOM_DESIGNER);
export const isOwner = requireRole(UserRole.OWNER);

/**
 * Vérifie si l'admin peut agir sur la cible (hiérarchie)
 */
export function canActOnTarget(adminRole: UserRole, targetRole: UserRole): boolean {
  const adminLevel = ROLE_HIERARCHY[adminRole] || 0;
  const targetLevel = ROLE_HIERARCHY[targetRole] || 0;
  
  // Un admin ne peut pas agir sur quelqu'un de rang égal ou supérieur
  return adminLevel > targetLevel;
}

/**
 * Valide la durée d'un ban/mute selon le rôle
 */
export function validateDuration(role: UserRole, duration: string): { valid: boolean; error?: string } {
  // Owner et Admin peuvent tout faire
  if (role === UserRole.OWNER || role === UserRole.ADMIN) {
    return { valid: true };
  }
  
  // Moderator: max 7 jours pour ban, 24h pour mute
  if (role === UserRole.MODERATOR) {
    if (duration === 'permanent') {
      return { 
        valid: false, 
        error: 'Les modérateurs ne peuvent pas bannir/mute de façon permanente' 
      };
    }
    
    const durationMs = parseDuration(duration);
    const maxBanDuration = 7 * 24 * 60 * 60 * 1000; // 7 jours
    
    if (durationMs > maxBanDuration) {
      return { 
        valid: false, 
        error: 'Les modérateurs peuvent bannir maximum 7 jours' 
      };
    }
  }
  
  return { valid: true };
}

/**
 * Parse une durée (ex: "1h", "7d", "30m") en millisecondes
 */
export function parseDuration(duration: string): number {
  if (duration === 'permanent') {
    return Infinity;
  }
  
  const match = duration.match(/^(\d+)([mhdw])$/);
  if (!match) {
    return 0;
  }
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  const multipliers: Record<string, number> = {
    'm': 60 * 1000,                    // minutes
    'h': 60 * 60 * 1000,               // heures
    'd': 24 * 60 * 60 * 1000,          // jours
    'w': 7 * 24 * 60 * 60 * 1000       // semaines
  };
  
  return value * (multipliers[unit] || 0);
}

/**
 * Formate une durée en texte lisible
 */
export function formatDuration(ms: number): string {
  if (ms === Infinity) {
    return 'permanent';
  }
  
  const minutes = Math.floor(ms / (60 * 1000));
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const weeks = Math.floor(ms / (7 * 24 * 60 * 60 * 1000));
  
  if (weeks > 0) return `${weeks}w`;
  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return '0m';
}
