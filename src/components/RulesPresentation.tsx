'use client';

import { getRulesSlides, type RulesMode, type RulesSlide } from '@/lib/rulesPresentation';
import styles from './RulesPresentation.module.scss';

type Props = {
  mode: RulesMode;
  step: number;
};

function RulesVisual({ slide }: { slide: RulesSlide }) {
  if (slide.visual === 'faceoff') {
    return (
      <div className={`${styles.visual} ${styles.faceoff}`}>
        <span>Family A</span>
        <strong>BUZZ</strong>
        <span>Family B</span>
      </div>
    );
  }

  if (slide.visual === 'board') {
    return (
      <div className={`${styles.visual} ${styles.boardVisual}`}>
        {[1, 2, 3, 4, 5, 6].map((item) => <span key={item}>{item}</span>)}
      </div>
    );
  }

  if (slide.visual === 'strikes') {
    return (
      <div className={`${styles.visual} ${styles.strikesVisual}`}>
        <strong>X</strong>
        <strong>X</strong>
        <strong>X</strong>
      </div>
    );
  }

  if (slide.visual === 'steal') {
    return (
      <div className={`${styles.visual} ${styles.stealVisual}`}>
        <span>Discuss</span>
        <strong>1</strong>
        <span>Final Answer</span>
      </div>
    );
  }

  if (slide.visual === 'score') {
    return (
      <div className={`${styles.visual} ${styles.scoreVisual}`}>
        <strong>300</strong>
        <span>Points</span>
      </div>
    );
  }

  if (slide.visual === 'tiebreaker') {
    return (
      <div className={`${styles.visual} ${styles.tieVisual}`}>
        <span>Tie</span>
        <strong>Breaker</strong>
      </div>
    );
  }

  if (slide.visual === 'fastmoney') {
    return (
      <div className={`${styles.visual} ${styles.fastMoneyVisual}`}>
        <span>5 + 5</span>
        <strong>200</strong>
      </div>
    );
  }

  if (slide.visual === 'house') {
    return (
      <div className={`${styles.visual} ${styles.houseVisual}`}>
        <span>Host</span>
        <strong>Final</strong>
        <span>Fun</span>
      </div>
    );
  }

  if (slide.visual === 'quick') {
    return (
      <div className={`${styles.visual} ${styles.quickVisual}`}>
        <span>Face-Off</span>
        <span>Board</span>
        <span>Steal</span>
        <span>300</span>
        <span>200</span>
      </div>
    );
  }

  return (
    <div className={`${styles.visual} ${styles.readyVisual}`}>
      <strong>{slide.visual === 'ready' ? 'Ready?' : 'Play'}</strong>
    </div>
  );
}

export default function RulesPresentation({ mode, step }: Props) {
  const slides = getRulesSlides(mode);
  const safeStep = Math.min(Math.max(0, step), slides.length - 1);
  const slide = slides[safeStep];

  return (
    <section className={styles.rulesScreen} aria-live="polite">
      <div className={styles.backdropGlow} />
      <div className={styles.progress}>
        <span>{mode === 'quick' ? 'Quick Rules' : 'Game Rules'}</span>
        <strong>Step {safeStep + 1} of {slides.length}</strong>
      </div>

      <article key={slide.id} className={styles.slide}>
        <div className={styles.copy}>
          {slide.eyebrow && <span className={styles.eyebrow}>{slide.eyebrow}</span>}
          <h1>{slide.title}</h1>
          {slide.description && <p className={styles.description}>{slide.description}</p>}

          {slide.bullets.length > 0 && (
            <ul className={styles.bullets}>
              {slide.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
            </ul>
          )}

          {slide.highlight && <div className={styles.highlight}>{slide.highlight}</div>}
        </div>

        <RulesVisual slide={slide} />
      </article>

      <div className={styles.dots} aria-hidden="true">
        {slides.map((item, index) => (
          <span key={item.id} className={index === safeStep ? styles.activeDot : ''} />
        ))}
      </div>
    </section>
  );
}
