import { create } from 'zustand';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  organization_id?: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  checkAuth: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  checkAuth: async () => {
    try {
      set({ isLoading: true });

      // 1. Check current session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
      }

      if (session?.user) {
        set({
          user: {
            id: session.user.id,
            email: session.user.email || '',
          },
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }

      // 2. Listen for auth changes (including OAuth hash redirect callback)
      supabase.auth.onAuthStateChange((event, newSession) => {
        if (newSession?.user) {
          set({
            user: {
              id: newSession.user.id,
              email: newSession.user.email || '',
            },
            isAuthenticated: true,
            isLoading: false,
          });
          // Clean hash from URL if present
          if (window.location.hash.includes('access_token')) {
            window.history.replaceState(null, '', window.location.pathname);
          }
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      });
    } catch (error) {
      console.error('Error in checkAuth:', error);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, isAuthenticated: false });
  },
}));
