import { create } from 'zustand';
import type { User, Room, Player, Message } from '@/types';

export interface PlacedFurniture {
  id: string;
  furnitureType: string;
  name: string;
  icon: string;
  x: number;
  y: number;
  rotation: number; // 0, 90, 180, 270
}

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  updateUser: (updates: Partial<User>) => void;
  setToken: (token: string | null) => void;
  logout: () => void;

  // Current Room
  currentRoom: Room | null;
  players: Record<string, Player>;
  messages: Message[];
  setCurrentRoom: (room: Room | null) => void;
  addPlayer: (userId: string, player: Player) => void;
  removePlayer: (userId: string) => void;
  updatePlayerPosition: (userId: string, position: Player['position']) => void;
  addMessage: (message: Message) => void;
  clearRoomData: () => void;

  // Furniture Management
  placedFurniture: PlacedFurniture[];
  placementMode: {
    active: boolean;
    furnitureType: string | null;
    furnitureName: string | null;
    furnitureIcon: string | null;
  };
  setPlacedFurniture: (furniture: PlacedFurniture[]) => void;
  addPlacedFurniture: (furniture: PlacedFurniture) => void;
  removePlacedFurniture: (id: string) => void;
  updateFurnitureRotation: (id: string, rotation: number) => void;
  setPlacementMode: (active: boolean, type?: string, name?: string, icon?: string) => void;

  // UI
  showChat: boolean;
  toggleChat: () => void;
  chatInputFocused: boolean;
  setChatInputFocused: (focused: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  // Auth
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  updateUser: (updates) => set((state) => ({
    user: state.user ? { ...state.user, ...updates } : null,
  })),
  
  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
    set({ token, isAuthenticated: !!token });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ 
      user: null, 
      token: null, 
      isAuthenticated: false,
      currentRoom: null,
      players: {},
      messages: [],
      placedFurniture: [],
    });
  },

  // Current Room
  currentRoom: null,
  players: {},
  messages: [],

  setCurrentRoom: (room) => set({ currentRoom: room }),

  addPlayer: (userId, player) =>
    set((state) => ({
      players: { ...state.players, [userId]: player },
    })),

  removePlayer: (userId) =>
    set((state) => {
      const newPlayers = { ...state.players };
      delete newPlayers[userId];
      return { players: newPlayers };
    }),

  updatePlayerPosition: (userId, position) =>
    set((state) => ({
      players: {
        ...state.players,
        [userId]: {
          ...state.players[userId],
          position,
        },
      },
    })),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  clearRoomData: () =>
    set({
      currentRoom: null,
      players: {},
      messages: [],
      placedFurniture: [],
    }),

  // Furniture Management
  placedFurniture: [],
  placementMode: {
    active: false,
    furnitureType: null,
    furnitureName: null,
    furnitureIcon: null,
  },

  setPlacedFurniture: (furniture) => set({ placedFurniture: furniture }),

  addPlacedFurniture: (furniture) =>
    set((state) => ({
      placedFurniture: [...state.placedFurniture, furniture],
    })),

  removePlacedFurniture: (id) =>
    set((state) => ({
      placedFurniture: state.placedFurniture.filter((f) => f.id !== id),
    })),

  updateFurnitureRotation: (id, rotation) =>
    set((state) => ({
      placedFurniture: state.placedFurniture.map((f) =>
        f.id === id ? { ...f, rotation } : f
      ),
    })),

  setPlacementMode: (active, type, name, icon) =>
    set({
      placementMode: {
        active,
        furnitureType: type || null,
        furnitureName: name || null,
        furnitureIcon: icon || null,
      },
    }),

  // UI
  showChat: true,
  toggleChat: () => set((state) => ({ showChat: !state.showChat })),
  chatInputFocused: false,
  setChatInputFocused: (focused) => set({ chatInputFocused: focused }),
}));
