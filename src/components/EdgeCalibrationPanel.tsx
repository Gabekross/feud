// src/components/EdgeCalibrationPanel.tsx
//
// Universal screen-edge calibration UI for the Main Screen.
// Lets the operator dial in each of the four safe-area edges (top,
// right, bottom, left) per-display in 30 seconds, persisted to
// localStorage so the venue stays calibrated across reloads.
//
// Works for any display:
//   • LED wall / projector (0% overscan): all edges → 0–1%
//   • Smart TV (3–6% overscan, often asymmetric): tune per edge
//   • Hospitality / older TV (5–7% overscan): all edges → ~6%
//
// Mounts a 🎯 trigger button at the top-left corner of the Main Screen
// and an inline panel that opens beneath it. Dashed red outline appears
// around the stage while the panel is open so the operator can see the
// exact safe-area boundary they're tuning.

'use client';

import { useEffect, useState } from 'react';
import styles from './EdgeCalibrationPanel.module.scss';

export type EdgeMargins = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

const STORAGE_KEY = 'gabekross.edgeCalibration';
const DEFAULTS: EdgeMargins = { top: 3, right: 3, bottom: 3, left: 3 };
const MIN = 0;
const MAX = 10;
const STEP = 0.5;

const clampAll = (v: EdgeMargins): EdgeMargins => ({
  top:    Math.max(MIN, Math.min(MAX, v.top)),
  right:  Math.max(MIN, Math.min(MAX, v.right)),
  bottom: Math.max(MIN, Math.min(MAX, v.bottom)),
  left:   Math.max(MIN, Math.min(MAX, v.left)),
});

type Props = {
  /** Called whenever margins change (mount + every adjustment). */
  onChange: (margins: EdgeMargins) => void;
  /** Called with `true` while the panel is open, `false` when it closes.
   *  The Main Screen uses this to draw a visual stage-boundary outline. */
  onCalibratingChange?: (calibrating: boolean) => void;
};

export default function EdgeCalibrationPanel({ onChange, onCalibratingChange }: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [values, setValues] = useState<EdgeMargins>(DEFAULTS);

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    let initial: EdgeMargins = DEFAULTS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          typeof parsed?.top    === 'number' &&
          typeof parsed?.right  === 'number' &&
          typeof parsed?.bottom === 'number' &&
          typeof parsed?.left   === 'number'
        ) {
          initial = clampAll(parsed);
        }
      }
    } catch {
      // localStorage unavailable / parse failed → fall back to defaults
    }
    setValues(initial);
    setMounted(true);
    onChange(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Notify parent when open state flips so it can toggle the visual outline
  useEffect(() => {
    onCalibratingChange?.(open);
  }, [open, onCalibratingChange]);

  const update = (edge: keyof EdgeMargins, delta: number) => {
    const raw = values[edge] + delta;
    const clamped = Math.max(MIN, Math.min(MAX, raw));
    const rounded = Math.round(clamped * 10) / 10;
    const next = { ...values, [edge]: rounded };
    setValues(next);
    onChange(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const reset = () => {
    setValues(DEFAULTS);
    onChange(DEFAULTS);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULTS)); } catch { /* ignore */ }
  };

  // Avoid hydration mismatch — render nothing on the first server pass
  if (!mounted) return null;

  const edges: Array<{ key: keyof EdgeMargins; arrow: string; label: string }> = [
    { key: 'top',    arrow: '⬆', label: 'Top'    },
    { key: 'right',  arrow: '➡', label: 'Right'  },
    { key: 'bottom', arrow: '⬇', label: 'Bottom' },
    { key: 'left',   arrow: '⬅', label: 'Left'   },
  ];

  return (
    <>
      <button
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        title="Calibrate screen edges (compensate for TV/projector overscan)"
        aria-label="Open edge calibration panel"
        aria-expanded={open}
      >
        🎯
      </button>

      {open && (
        <div className={styles.panel} role="dialog" aria-label="Edge Calibration">
          <div className={styles.header}>
            <span className={styles.title}>🎯 Edge Calibration</span>
            <button
              className={styles.closeBtn}
              onClick={() => setOpen(false)}
              aria-label="Close calibration panel"
            >×</button>
          </div>
          <p className={styles.hint}>
            Tune each edge until the audience content fits exactly inside your
            screen. Updates apply live and save automatically.
          </p>

          {edges.map(({ key, arrow, label }) => (
            <div key={key} className={styles.row}>
              <span className={styles.rowLabel}>
                <span className={styles.arrow} aria-hidden>{arrow}</span>
                {label}
              </span>
              <button
                className={styles.btn}
                onClick={() => update(key, -STEP)}
                disabled={values[key] <= MIN}
                aria-label={`Decrease ${label} margin`}
              >−</button>
              <span className={styles.value}>{values[key].toFixed(1)}%</span>
              <button
                className={styles.btn}
                onClick={() => update(key, STEP)}
                disabled={values[key] >= MAX}
                aria-label={`Increase ${label} margin`}
              >+</button>
            </div>
          ))}

          <div className={styles.footer}>
            <button className={styles.resetBtn} onClick={reset}>
              Reset to defaults (3% each)
            </button>
          </div>
        </div>
      )}
    </>
  );
}
