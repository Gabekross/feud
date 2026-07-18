import { supabase } from './supabaseClient';

export type SoundCommand = 'play' | 'pause' | 'stop' | 'seek' | 'config';
export type SoundType = 'effect' | 'music';

export type SoundEventPayload = {
  sound_type: SoundType;
  command: SoundCommand;
  track_id?: string;
  src?: string;
  seek_time?: number;
  volume?: number;
  playback_rate?: number;
  loop?: boolean;
};

export const emitSoundEvent = async (sessionId: string | null, payload: SoundEventPayload) => {
  if (!sessionId) return;

  const { error } = await supabase.from('sound_events').insert({
    session_id: sessionId,
    ...payload,
  });

  if (error) {
    console.error('Sound event failed:', error.message);
  }
};
