import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/index';

interface AuthState {
  user: any | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setProfile: (profile: Profile) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  error: null,

  signUp: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        set({ user: data.user });
      }
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        set({ user: data.user });
      }
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null, profile: null });
    } catch (err: any) {
      set({ error: err.message });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  checkAuth: async () => {
    set({ loading: true });
    
    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log('Auth check timeout - forcing loading to false');
      set({ loading: false, user: null });
    }, 5000);
    
    try {
      const { data } = await supabase.auth.getSession();
      clearTimeout(timeout);
      
      if (data.session?.user) {
        set({ user: data.session.user });
      } else {
        set({ user: null });
      }
    } catch (err: any) {
      clearTimeout(timeout);
      console.error('Auth check error:', err);
      set({ error: err.message, user: null });
    } finally {
      clearTimeout(timeout);
      set({ loading: false });
    }
  },

  setProfile: (profile: Profile) => {
    set({ profile });
  },
}));
