'use client';

import { useMemo, useState } from 'react';
import type { RulesSlide } from '@/lib/rulesPresentation';
import styles from './RulesPage.module.scss';

type RulesGuideProps = {
  sections: RulesSlide[];
};

export default function RulesGuide({ sections }: RulesGuideProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const activeSection = sections[activeIndex] ?? sections[0];
  const activeLabel = useMemo(
    () => `${String(activeIndex + 1).padStart(2, '0')} / ${String(sections.length).padStart(2, '0')}`,
    [activeIndex, sections.length]
  );

  const goTo = (nextIndex: number) => {
    setShowAll(false);
    setActiveIndex(Math.min(Math.max(nextIndex, 0), sections.length - 1));
  };

  if (!activeSection) return null;

  return (
    <section className={styles.guidePanel} aria-labelledby="full-rules-title">
      <div className={styles.guideHeader}>
        <div>
          <p className={styles.sectionLabel}>Full Rules</p>
          <h2 id="full-rules-title">{showAll ? 'All game rules' : activeSection.title}</h2>
        </div>
        <div className={styles.progressBadge}>{showAll ? 'All Sections' : activeLabel}</div>
      </div>

      <div className={styles.stepTabs} aria-label="Rule sections">
        {sections.map((section, index) => (
          <button
            type="button"
            key={section.id}
            className={`${styles.stepTab} ${!showAll && index === activeIndex ? styles.activeStep : ''}`}
            onClick={() => goTo(index)}
          >
            <span>{String(index + 1).padStart(2, '0')}</span>
            {section.title}
          </button>
        ))}
      </div>

      {showAll ? (
        <div className={styles.rulesGrid} aria-label="All full game rules">
          {sections.map((section, index) => (
            <RuleCard section={section} index={index} key={section.id} />
          ))}
        </div>
      ) : (
        <div className={styles.focusedRule}>
          <RuleCard section={activeSection} index={activeIndex} />
        </div>
      )}

      <div className={styles.guideActions}>
        <button type="button" onClick={() => goTo(activeIndex - 1)} disabled={activeIndex === 0 || showAll}>
          Previous
        </button>
        <button type="button" onClick={() => goTo(activeIndex + 1)} disabled={activeIndex === sections.length - 1 || showAll}>
          Next
        </button>
        <button type="button" className={styles.secondaryAction} onClick={() => setShowAll((current) => !current)}>
          {showAll ? 'Guided View' : 'Show All Rules'}
        </button>
      </div>
    </section>
  );
}

function RuleCard({ section, index }: { section: RulesSlide; index: number }) {
  return (
    <article className={styles.ruleCard}>
      <div className={styles.ruleNumber}>{String(index + 1).padStart(2, '0')}</div>
      <div className={styles.ruleCopy}>
        {section.eyebrow && <p className={styles.ruleEyebrow}>{section.eyebrow}</p>}
        <h2>{section.title}</h2>
        {section.description && <p className={styles.description}>{section.description}</p>}
        <ul>
          {section.bullets.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
        {section.highlight && <strong className={styles.highlight}>{section.highlight}</strong>}
      </div>
    </article>
  );
}
