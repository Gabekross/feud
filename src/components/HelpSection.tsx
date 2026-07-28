// src/components/HelpSection.tsx
//
// Help / how-to section for the control hub. Uses native <details> elements
// so it stays accessible and does not need client-side state.

import styles from './HelpSection.module.scss';

export default function HelpSection() {
  return (
    <details className={styles.outer}>
      <summary className={styles.outerSummary}>
        <span className={styles.outerIcon}>GUIDE</span>
        <span className={styles.outerTitle}>Help &amp; How to Play</span>
        <span className={styles.outerHint}>Accounts | Sessions | Templates | Live Game Flow</span>
        <span className={styles.outerChevron} aria-hidden>v</span>
      </summary>

      <div className={styles.body}>
        <details className={styles.section} open>
          <summary className={styles.sectionSummary}>Getting Started</summary>
          <div className={styles.sectionBody}>
            <ol>
              <li><strong>Sign in</strong> from the account page. Hosts can create and run games; Platform Admin can manage everything.</li>
              <li><strong>Open My Game Sessions</strong> to create a custom game, launch a ready-made game, or resume an existing session.</li>
              <li><strong>Create or launch a game session</strong>. Each session now has its own private control, screen, audio, and card links.</li>
              <li><strong>Open the tokenized Main Screen link</strong> on the TV or projector and use fullscreen.</li>
              <li><strong>Open the tokenized Control link</strong> on the host/operator device and run the show.</li>
            </ol>
            <p className={styles.tip}>
              <strong>Tip:</strong> Use the links from the Sessions Dashboard. They include the correct session id and access token, so each device opens the right game.
            </p>
          </div>
        </details>

        <details className={styles.section}>
          <summary className={styles.sectionSummary}>Accounts and Roles</summary>
          <div className={styles.sectionBody}>
            <p>The app now supports signed-in users and role-based workflows.</p>
            <ul>
              <li><strong>Host:</strong> can create custom game sessions, launch ready-made games, duplicate/archive their sessions, and run their own games.</li>
              <li><strong>Platform Admin:</strong> can manage users, master questions, ready-made templates, assigned custom games, and all sessions.</li>
            </ul>
            <p>
              The first account created becomes Platform Admin. After that, new accounts are hosts unless an admin promotes them in <em>User Manager</em>.
            </p>
          </div>
        </details>

        <details className={styles.section}>
          <summary className={styles.sectionSummary}>Dashboard and Session Links</summary>
          <div className={styles.sectionBody}>
            <p>Use <strong>My Game Sessions</strong> as the home base for live games.</p>
            <ul>
              <li><strong>Create Game:</strong> build a custom game using approved questions from the question bank.</li>
              <li><strong>Ready-Made Games:</strong> launch a private copy of a Platform Admin template.</li>
              <li><strong>Control:</strong> opens the operator panel for that exact session.</li>
              <li><strong>Main Screen:</strong> opens the audience display for that exact session.</li>
              <li><strong>Audio:</strong> opens a dedicated sound/operator view for that exact session.</li>
              <li><strong>Cards:</strong> opens printable/review cards for that exact session.</li>
              <li><strong>Duplicate:</strong> creates a fresh private copy with the same selected questions and settings.</li>
              <li><strong>Archive:</strong> removes a completed game from the main working list.</li>
            </ul>
            <p className={styles.warn}>
              <strong>Important:</strong> Do not copy generic links from the browser address bar unless they include <code>sessionId</code> and <code>token</code>. The dashboard links are the safest way to share screens with operators.
            </p>
          </div>
        </details>

        <details className={styles.section}>
          <summary className={styles.sectionSummary}>Creating a Custom Game</summary>
          <div className={styles.sectionBody}>
            <p>Hosts can create custom sessions from the approved question bank.</p>
            <ol>
              <li>Go to <strong>My Game Sessions</strong>, then choose <strong>Create Game</strong>.</li>
              <li>Set the event title, footer text, and team names.</li>
              <li>Select one question for Round 1, Round 2, Round 3, Round 4, and Tie Breaker.</li>
              <li>Select five unique Fast Money questions.</li>
              <li>Create the session, then use the generated links for Control, Main Screen, Audio, and Cards.</li>
            </ol>
            <p className={styles.tip}>
              <strong>Good news:</strong> multiple sessions can now exist at the same time. Creating a new game no longer deletes unfinished games.
            </p>
          </div>
        </details>

        <details className={styles.section}>
          <summary className={styles.sectionSummary}>Ready-Made and Assigned Games</summary>
          <div className={styles.sectionBody}>
            <p>Platform Admin can publish sessions as reusable templates. Hosts launch private copies from those templates.</p>
            <ul>
              <li><strong>Public template:</strong> visible to all signed-in hosts.</li>
              <li><strong>Private template:</strong> visible only to Platform Admin.</li>
              <li><strong>Assigned template:</strong> shared with a specific signed-up user, useful for custom game-session gigs.</li>
            </ul>
            <p>
              When a host clicks <strong>Use This Game</strong>, the app creates a new private game session. Scores, strikes, timers, answer reveals, and Fast Money responses do not affect any other user.
            </p>
          </div>
        </details>

        <details className={styles.section}>
          <summary className={styles.sectionSummary}>Admin Tools</summary>
          <div className={styles.sectionBody}>
            <p>Platform Admin has extra management pages:</p>
            <ul>
              <li><strong>Question Bank:</strong> add, edit, import, or delete master questions and answers.</li>
              <li><strong>Template Manager:</strong> edit template title/description, change visibility, archive/delete templates, assign templates to users, and preview included questions.</li>
              <li><strong>User Manager:</strong> review signed-up users, promote/demote roles, and see session/template activity counts.</li>
            </ul>
            <p className={styles.warn}>
              <strong>Question editing is admin-only.</strong> Hosts can choose approved questions for games, but they cannot add or change the master question bank.
            </p>
          </div>
        </details>

        <details className={styles.section}>
          <summary className={styles.sectionSummary}>Setting Up the Main Screen</summary>
          <div className={styles.sectionBody}>
            <p>The Main Screen is the audience display for one specific game session.</p>
            <ol>
              <li>Open the <strong>Main Screen</strong> link from the Sessions Dashboard on the projector or TV device.</li>
              <li>Use the fullscreen button or press <kbd>F11</kbd>.</li>
              <li>Keep that browser tab on the tokenized session link for the whole game.</li>
            </ol>
            <p><strong>The Main Screen shows:</strong></p>
            <ul>
              <li>Intro, team matchup, rules, board, winner, and Fast Money screens</li>
              <li>Team names, scores, active team, strikes, and answer reveals</li>
              <li>Fast Money two-player board and timer</li>
            </ul>
          </div>
        </details>

        <details className={styles.section}>
          <summary className={styles.sectionSummary}>Using the Operator Panel</summary>
          <div className={styles.sectionBody}>
            <p>The Operator Panel controls the live game session.</p>

            <h4>Game Controls</h4>
            <ul>
              <li>Switch between regular rounds, Tie Breaker, and Fast Money.</li>
              <li>Show standby, team intro, board, rules, Fast Money intro, and winner screens.</li>
              <li>Reset a round or reset/end the entire session.</li>
              <li>Manage strikes and strike limit.</li>
            </ul>

            <h4>Question and Answer Control</h4>
            <ul>
              <li>Reveal or hide the question on the Main Screen.</li>
              <li>Reveal/hide individual answers or reveal all answers.</li>
              <li>Answer reveal state is session-specific, so another game using the same question is not affected.</li>
            </ul>

            <h4>Scores and Teams</h4>
            <ul>
              <li>Set team names, active team, and manual score adjustments.</li>
              <li>Use score controls if you need to correct or override automatic scoring.</li>
            </ul>

            <h4>Audio</h4>
            <ul>
              <li>Use the built-in audio controls in the panel, or open the separate <strong>Audio</strong> link for a second operator.</li>
              <li>Browsers may block sound until the operator clicks somewhere on the page.</li>
            </ul>
          </div>
        </details>

        <details className={styles.section}>
          <summary className={styles.sectionSummary}>Fast Money Flow</summary>
          <div className={styles.sectionBody}>
            <ol>
              <li>Switch to <strong>Fast Money</strong> in the Operator Panel.</li>
              <li>Select Player 1 and start at question 1.</li>
              <li>Reveal each question, type or select the answer, then reveal answer/points when ready.</li>
              <li>Switch to Player 2 and jump back to question 1.</li>
              <li>Player 1 answers can be hidden while Player 2 plays.</li>
              <li>Reveal Player 2 answers and points to finish the round.</li>
            </ol>
            <p className={styles.tip}>
              <strong>Tip:</strong> Fast Money responses are stored per session, so duplicated or template-launched games start clean.
            </p>
          </div>
        </details>

        <details className={styles.section}>
          <summary className={styles.sectionSummary}>Troubleshooting</summary>
          <div className={styles.sectionBody}>
            <ul>
              <li><strong>Access denied:</strong> open the link from the Sessions Dashboard. The link may be missing the right token.</li>
              <li><strong>Wrong game showing:</strong> confirm the URL has the intended <code>sessionId</code>.</li>
              <li><strong>Main Screen is not updating:</strong> refresh the Main Screen and Operator Panel tabs.</li>
              <li><strong>No sound:</strong> click the page once, then try the sound control again.</li>
              <li><strong>Old game is cluttering the dashboard:</strong> archive it, then use <em>Show archived</em> only when you need it.</li>
              <li><strong>Need another similar game:</strong> duplicate a session or launch a ready-made template.</li>
            </ul>
          </div>
        </details>
      </div>
    </details>
  );
}
