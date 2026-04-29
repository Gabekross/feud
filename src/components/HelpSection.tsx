// src/components/HelpSection.tsx
//
// Help / How-to-play section for the landing page.
// Server component — uses native <details> elements for accessible,
// JS-free expand/collapse. Each subsection is independently expandable.

import styles from './HelpSection.module.scss';

export default function HelpSection() {
  return (
    <details className={styles.outer}>
      <summary className={styles.outerSummary}>
        <span className={styles.outerIcon}>📖</span>
        <span className={styles.outerTitle}>Help &amp; How to Play</span>
        <span className={styles.outerHint}>Setup • Operator Panel • Game Flow</span>
        <span className={styles.outerChevron} aria-hidden>▾</span>
      </summary>

      <div className={styles.body}>
        {/* ── Quick Start ─────────────────────────────────────────── */}
        <details className={styles.section} open>
          <summary className={styles.sectionSummary}>🚀 Quick Start (5 minutes)</summary>
          <div className={styles.sectionBody}>
            <ol>
              <li><strong>Add questions</strong> to the database (see <em>Adding Questions</em> below).</li>
              <li><strong>Create a Game Session</strong> — pick questions for each round and Fast Money, set team names.</li>
              <li><strong>Open the Main Screen</strong> on the TV / projector and press <kbd>F11</kbd> for fullscreen.</li>
              <li><strong>Open the Operator Panel</strong> on a separate laptop or tablet to run the show.</li>
              <li><strong>Switch rounds, reveal answers, track strikes</strong>, and finish with Fast Money.</li>
            </ol>
            <p className={styles.tip}>
              💡 <strong>Tip:</strong> Use two devices — one for the audience Main Screen and one for the
              operator. Both stay in sync automatically over the live game session.
            </p>
          </div>
        </details>

        {/* ── Adding Questions ────────────────────────────────────── */}
        <details className={styles.section}>
          <summary className={styles.sectionSummary}>🗂️ Adding Questions to the Database</summary>
          <div className={styles.sectionBody}>
            <p>
              Questions live in your Supabase database. Each question has a <code>question_text</code>,
              a <code>type</code> (which round it&apos;s for), and a list of answers with point values.
            </p>
            <p><strong>Question types you must have:</strong></p>
            <ul>
              <li><code>round1</code>, <code>round2</code>, <code>round3</code>, <code>round4</code> — regular rounds</li>
              <li><code>sudden_death</code> — tiebreaker question</li>
              <li><code>fast_money</code> — Fast Money pool (you&apos;ll pick 5 from this)</li>
            </ul>
            <p><strong>Each question needs answers</strong> with: <code>answer_text</code>, <code>points</code>, and an <code>order</code> (1, 2, 3…).</p>
            <p>
              You can add questions through the Supabase dashboard table editor, or via the
              <em> Current Game Session Questions</em> page on the landing page (preview
              what&apos;s loaded for the active session).
            </p>
            <p className={styles.warn}>
              ⚠ Make sure each question you intend to use has at least <strong>one answer</strong>
              attached, otherwise the answer board will appear empty on the Main Screen.
            </p>
          </div>
        </details>

        {/* ── Creating a Session ──────────────────────────────────── */}
        <details className={styles.section}>
          <summary className={styles.sectionSummary}>🛠️ Creating a Game Session</summary>
          <div className={styles.sectionBody}>
            <p>From the <strong>Create Game Session</strong> card on the landing page:</p>
            <ol>
              <li>Enter the two team names (e.g. <em>Lions</em> and <em>Eagles</em>).</li>
              <li>Pick one question for each: Round 1, Round 2, Round 3, Round 4, Sudden Death.</li>
              <li>Pick <strong>5 different questions</strong> for Fast Money (FM1 through FM5).</li>
              <li>Click <strong>🎮 Create Game Session</strong>.</li>
            </ol>
            <p className={styles.warn}>
              ⚠ Only <strong>one active session</strong> can exist at a time. Creating a new session
              replaces any previous one — start scores, strikes, and reveals all reset.
            </p>
            <p className={styles.tip}>
              💡 <strong>Tip:</strong> You can preview every question and answer for the new session
              from the <em>Current Game Session Questions</em> page before going live.
            </p>
          </div>
        </details>

        {/* ── Main Screen Setup ───────────────────────────────────── */}
        <details className={styles.section}>
          <summary className={styles.sectionSummary}>📺 Setting Up the Main Screen</summary>
          <div className={styles.sectionBody}>
            <p>The Main Screen is the audience display — it&apos;s what your church/audience sees on the TV or projector.</p>
            <ol>
              <li>Open the Main Screen URL on the device connected to the projector or TV.</li>
              <li>Press <kbd>F11</kbd> (or use the fullscreen toggle in the corner) to go fullscreen.</li>
              <li>That&apos;s it — the screen auto-detects the active game session and updates live.</li>
            </ol>
            <p><strong>What the Main Screen shows:</strong></p>
            <ul>
              <li><strong>Top:</strong> Team scoreboard with the active team highlighted in gold</li>
              <li><strong>Middle:</strong> Question + answer board (8 blue plates that flip to reveal)</li>
              <li><strong>Bottom:</strong> Strike indicators (❌)</li>
              <li>During Fast Money: switches to a two-column board (Player 1 | Player 2) with a countdown timer in the corner</li>
            </ul>
            <p className={styles.tip}>
              💡 <strong>Tip:</strong> Designed for 16:9 displays. Test the projector first — overscan-safe
              padding is built in for older TVs.
            </p>
          </div>
        </details>

        {/* ── Operator Panel ──────────────────────────────────────── */}
        <details className={styles.section}>
          <summary className={styles.sectionSummary}>🎛️ Using the Operator Panel</summary>
          <div className={styles.sectionBody}>
            <p>The Operator Panel is split into three panes (plus a Fast Money pane that appears in round 6):</p>

            <h4>🎮 Left Pane — Game Controls</h4>
            <ul>
              <li><strong>Round selector</strong> + <em>🔀 Switch to Selected Round</em> button — moves the game forward</li>
              <li><strong>👁️ Reveal Question / 🙈 Hide Question</strong> — controls whether the audience sees the question text</li>
              <li><strong>Strike controls</strong> — ➕ / ➖ buttons (a red ❌ flashes on the Main Screen on each new strike)</li>
              <li><strong>Team scores</strong> — quick ±5 adjustments</li>
              <li><strong>🔁 Reset Round</strong> — clears strikes &amp; answer reveals for the current question</li>
              <li><strong>🔄 Reset Game Session</strong> — full reset (scores, strikes, all reveals)</li>
            </ul>

            <h4>🃏 Middle Pane — Answer Reveals (regular rounds)</h4>
            <ul>
              <li>Click any answer in the list to reveal it on the Main Screen (with a flip animation + ding)</li>
              <li>Each answer&apos;s point value is added to the active team&apos;s score on reveal</li>
              <li>Use the strike controls here too if it&apos;s easier than the left pane</li>
            </ul>

            <h4>🏆 Right Pane — Team Scores &amp; Active Team</h4>
            <ul>
              <li>Manual ± buttons for each team&apos;s score</li>
              <li>Toggle which team has control — the active team is shown with a gold highlight on the Main Screen</li>
            </ul>

            <h4>⚡ Fast Money Pane (Round 6)</h4>
            <ul>
              <li><strong>Player 1 / Player 2</strong> toggle — switching to Player 2 automatically hides Player 1&apos;s answers on the Main Screen</li>
              <li><strong>Q1–Q5 navigation</strong>: ⬅ Prev / Next ➡ / <strong>↩ Q1</strong> jump (handy when starting Player 2&apos;s turn)</li>
              <li><strong>Reveal Question</strong> — shows the FM question text on the Main Screen</li>
              <li><strong>Type the player&apos;s answer</strong> — or click any item in the Answer Bank to fill it instantly</li>
              <li><strong>Reveal Answer</strong> → <strong>Reveal Points</strong> — appears on the Main Screen with a sound</li>
              <li><strong>No Correct (0)</strong> — for wrong/skipped answers, plays a buzzer</li>
              <li><strong>Timer</strong> — Start / Pause / Reset; appears top-right of the Main Screen</li>
            </ul>
          </div>
        </details>

        {/* ── Game Flow ───────────────────────────────────────────── */}
        <details className={styles.section}>
          <summary className={styles.sectionSummary}>🎯 Standard Game Flow</summary>
          <div className={styles.sectionBody}>
            <ol>
              <li>
                <strong>Rounds 1–4:</strong> Reveal the question → ask audience → click answers as the
                team gets them → 3 strikes flips control to the other team for a steal.
              </li>
              <li>
                <strong>Sudden Death (Round 5):</strong> Used as a tiebreaker if needed — one
                question, fastest correct answer wins.
              </li>
              <li>
                <strong>Fast Money (Round 6):</strong>
                <ul>
                  <li>Player 1 answers all 5 questions (timed).</li>
                  <li>Operator switches to Player 2 — Player 1&apos;s answers auto-hide on the Main Screen.</li>
                  <li>Player 2 answers the same 5 questions.</li>
                  <li>Combined point total decides the winner.</li>
                </ul>
              </li>
            </ol>
            <p className={styles.tip}>
              💡 <strong>Tip:</strong> Use the <em>↩ Q1</em> jump button at the start of Player 2&apos;s
              turn — much faster than clicking Prev four times.
            </p>
          </div>
        </details>

        {/* ── Troubleshooting ─────────────────────────────────────── */}
        <details className={styles.section}>
          <summary className={styles.sectionSummary}>🛟 Tips &amp; Troubleshooting</summary>
          <div className={styles.sectionBody}>
            <ul>
              <li>
                <strong>Main Screen seems stuck or missing updates?</strong> Hard-refresh both
                tabs with <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd> (Mac: <kbd>⌘</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd>).
              </li>
              <li>
                <strong>Wrong round showing?</strong> In the Operator&apos;s Left Pane, pick the correct
                round and click <em>🔀 Switch to Selected Round</em>.
              </li>
              <li>
                <strong>Strikes / reveals from a previous game?</strong> Use <em>🔁 Reset Round</em>
                (current question only) or <em>🔄 Reset Game Session</em> (full reset).
              </li>
              <li>
                <strong>No sound effects?</strong> Most browsers block audio until you click
                something — press any button on the Operator Panel first.
              </li>
              <li>
                <strong>Use two devices.</strong> The Main Screen on the projector / TV, and the
                Operator Panel on a laptop or tablet you keep with you.
              </li>
              <li>
                <strong>Internet hiccup?</strong> All state is in Supabase — refresh either tab and
                it picks up exactly where you left off.
              </li>
            </ul>
          </div>
        </details>
      </div>
    </details>
  );
}
