'use client';

import { useEffect, useState } from 'react';
import styles from './FullscreenToggle.module.scss';

export default function FullscreenToggle() {
  const [isFs, setIsFs] = useState(false);
  const [visible, setVisible] = useState(true);

  const enter = async () => {
    if (document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
      setIsFs(true);
    }
  };

  const exit = async () => {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
      setIsFs(false);
    }
  };

  // Watch fullscreen changes
  useEffect(() => {
    const handler = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Auto-hide after 5s of no movement
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      setVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => setVisible(false), 5000);
    };

    // Trigger when user moves mouse
    window.addEventListener('mousemove', resetTimer);
    // Start initial timer
    resetTimer();

    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', resetTimer);
    };
  }, []);

  return (
    <button
      className={`${styles.fullscreen} ${!visible ? styles.hidden : ''}`}
      onClick={isFs ? exit : enter}
    >
      {isFs ? 'Exit Full Screen (Esc)' : 'Go Full Screen'}
    </button>
  );
}
