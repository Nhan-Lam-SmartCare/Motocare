import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../shared/supabaseClient';

export type UserRole = "owner" | "manager" | "staff";

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  full_name?: string;
  avatar_url?: string;
  branch_id?: string | null;
  created_at: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (allowedRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch profile when user changes
  useEffect(() => {
    async function getProfile(userId: string) {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          setProfile(null);
        } else {
          setProfile(data as UserProfile);
        }
      } catch (err) {
        console.error('Unexpected error fetching profile:', err);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      getProfile(user.id);
    } else {
      setProfile(null);
      if (!session) {
          setLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (!initialSession) {
          setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (!newSession) setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setLoading(false);
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const hasRole = (allowedRoles: UserRole[]) => {
    if (!profile?.role) return false;
    return allowedRoles.includes(profile.role);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signIn, signOut, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');        
  return ctx;
}
