// src/components/PresentationModeToggle.tsx
//
// Bottom-left button that lets the operator switch the Main Screen between:
//   - Cozy mode (default): typography sized for TVs / small projectors
//   - Venue mode:          Tier 1 sizing for large projectors / 20m+ audiences
//
// Mode resolution priority: URL ?mode=venue|cozy  >  localStorage  >  cozy
// Mode is persisted to localStorage so it survives reloads.

'use client';

import { useEffect, useState } from 'react';
import styles from './PresentationModeToggle.module.scss';

const STORAGE_KEY = 'gabekross.presentationMode';
export type PresentationMode = 'cozy' | 'venue';

type Props = {
  /** Called whenever the resolved mode changes (mount + user toggle). */
  onChange: (mode: PresentationMode) => void;
};

export default function PresentationModeToggle({ onChange }: Props) {
  const [mode, setMode] = useState<PresentationMode>('cozy');
  const [mounted, setMounted] = useState(false);

  // Resolve initial mode on mount (client-only — uses window/localStorage)
  useEffect(() => {
    let resolved: PresentationMode = 'cozy';

    try {
      const params = new URLSearchParams(window.location.search);
      const urlMode = params.get('mode');
      if (urlMode === 'venue' || urlMode === 'cozy') {
        resolved = urlMode;
      } else {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'venue' || saved === 'cozy') resolved = saved;
      }
    } catch {
      // localStorage may throw in some embedded/private contexts — fall back to cozy
    }

    setMode(resolved);
    setMounted(true);
    onChange(resolved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    const next: PresentationMode = mode === 'cozy' ? 'venue' : 'cozy';
    setMode(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
    onChange(next);
  };

  // Avoid hydration mismatch — render nothing until we know the mode client-side
  if (!mounted) return null;

  return (
    <button
      className={styles.toggle}
      onClick={toggle}
      title={
        mode === 'cozy'
          ? 'Switch to Venue mode (large text for projector audiences 20m+ away)'
          : 'Switch to Cozy mode (default text size for TVs and close audiences)'
      }
      aria-label={`Presentation mode: ${mode}. Click to switch.`}
    >
      <span className={styles.icon} aria-hidden>
        {mode === 'cozy' ? '🏠' : '🎭'}
      </span>
      <span className={styles.label}>
        {mode === 'cozy' ? 'Cozy' : 'Venue'}
      </span>
    </button>
  );
}
