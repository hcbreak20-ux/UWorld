import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
    email: string;
    role: string;
  };
}

/**
 * Middleware d'authentification JWT
 */
export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Récupérer le token depuis le header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant' });
    }

    const token = authHeader.substring(7); // Enlever "Bearer "

    // Vérifier le token
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Ajouter les infos utilisateur à la requête
    req.user = {
      userId: decoded.userId,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role || 'user'
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
};

/**
 * Middleware optionnel (ne bloque pas si pas de token)
 */
export const optionalAuthMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      req.user = {
        userId: decoded.userId,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role || 'user'
      };
    }

    next();
  } catch (error) {
    // Token invalide mais on continue quand même
    next();
  }
};
