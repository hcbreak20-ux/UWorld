export interface User {
  id: string;
  username: string;
  email: string;
  coins: number;
  gems: number;
  level: number;
  experience: number;
  motto: string;
  avatar: Avatar;
  createdAt: string;
  lastLogin: string;
}

export interface Avatar {
  body: string;
  hair: string;
  clothes: string;
  colors: {
    skin: string;
    hair: string;
  };
}

export interface Room {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  isPublic: boolean;
  maxUsers: number;
  password?: string;
  layout: string;
  furnitures: Furniture[];
  wallpaper: string;
  floor: string;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    username: string;
    avatar: Avatar;
  };
}

export interface Furniture {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
}

export interface Message {
  id: string;
  content: string;
  user: {
    id: string;
    username: string;
    avatar: Avatar;
    level: number;
  };
  createdAt: string;
}

export interface PlayerPosition {
  x: number;
  y: number;
  direction: 'up' | 'down' | 'left' | 'right';
}

export interface Player {
  userId: string;
  username: string;
  position: PlayerPosition;
  avatar: Avatar;
}

export interface AuthResponse {
  user: User;
  token: string;
}
