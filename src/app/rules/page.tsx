import { FULL_RULES_SLIDES, QUICK_RULES_SLIDES } from '@/lib/rulesPresentation';
import styles from './RulesPage.module.scss';

const ruleSections = FULL_RULES_SLIDES.filter((slide) => slide.id !== 'ready');
const quickRules = QUICK_RULES_SLIDES[0]?.bullets ?? [];

export const metadata = {
  title: 'How to Play | Jemigah Family Games',
  description: 'Player-friendly rules for Family Face Off and Family Friendlies.',
};

export default function RulesPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.kicker}>Family Friendlies</p>
          <h1>How to Play</h1>
          <p className={styles.lede}>
            A quick guide for players and guests before the show begins.
          </p>
        </div>
      </section>

      <section className={styles.quickPanel} aria-labelledby="quick-rules-title">
        <div>
          <p className={styles.sectionLabel}>Quick Rules</p>
          <h2 id="quick-rules-title">The game in one minute</h2>
        </div>
        <ol className={styles.quickList}>
          {quickRules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ol>
      </section>

      <section className={styles.rulesGrid} aria-label="Full game rules">
        {ruleSections.map((section, index) => (
          <article className={styles.ruleCard} key={section.id}>
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
        ))}
      </section>

      <section className={styles.readyPanel}>
        <p>Ready to play?</p>
        <h2>Listen to the host, cheer your family on, and have fun.</h2>
      </section>
    </main>
  );
}
