/**
 * Supervision Memo Builder
 * Formats the session's supervision context — the goal (FR-013), the
 * active engineer directives (FR-030), the agent's reminders
 * (FR-020), the solved-items log (FR-014), and the prior-critiques
 * log (FR-015) — into the bounded memo appended to the system
 * prompt before each model call (FR-016). Each section appears
 * only when it has content; a session with nothing to show yields no memo
 * at all, so the system prompt is left untouched. Solved items, critiques,
 * and reminders are capped at configurable maximums, keeping the most
 * recent entries, so the memo cannot grow without limit across a long
 * session (FR-017, FR-023); directives carry their own fixed render
 * budget (FR-032). Pure module: no OpenCode
 * imports, no I/O, no session state — the hook layer (design D4) owns the
 * Maps and passes plain data in.
 */

import type { AuditSeverity } from './auditor.ts';
import { renderDirectives, type DirectiveText } from './directives.ts';
import { renderReminders, type Reminder } from './reminders.ts';

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
  /** Active engineer directives (FR-030); optional so directive-less callers are unchanged. */
  directives?: DirectiveText[];
  /** Agent-set reminders (FR-020); optional so reminder-less callers are unchanged. */
  reminders?: Reminder[];
  solvedItems: SolvedItem[];
  critiques: CritiqueRecord[];
}

export interface MemoLimits {
  /** Cap on solved items shown in the memo (FR-017). */
  maxSolvedItems: number;
  /** Cap on critiques shown in the memo (FR-017). */
  maxCritiques: number;
  /** Cap on reminders stored and shown (FR-023). */
  maxReminders: number;
}

export const DEFAULT_MEMO_LIMITS: MemoLimits = { maxSolvedItems: 5, maxCritiques: 3, maxReminders: 10 };

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
 * Builds the supervision memo (FR-016): the session goal, the agent's
 * reminders (FR-020), recently solved items (FR-014), and recent
 * critiques (FR-015), each section present only when it has content.
 * Reminders, solved items, and critiques are bounded to their most
 * recent entries within the configured caps (FR-017, FR-023). Reminder
 * ids render with their text so `forget_reminder` is usable from the
 * memo alone (FR-021). Both
 * delivered and withheld critiques render, marked with severity and
 * delivery so the agent can tell them apart. When there is nothing to
 * show — no goal, no reminders, and no entries in either log — the memo
 * is null and the caller leaves the system prompt unchanged.
 *
 * @param input The session's supervision state: goal, reminders, solved items, critiques.
 * @param limits Caps on reminders, solved items, and critiques shown; defaults to DEFAULT_MEMO_LIMITS.
 * @returns The memo text with sections joined by blank lines, or null when empty.
 */
export function buildMemo(input: MemoInput, limits: MemoLimits = DEFAULT_MEMO_LIMITS): string | null {
  const goal = input.goal?.trim();
  const directives = input.directives ?? [];
  const reminders = takeMostRecent(input.reminders ?? [], limits.maxReminders);
  const solvedItems = takeMostRecent(input.solvedItems, limits.maxSolvedItems);
  const critiques = takeMostRecent(input.critiques, limits.maxCritiques);

  if (
    !goal &&
    directives.length === 0 &&
    reminders.length === 0 &&
    solvedItems.length === 0 &&
    critiques.length === 0
  ) {
    return null;
  }

  const sections: string[] = [];

  if (goal) {
    sections.push(`Session goal:\n${goal}`);
  }

  if (directives.length > 0) {
    const rendered = renderDirectives(directives);
    if (rendered !== null) {
      sections.push(rendered);
    }
  }

  if (reminders.length > 0) {
    const rendered = renderReminders(reminders, limits.maxReminders);
    if (rendered !== null) {
      sections.push(rendered);
    }
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
