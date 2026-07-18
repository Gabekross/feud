'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

type SoundEvent = {
  sound_type: 'effect' | 'music';
  command: 'play' | 'pause' | 'stop' | 'seek' | 'config';
  track_id: string | null;
  src: string | null;
  seek_time: number | null;
  volume: number | null;
  playback_rate: number | null;
  loop: boolean | null;
};

const EFFECT_SOURCES: Record<string, string> = {
  buzzer: '/sounds/buzzer.mp3',
  correct: '/sounds/correct.mp3',
};

const TRACK_LIMITS: Record<string, number> = {
  intro: 33,
};

export default function MainScreenAudioController({ sessionId }: { sessionId: string | null }) {
  const tracksRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  useEffect(() => {
    return () => {
      tracksRef.current.forEach((audio) => audio.pause());
      tracksRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    const getTrack = (trackId: string, src: string) => {
      const existing = tracksRef.current.get(trackId);
      if (existing && existing.src.includes(src)) return existing;

      existing?.pause();
      const audio = new Audio(src);
      audio.preload = 'auto';
      audio.addEventListener('timeupdate', () => {
        const limit = TRACK_LIMITS[trackId];
        if (limit && audio.currentTime >= limit) {
          audio.pause();
          audio.currentTime = 0;
        }
      });
      tracksRef.current.set(trackId, audio);
      return audio;
    };

    const applyAudioSettings = (audio: HTMLAudioElement, event: SoundEvent) => {
      if (typeof event.volume === 'number') audio.volume = Math.min(1, Math.max(0, event.volume));
      if (typeof event.playback_rate === 'number') audio.playbackRate = event.playback_rate;
      if (typeof event.loop === 'boolean') audio.loop = event.loop;
      if (typeof event.seek_time === 'number') audio.currentTime = Math.max(0, event.seek_time);
    };

    const handleEvent = async (event: SoundEvent) => {
      if (event.sound_type === 'effect') {
        const effectSrc = (event.track_id && EFFECT_SOURCES[event.track_id]) || event.src;
        if (!effectSrc || event.command !== 'play') return;
        const audio = new Audio(effectSrc);
        audio.volume = typeof event.volume === 'number' ? event.volume : 0.85;
        await audio.play().catch((error) => console.error('Main screen effect playback failed:', error));
        return;
      }

      const trackId = event.track_id ?? 'music';
      const src = event.src;
      if (!src) return;

      const audio = getTrack(trackId, src);
      applyAudioSettings(audio, event);

      if (event.command === 'play') {
        await audio.play().catch((error) => console.error('Main screen music playback failed:', error));
      } else if (event.command === 'pause') {
        audio.pause();
      } else if (event.command === 'stop') {
        audio.pause();
        audio.currentTime = 0;
      }
    };

    const channel = supabase
      .channel(`main_screen_sound_events_${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sound_events', filter: `session_id=eq.${sessionId}` },
        (payload) => {
          void handleEvent(payload.new as SoundEvent);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return null;
}
