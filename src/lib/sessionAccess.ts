import { supabase } from '@/lib/supabaseClient';
import type { UserProfile } from '@/hooks/useAuthProfile';

export type AccessSurface = 'operator' | 'screen' | 'audio' | 'cards';

export type SessionAccessTokens = {
  operator_token: string;
  screen_token: string;
  audio_token: string;
  cards_token: string;
};

type SessionAccessRow = {
  owner_user_id: string | null;
  operator_token: string | null;
  screen_token: string | null;
  audio_token: string | null;
  cards_token: string | null;
};

const tokenColumn: Record<AccessSurface, keyof SessionAccessTokens> = {
  operator: 'operator_token',
  screen: 'screen_token',
  audio: 'audio_token',
  cards: 'cards_token',
};

export const createSessionAccessTokens = (): SessionAccessTokens => ({
  operator_token: crypto.randomUUID().replace(/-/g, ''),
  screen_token: crypto.randomUUID().replace(/-/g, ''),
  audio_token: crypto.randomUUID().replace(/-/g, ''),
  cards_token: crypto.randomUUID().replace(/-/g, ''),
});

export const buildSessionLink = (
  path: string,
  sessionId: string,
  surface: AccessSurface,
  token?: string | null
) => {
  const params = new URLSearchParams({ sessionId });
  if (token) {
    params.set('access', surface);
    params.set('token', token);
  }
  return `${path}?${params.toString()}`;
};

export const validateSessionAccess = async (
  sessionId: string,
  surface: AccessSurface,
  token: string | null,
  userId: string | null,
  profile: UserProfile | null
) => {
  const { data, error } = await supabase
    .from('game_sessions')
    .select('owner_user_id, operator_token, screen_token, audio_token, cards_token')
    .eq('id', sessionId)
    .single();

  if (error || !data) {
    return false;
  }

  const session = data as SessionAccessRow;
  if (profile?.role === 'admin') return true;
  if (userId && session.owner_user_id === userId) return true;

  const expected = session[tokenColumn[surface]];
  return !!token && !!expected && token === expected;
};
