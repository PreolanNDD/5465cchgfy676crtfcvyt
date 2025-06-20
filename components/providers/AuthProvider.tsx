'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userProfile: any | null;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      console.log('AuthProvider: Fetching user profile for:', userId);
      const supabase = createClient();
      const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
      
      if (error) {
        // Check if it's the specific "no rows returned" error
        if (error.code === 'PGRST116') {
          console.log('AuthProvider: User profile not found, returning null');
          return null;
        }
        throw error;
      }
      
      console.log('AuthProvider: User profile fetched successfully.');
      return data;
    } catch (error) {
      console.error('AuthProvider: Error fetching user profile:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    console.log("AuthProvider: Main useEffect starting up (should run only once).");

    const supabase = createClient();

    // We rely solely on onAuthStateChange as the single source of truth.
    // It fires with the initial session ('INITIAL_SESSION') right away.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`AuthProvider: Auth event received: ${event}`, session ? 'with session.' : 'without session.');

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // This will run on INITIAL_SESSION and SIGNED_IN
          // We can add a check to prevent re-fetching if the profile already exists for this user
          if (!userProfile || userProfile.id !== session.user.id) {
            console.log("AuthProvider: Fetching profile for new or changed user...");
            const profile = await fetchUserProfile(session.user.id);
            setUserProfile(profile);
          }
        } else {
          // This will run on SIGNED_OUT or if the initial session is null
          setUserProfile(null);
        }
        
        // The initial loading is finished after the first event is handled.
        setLoading(false);

        if (event === 'PASSWORD_RECOVERY') {
          console.log("AuthProvider: Password recovery detected, redirecting...");
          router.push('/update-password');
        }
      }
    );

    return () => {
      console.log("AuthProvider: Cleaning up auth subscription.");
      subscription?.unsubscribe();
    };
  }, [fetchUserProfile, router, userProfile]); // Dependencies are stable or controlled

  
  const refreshUserProfile = useCallback(async () => {
    if (user) {
      console.log('AuthProvider: Refreshing user profile.');
      const profile = await fetchUserProfile(user.id);
      setUserProfile(profile);
    }
  }, [user, fetchUserProfile]);


  const value = useMemo(() => ({
    user,
    session,
    loading,
    userProfile,
    refreshUserProfile,
  }), [user, session, loading, userProfile, refreshUserProfile]);

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-secondary-text">Loading...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}