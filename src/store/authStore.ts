// src/store/authStore.ts
import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  // Add other user properties as needed
}

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
