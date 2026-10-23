/**
 * Supervision Memo Builder
 * Formats the session's supervision context — the goal (FR-013), the
 * solved-items log (FR-014), and the prior-critiques log (FR-015) — into
 * the bounded memo appended to the system prompt before each model call
 * (FR-016). Each section appears only when it has content; a session with
 * nothing to show yields no memo at all, so the system prompt is left
 * untouched. Solved items and critiques are capped at configurable
 * maximums, keeping the most recent entries, so the memo cannot grow
 * without limit across a long session (FR-017). Pure module: no OpenCode
 * imports, no I/O, no session state — the hook layer (design D4) owns the
 * Maps and passes plain data in.
 */

import type { AuditSeverity } from './auditor.ts';

export interface SolvedItem {
  /** Tool name from the completed call (FR-014). */
  tool: string;
  /** Short outcome summary recorded when the call completed (FR-014). */
  outcome: string;
}

export interface CritiqueRecord {
  text: string;
  severity: AuditSeverity;
  /** Whether the critique was delivered to the session or withheld (FR-015 records both). */
  delivered: boolean;
}

export interface MemoInput {
  /** Session goal — the first user message (FR-013); absent until captured. */
  goal?: string;
  solvedItems: SolvedItem[];
  critiques: CritiqueRecord[];
}

export interface MemoLimits {
  /** Cap on solved items shown in the memo (FR-017). */
  maxSolvedItems: number;
  /** Cap on critiques shown in the memo (FR-017). */
  maxCritiques: number;
}

export const DEFAULT_MEMO_LIMITS: MemoLimits = { maxSolvedItems: 5, maxCritiques: 3 };

/**
 * Bounds a log to its most recent entries (FR-017): the end of the array
 * is the most recent entry, so bounding keeps the tail. A cap of zero or
 * less yields no entries — `slice(-0)` would return the whole array,
 * since -0 === 0.
 */
function takeMostRecent<T>(items: T[], cap: number): T[] {
  if (cap <= 0) {
    return [];
  }
  return items.slice(-cap);
}

/**
 * Builds the supervision memo (FR-016): the session goal, recently solved
 * items (FR-014), and recent critiques (FR-015), each section present
 * only when it has content. Solved items and critiques are bounded to
 * their most recent entries within the configured caps (FR-017). Both
 * delivered and withheld critiques render, marked with severity and
 * delivery so the agent can tell them apart. When there is nothing to
 * show — no goal and no entries in either log — the memo is null and the
 * caller leaves the system prompt unchanged.
 *
 * @param input The session's supervision state: goal, solved items, critiques.
 * @param limits Caps on solved items and critiques shown; defaults to DEFAULT_MEMO_LIMITS.
 * @returns The memo text with sections joined by blank lines, or null when empty.
 */
export function buildMemo(input: MemoInput, limits: MemoLimits = DEFAULT_MEMO_LIMITS): string | null {
  const goal = input.goal?.trim();
  const solvedItems = takeMostRecent(input.solvedItems, limits.maxSolvedItems);
  const critiques = takeMostRecent(input.critiques, limits.maxCritiques);

  if (!goal && solvedItems.length === 0 && critiques.length === 0) {
    return null;
  }

  const sections: string[] = [];

  if (goal) {
    sections.push(`Session goal:\n${goal}`);
  }

  if (solvedItems.length > 0) {
    const lines = solvedItems.map((item) => `- ${item.tool}: ${item.outcome}`);
    sections.push(`Recently solved:\n${lines.join('\n')}`);
  }

  if (critiques.length > 0) {
    const lines = critiques.map((critique) => {
      const delivery = critique.delivered ? 'delivered' : 'withheld';
      return `- [${critique.severity}, ${delivery}] ${critique.text}`;
    });
    sections.push(`Recent critiques:\n${lines.join('\n')}`);
  }

  return sections.join('\n\n');
}
