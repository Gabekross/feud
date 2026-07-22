export type RulesMode = 'full' | 'quick';

export type RulesVisual =
  | 'welcome'
  | 'faceoff'
  | 'board'
  | 'strikes'
  | 'steal'
  | 'score'
  | 'tiebreaker'
  | 'fastmoney'
  | 'house'
  | 'ready'
  | 'quick';

export type RulesSlide = {
  id: string;
  title: string;
  eyebrow?: string;
  description?: string;
  bullets: string[];
  highlight?: string;
  visual: RulesVisual;
};

export const FULL_RULES_SLIDES: RulesSlide[] = [
  {
    id: 'welcome',
    eyebrow: 'Mercy Court Family Friendlies',
    title: 'How to Play',
    description: 'Two families compete to guess the most popular survey answers.',
    bullets: [
      'Work together.',
      'Avoid three strikes.',
      'Score the most points to win.',
    ],
    highlight: "Let's learn how the game works!",
    visual: 'welcome',
  },
  {
    id: 'face-off',
    title: 'Face-Off',
    bullets: [
      'One player from each family comes forward.',
      'The host reads the survey question.',
      'The first player to buzz gives an answer.',
      'The higher-ranked answer wins control.',
      'The winning family chooses to Play or Pass.',
    ],
    highlight: 'Win control',
    visual: 'faceoff',
  },
  {
    id: 'play-the-board',
    title: 'Play the Board',
    bullets: [
      'Family members answer one at a time.',
      'Correct answers are revealed on the board.',
      'Each revealed answer adds points to the round total.',
      'Players may not discuss answers while their family controls the board.',
    ],
    highlight: 'Build the round total',
    visual: 'board',
  },
  {
    id: 'three-strikes',
    title: 'Three Strikes',
    bullets: [
      'A wrong answer earns one strike.',
      "After three strikes, the controlling family's turn ends.",
      'The opposing family receives one opportunity to steal.',
    ],
    highlight: 'X X X',
    visual: 'strikes',
  },
  {
    id: 'steal-the-round',
    title: 'Steal the Round',
    bullets: [
      'The opposing family may briefly discuss possible answers.',
      'The team captain gives one final answer.',
      'A correct answer steals all points from the round.',
      'An incorrect answer means the original family keeps the points.',
    ],
    highlight: 'One final answer',
    visual: 'steal',
  },
  {
    id: 'win-the-game',
    title: 'Win the Game',
    bullets: [
      'The first family to reach the winning target wins.',
      'If no family reaches the target after regular rounds, follow the app winner flow.',
      'If the game ends in a tie, play the Tie Breaker Round.',
    ],
    highlight: '300 Points',
    visual: 'score',
  },
  {
    id: 'tie-breaker',
    title: 'Tie Breaker',
    bullets: [
      'A final survey question is played.',
      'Contestants compete for control.',
      'The family that wins the Tie Breaker wins the game.',
    ],
    highlight: 'Final question',
    visual: 'tiebreaker',
  },
  {
    id: 'fast-money',
    title: 'Fast Money',
    bullets: [
      'The winning family selects two players.',
      'Player 1 answers five survey questions.',
      'Player 2 answers the same five questions.',
      "Player 2 cannot repeat Player 1's answers.",
      'The two scores are combined.',
      'A combined score of 200 or more wins Fast Money.',
    ],
    highlight: '200 Points',
    visual: 'fastmoney',
  },
  {
    id: 'house-rules',
    title: 'House Rules',
    bullets: [
      'No shouting answers from the audience.',
      'Only the active contestant may answer.',
      'Contestants should wait until called upon.',
      "The host or operator's decision is final.",
      'Most importantly, have fun.',
    ],
    highlight: 'Are you ready to play?',
    visual: 'house',
  },
  {
    id: 'ready',
    title: 'Are You Ready?',
    description: "Let's Play Family Friendlies!",
    bullets: [],
    highlight: 'Let the game begin',
    visual: 'ready',
  },
];

export const QUICK_RULES_SLIDES: RulesSlide[] = [
  {
    id: 'quick-rules',
    eyebrow: 'Quick Rules',
    title: 'How to Win',
    bullets: [
      'Win the Face-Off.',
      'Guess the answers on the board.',
      'Three strikes give the other family a chance to steal.',
      'Reach 300 points to win.',
      'Score 200 points in Fast Money.',
    ],
    highlight: 'Ready in 60 seconds',
    visual: 'quick',
  },
  {
    id: 'quick-ready',
    title: 'Are You Ready?',
    description: "Let's Play Family Friendlies!",
    bullets: [],
    highlight: 'Bring out the families',
    visual: 'ready',
  },
];

export const getRulesSlides = (mode: RulesMode) =>
  mode === 'quick' ? QUICK_RULES_SLIDES : FULL_RULES_SLIDES;

export const clampRulesStep = (mode: RulesMode, step: number) => {
  const slides = getRulesSlides(mode);
  return Math.min(Math.max(0, step), Math.max(0, slides.length - 1));
};
