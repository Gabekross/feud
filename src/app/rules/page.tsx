import type { RulesSlide } from '@/lib/rulesPresentation';
import RulesGuide from './RulesGuide';
import styles from './RulesPage.module.scss';

const ruleSections: RulesSlide[] = [
  {
    id: 'what-is-family-friendlies',
    eyebrow: 'Game Overview',
    title: 'What Is Family Friendlies?',
    description:
      'Family Friendlies is a Family Feud-style game where two families or teams compete to guess the most popular responses to survey questions.',
    bullets: [
      'Each correct answer earns the number of points shown beside that answer.',
      'For example, if 36 people said "cat" was their favorite pet and your team guesses "cat," your team earns 36 points.',
      'The first team to reach 300 points wins the main game.',
    ],
    highlight: 'Reach 300 points',
    visual: 'welcome',
  },
  {
    id: 'team-captains',
    eyebrow: 'Start the Round',
    title: 'Choose Team Captains',
    description:
      'Before the first question, each team chooses a Team Captain. Both captains come to the front of the room with their buzzers.',
    bullets: [
      'The host reads the survey question aloud.',
      'The captains face off by trying to buzz in first.',
      'The first captain to buzz has five seconds to give an answer from the question sheet.',
    ],
    highlight: 'Buzz in first',
    visual: 'faceoff',
  },
  {
    id: 'face-off-control',
    title: 'Win Control',
    description:
      'If the first captain gives a correct answer, their team gets the first chance to control the round. If not, the other captain may guess.',
    bullets: [
      'The first team to give a correct answer may choose to play the round or pass it to the other team.',
      'The team that plays tries to guess the remaining top answers on the board.',
      'A new player from each team comes forward to begin the next round.',
    ],
    highlight: 'Play or pass',
    visual: 'faceoff',
  },
  {
    id: 'play-the-board',
    title: 'Play the Board',
    description:
      'The team in control answers one at a time, moving from player to player until the board is cleared or the team receives three strikes.',
    bullets: [
      'Each correct answer is revealed on the board.',
      'The team earns the point value listed beside each revealed answer.',
      'If the team finds every top answer before three strikes, they win the points for that round.',
    ],
    highlight: 'Clear the board',
    visual: 'board',
  },
  {
    id: 'three-strikes',
    title: 'Three Strikes',
    description:
      'A team receives one strike each time a player gives an answer that is not on the question sheet.',
    bullets: [
      "After three strikes, the controlling team's turn ends.",
      'The opposing team gets one chance to steal the round.',
      'The host should clearly track strikes so both teams know where the round stands.',
    ],
    highlight: 'X X X',
    visual: 'strikes',
  },
  {
    id: 'steal-the-round',
    title: 'Steal the Points',
    description:
      'When a team earns three strikes, the opposing team may make one final guess to try to steal the points from the round.',
    bullets: [
      "If the stealing team gives a correct answer, they win the round's points.",
      'If the stealing team gives an incorrect answer, the original team keeps the points.',
      'The host adds the earned points to the scorecard at the end of the round.',
    ],
    highlight: 'One final answer',
    visual: 'steal',
  },
  {
    id: 'scoring',
    title: 'Keep Score',
    description:
      'The host adds points based on the values listed in parentheses beside each correct answer on the question sheet.',
    bullets: [
      "Only answers revealed during the round count toward that round's score.",
      "At the end of each round, the host updates both teams' totals on the scorecard.",
      'Continue playing rounds until one team reaches 300 points.',
    ],
    highlight: 'Add every round',
    visual: 'score',
  },
  {
    id: 'fast-money',
    eyebrow: 'Bonus Round',
    title: 'Fast Money',
    description:
      'At the end of the game, the winning family plays Fast Money: a special bonus round with five final survey questions.',
    bullets: [
      'The winning family chooses two players for Fast Money.',
      "Each player answers the same five questions, but the second player cannot repeat the first player's answers.",
      'Their answer scores are combined for the Fast Money total.',
    ],
    highlight: 'Five final questions',
    visual: 'fastmoney',
  },
  {
    id: 'house-rules',
    title: 'House Rules',
    description:
      'The host keeps the game moving and makes the final call on answers, scoring, and timing.',
    bullets: [
      'Only the active player should answer unless the host opens discussion.',
      'Audience members should not shout answers during play.',
      'Cheer loudly, keep it friendly, and have fun.',
    ],
    highlight: 'Keep it friendly',
    visual: 'house',
  },
];

const quickRules = [
  'Two teams compete to guess the most popular survey answers.',
  'Choose Team Captains, then send one player from each team forward for each face-off.',
  'Buzz in first, give a correct answer within five seconds, then choose to play or pass.',
  'Correct answers earn the point value shown beside each answer.',
  'Three strikes give the other team one chance to steal.',
  'The first team to reach 300 points wins the main game.',
  'The winning team plays Fast Money with five final questions.',
];

export const metadata = {
  title: 'How to Play | Jemigah Family Games',
  description: 'Player-friendly rules for Family Friendlies.',
};

export default function RulesPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <p className={styles.kicker}>Family Friendlies</p>
          <h1>How to Play</h1>
          <p className={styles.lede}>
            Family Friendlies is a friendly, Family Feud-style game where teams guess the most popular survey answers, earn points, and race to 300.
          </p>
        </div>
      </section>

      <details className={styles.quickPanel}>
        <summary className={styles.quickSummary}>
          <span>
            <span className={styles.sectionLabel}>Quick Rules</span>
            <strong>The game in one minute</strong>
          </span>
          <span className={styles.quickChevron} aria-hidden="true" />
        </summary>
        <div className={styles.quickContent}>
          <ol className={styles.quickList}>
            {quickRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ol>
        </div>
      </details>

      <RulesGuide sections={ruleSections} />

      <section className={styles.readyPanel}>
        <p>Ready to play?</p>
        <h2>Listen to the host, cheer your family on, and have fun.</h2>
      </section>
    </main>
  );
}
