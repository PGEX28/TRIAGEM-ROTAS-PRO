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

// Tenta restaurar sessão síncrona se disponível no localStorage
const getStoredUser = (): User | null => {
  try {
    const raw = localStorage.getItem('sb-rfmneqarwmlestzszwwv-auth-token');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.user) {
        return {
          id: parsed.user.id,
          email: parsed.user.email || '',
        };
      }
    }
  } catch {}
  return null;
};

const initialUser = getStoredUser();

export const useAuthStore = create<AuthState>((set) => {
  // Listener do Supabase para capturar redirecionamento do Google OAuth instantaneamente
  supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) {
      set({
        user: {
          id: session.user.id,
          email: session.user.email || '',
        },
        isAuthenticated: true,
        isLoading: false,
      });
      // Limpa os parâmetros de hash da URL
      if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    } else if (event === 'SIGNED_OUT') {
      set({ user: null, isAuthenticated: false, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  });

  return {
    user: initialUser,
    isAuthenticated: !!initialUser,
    isLoading: !initialUser && typeof window !== 'undefined' && window.location.hash.includes('access_token'),
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
          set({ user: null, isAuthenticated: false, isLoading: false });
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
