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

export const useAuthStore = create<AuthState>((set) => {
  // Configurar listener imediatamente na instanciação do store
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      set({
        user: {
          id: session.user.id,
          email: session.user.email || '',
        },
        isAuthenticated: true,
        isLoading: false,
      });
      if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    } else {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  });

  return {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
    checkAuth: async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
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
          // Se não houver sessão ativa nem hash na URL, encerra o loading
          if (typeof window !== 'undefined' && !window.location.hash.includes('access_token')) {
            set({ user: null, isAuthenticated: false, isLoading: false });
          }
        }
      } catch (error) {
        console.error('Error in checkAuth:', error);
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    },
    signOut: async () => {
      await supabase.auth.signOut();
      set({ user: null, isAuthenticated: false, isLoading: false });
    },
  };
});
