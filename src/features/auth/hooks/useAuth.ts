import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';

interface AuthState {
  session: Session | null;
  user: User | null;
  teamId: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

import { createContext as _createContext } from 'react';
export const AuthContext = _createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}

export function useAuthState(): AuthState & {
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
} {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch teamId from users table after login
  const fetchTeamId = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('team_id')
      .eq('id', userId)
      .single();
    if (data?.team_id) setTeamId(data.team_id as string);
  }, []);

  useEffect(() => {
    // Restore existing session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchTeamId(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchTeamId(s.user.id);
    });

    return () => subscription.unsubscribe();
  }, [fetchTeamId]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setTeamId(null);
  }, []);

  return { session, user, teamId, loading, signIn, signOut };
}
