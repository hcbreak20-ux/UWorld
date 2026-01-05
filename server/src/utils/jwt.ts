import jwt from 'jsonwebtoken';
import { config } from './config';

export interface JWTPayload {
  userId: string;
  username: string;
  role?: string;  // ← AJOUTER: Support du rôle
}

export const generateToken = (payload: JWTPayload): string => {
  // @ts-expect-error - JWT types mismatch
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
};

export const verifyToken = (token: string): JWTPayload => {
  try {
    return jwt.verify(token, config.jwtSecret) as JWTPayload;
  } catch (error) {
    throw new Error('Token invalide');
  }
};
