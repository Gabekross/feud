'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

export type UserProfile = {
  id: string;
  email: string | null;
  role: 'admin' | 'host';
};

export default function useAuthProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async (nextUser: User | null) => {
      if (!mounted) return;
      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('id', nextUser.id)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        console.error('Load profile failed:', error.message);
        setProfile(null);
      } else {
        setProfile((data as UserProfile | null) ?? null);
      }

      setLoading(false);
    };

    supabase.auth.getUser().then(({ data }) => {
      void loadProfile(data.user);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoading(true);
      void loadProfile(session?.user ?? null);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    isHost: profile?.role === 'host',
    signOut,
  };
}
