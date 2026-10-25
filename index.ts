/**
 * opencode-supervisor — OpenCode Process Supervision hook layer
 *
 * Thin `@opencode-ai/plugin` module (design D1): `server(input,
 * options)` returns hooks that observe completed reasoning parts
 * (`event`), capture the session goal (`chat.message`), guard tool
 * execution (`tool.execute.before` / `tool.execute.after`), offer
 * the agent self-serve reminder tools (`tool`, FR-020/FR-021),
 * load and enforce engineer directives (FR-026..FR-032), and inject
 * the supervision memo (`experimental.chat.system.transform`). All
 * audit logic lives in the pure `src/` modules; this file owns the
 * per-session state (design D4), config resolution (session plugin
 * config → environment → `pluginConfig` defaults), the D2
 * `invokeModel` adapter that drives a dedicated auditor side session
 * through `input.client.session.prompt` — never the supervised
 * conversation (FR-004) — and the fail-open directive loader
 * (FR-032). Supervision fails open (FR-005): no hook path may
 * crash or stall the supervised session, except the tool guard's
 * deliberate block throw (spike 1.3).
 *
 * Runtime: Bun / TypeScript. Entry: default-exported PluginModule
 * (spike 1.4 — file-source plugins must carry `id`).
 */

import { tool, type Hooks, type PluginInput, type PluginModule, type PluginOptions } from '@opencode-ai/plugin';
import {
  resolveAuditorConfig,
  runPeerAudit,
  type AuditConfig,
  type AuditSeverity,
  type InvokeModel,
} from './src/auditor.ts';
import { stripNarrative } from './src/stripper.ts';
import { extractArgPaths, verifyToolIntent, type ToolVerificationResult } from './src/tool-guard.ts';
import { buildMemo, DEFAULT_MEMO_LIMITS, type CritiqueRecord, type MemoLimits, type SolvedItem } from './src/memo.ts';
import {
  addReminder,
  clearReminder,
  prepareReminderText,
  type Reminder,
} from './src/reminders.ts';
import {
  activeDirectives,
  compileEnforcement,
  matchTriggers,
  MAX_DIRECTIVES,
  parseDirectives,
  parseOptionsDirectives,
  renderDirectivesAdvisory,
  type Directive,
} from './src/directives.ts';
import fs from 'node:fs';
import path from 'node:path';

// ── Configuration (session plugin config → environment → defaults) ──

/** Environment names for the hook-layer knobs, following the OPENCODE_SUPERVISOR_* convention. */
const ENV_MAX_REGENERATIONS = 'OPENCODE_SUPERVISOR_MAX_REGENERATIONS';
const ENV_STRIP_MODE = 'OPENCODE_SUPERVISOR_STRIP_MODE';
const ENV_BLOCK_REWARD_HACKING = 'OPENCODE_SUPERVISOR_BLOCK_REWARD_HACKING';
const ENV_REQUIRE_STEP_REFERENCE = 'OPENCODE_SUPERVISOR_REQUIRE_STEP_REFERENCE_IN_TOOLS';
const ENV_MEMO_MAX_SOLVED_ITEMS = 'OPENCODE_SUPERVISOR_MEMO_MAX_SOLVED_ITEMS';
const ENV_MEMO_MAX_CRITIQUES = 'OPENCODE_SUPERVISOR_MEMO_MAX_CRITIQUES';
const ENV_MEMO_MAX_REMINDERS = 'OPENCODE_SUPERVISOR_MEMO_MAX_REMINDERS';

/**
 * Hook-layer configuration: the auditor's `AuditConfig` plus the memo
 * bounds (FR-017). Resolved per use by `resolveHookConfig` with the
 * precedence session plugin config → environment → `pluginConfig`.
 */
export interface HookConfig extends AuditConfig {
  /** Caps on memo solved items, critiques, and reminders (FR-017, FR-023). */
  memoLimits: MemoLimits;
}

/**
 * Plugin defaults — the lowest precedence tier. Model/variant defaults
 * are preserved from the v0 middleware; `OPENCODE_SUPERVISOR_MODEL` /
 * `OPENCODE_SUPERVISOR_VARIANT` remain the model overrides (applied by
 * `resolveAuditorConfig`). The v0 HTTP-endpoint auditor fallback is
 * gone: audits run only through the side session (D2).
 */
export const pluginConfig: HookConfig = {
  auditorModel: 'google/gemini-3.8-flash',
  auditorVariant: 'low',
  stripMode: 'code_and_math',
  maxRegenerations: 2,
  blockRewardHacking: true,
  requireStepReferenceInTools: true,
  memoLimits: { ...DEFAULT_MEMO_LIMITS },
};

/**
 * Plugin version for the module-identity log line (review finding #20) —
 * kept in sync with `package.json` so runtime logs identify the loaded
 * build. `package.json` cannot be imported from here without a build
 * step, so the constant is the source of truth for the log prefix.
 */
const PLUGIN_VERSION = '2.2.0';

/** Emits the module-identity log line once per process (plugin load = first `server()` invocation, spike 1.4). */
let identityLogged = false;

/** Session shape carrying plugin config overrides — the same key `resolveAuditorConfig` reads, so one override object governs the whole plugin. */
const PLUGIN_CONFIG_KEY = 'opencode-supervisor';

interface SessionWithPluginConfig {
  config?: { plugins?: Record<string, unknown> };
}

function sessionOverrides(session?: SessionWithPluginConfig): Record<string, unknown> {
  const overrides = session?.config?.plugins?.[PLUGIN_CONFIG_KEY];
  return typeof overrides === 'object' && overrides !== null ? (overrides as Record<string, unknown>) : {};
}

function memoLimitOverrides(value: unknown): Partial<MemoLimits> {
  return typeof value === 'object' && value !== null ? (value as Partial<MemoLimits>) : {};
}

function envText(name: string): string | undefined {
  const raw = typeof process !== 'undefined' ? process.env?.[name] : undefined;
  return raw === undefined || raw === '' ? undefined : raw;
}

/** Non-negative finite numbers only; anything else falls through (fail-open). */
function envNumber(name: string): number | undefined {
  const parsed = Number(envText(name));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function envBoolean(name: string): boolean | undefined {
  const raw = envText(name);
  return raw === 'true' ? true : raw === 'false' ? false : undefined;
}

function pickNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function pickBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function pickStripMode(value: unknown): HookConfig['stripMode'] | undefined {
  return value === 'code_and_math' || value === 'balanced' || value === 'strict' ? value : undefined;
}

/**
 * Resolves the effective hook-layer configuration with precedence
 * session plugin config → environment → `pluginConfig` defaults,
 * following `resolveAuditorConfig`'s established pattern (which owns the
 * model/variant tiers). `??` rather than `||` throughout: `false` and
 * `0` are meaningful settings and must not fall through to the defaults.
 *
 * Runtime reachability note (review finding #6, verified against
 * `@opencode-ai/plugin` 1.19.4): every hook receives only a
 * `sessionID` — no hook payload carries a session object with plugin
 * config (the `chat.params` input exposes sessionID, agent, model,
 * provider, and message, but no plugin config), so the session tier is
 * unreachable from the hook paths and exists for direct callers and
 * unit tests. The documented runtime chain is environment → defaults.
 *
 * @param session Optional session object carrying plugin config overrides.
 * @returns The resolved hook-layer configuration.
 */
export function resolveHookConfig(session?: SessionWithPluginConfig): HookConfig {
  const overrides = sessionOverrides(session);
  const memoOverrides = memoLimitOverrides(overrides.memoLimits);
  const base = resolveAuditorConfig(pluginConfig, session);
  return {
    ...base,
    maxRegenerations:
      pickNumber(overrides.maxRegenerations) ?? envNumber(ENV_MAX_REGENERATIONS) ?? base.maxRegenerations,
    stripMode: pickStripMode(overrides.stripMode) ?? pickStripMode(envText(ENV_STRIP_MODE)) ?? base.stripMode,
    blockRewardHacking:
      pickBoolean(overrides.blockRewardHacking) ?? envBoolean(ENV_BLOCK_REWARD_HACKING) ?? base.blockRewardHacking,
    requireStepReferenceInTools:
      pickBoolean(overrides.requireStepReferenceInTools) ??
      envBoolean(ENV_REQUIRE_STEP_REFERENCE) ??
      base.requireStepReferenceInTools,
    memoLimits: {
      maxSolvedItems:
        pickNumber(memoOverrides.maxSolvedItems) ?? envNumber(ENV_MEMO_MAX_SOLVED_ITEMS) ?? pluginConfig.memoLimits.maxSolvedItems,
      maxCritiques:
        pickNumber(memoOverrides.maxCritiques) ?? envNumber(ENV_MEMO_MAX_CRITIQUES) ?? pluginConfig.memoLimits.maxCritiques,
      maxReminders:
        pickNumber(memoOverrides.maxReminders) ?? envNumber(ENV_MEMO_MAX_REMINDERS) ?? pluginConfig.memoLimits.maxReminders,
    },
  };
}

// ── Session state (design D4) ──────────────────────────────────────

/** One session's supervision state (design D4): plugin-owned, in-process only. */
export interface SessionState {
  /** Session goal — the first user message (FR-013; captured by `chat.message`). */
  goal: string | undefined;
  /** Reasoning steps that passed audit — the verified trace (FR-006; recorded in 3.2). */
  verifiedSteps: string[];
  /** Steer critiques delivered this session, bounded by maxRegenerations (FR-007). */
  critiqueCount: number;
  /** Bounded solved-items log (FR-014; appended by `tool.execute.after`). */
  solvedItems: SolvedItem[];
  /** Delivered and withheld critiques (FR-015). */
  critiqueLog: CritiqueRecord[];
  /** Agent-set reminders (FR-020), stored bounded to the most recent (FR-023). */
  reminders: Reminder[];
  /** Monotonic reminder-id sequence (design D3): ids are `r<n>` and never recycled. */
  reminderSeq: number;
  /** Directive ids whose `when` rules matched a tool call (FR-029), deduped for the session. */
  triggeredDirectives: string[];
  /**
   * Reasoning-part identities already observed, keyed
   * `sessionID:messageID:partID` (spike 1.1), so duplicate audits are
   * structurally impossible (FR-001).
   */
  seenParts: Set<string>;
}

/** Module-level state (design D4), keyed by session ID. */
const sessions = new Map<string, SessionState>();

function emptySessionState(): SessionState {
  return {
    goal: undefined,
    verifiedSteps: [],
    critiqueCount: 0,
    solvedItems: [],
    critiqueLog: [],
    reminders: [],
    reminderSeq: 0,
    triggeredDirectives: [],
    seenParts: new Set(),
  };
}

/**
 * Session-state accessor (design D4). `get` initializes the session's
 * entry on first access (get/init) and returns the live object — array
 * and Set mutations write through. `peek` reads without initializing,
 * for read-only consumers (the memo transform) that must not create
 * state as a lookup side effect. `cleanup` drops one session's state;
 * `clearAll` backs `dispose`. No persistence: state dies with the
 * opencode process, matching v0 behavior.
 */
export const sessionState = {
  /**
   * Gets (initializing on first access) the live supervision state.
   * @param sessionId The supervised session's ID.
   * @returns The session's state; mutations write through to the Map.
   */
  get(sessionId: string): SessionState {
    const existing = sessions.get(sessionId);
    if (existing !== undefined) {
      return existing;
    }
    const created = emptySessionState();
    sessions.set(sessionId, created);
    return created;
  },
  /**
   * Peeks at the session's supervision state without initializing it.
   * @param sessionId The supervised session's ID.
   * @returns The session's live state, or undefined when none exists.
   */
  peek(sessionId: string): SessionState | undefined {
    return sessions.get(sessionId);
  },
  /**
   * Drops one session's supervision state.
   * @param sessionId The supervised session's ID.
   */
  cleanup(sessionId: string): void {
    sessions.delete(sessionId);
  },
  /** Drops every session's state (dispose). */
  clearAll(): void {
    sessions.clear();
  },
};

/**
 * Live auditor side-session IDs — self-suppression for the plugin's
 * own machinery (review iteration 2, HIGH finding). The plugin host
 * dispatches every bus event in the plugin's directory to these
 * hooks, and `createInvokeModel` creates its side sessions with the
 * SAME `query: { directory }` — so without suppression the auditor
 * model's own reasoning parts re-enter the `event` hook (recursively
 * spawning further side sessions with a reasoning-emitting auditor),
 * `chat.message` can capture the audit prompt as a side-session
 * goal, and the system transform can inject the supervision memo
 * into the audit calls. Every hook short-circuits when the incoming
 * session ID is in this set: the pipeline supervises the target
 * conversation, not the plugin's own machinery (FR-001/D2 intent).
 * `createInvokeModel` adds an ID the moment `create` resolves —
 * before prompting — and discards it when the side session is
 * cleaned up, so the set tracks exactly the live side sessions.
 */
const auditorSessionIds = new Set<string>();

/**
 * Whether `sessionId` names one of the plugin's own live auditor
 * side sessions (see `auditorSessionIds`) — the self-suppression
 * check every hook runs before any other logic.
 *
 * @param sessionId The incoming hook's session ID, when present.
 * @returns True when the session is the plugin's own machinery.
 */
function isAuditorSessionId(sessionId: string | undefined): boolean {
  return sessionId !== undefined && auditorSessionIds.has(sessionId);
}

// ── Memo inputs (task 3.4): goal text, solved outcomes, bounds ────

/** Maximum length of a stored solved-item outcome (FR-014 "short outcome"), ellipsis included. */
const SOLVED_OUTCOME_MAX_LENGTH = 80;

/**
 * Prefix of the raw tool output `solvedOutcome` inspects (review
 * iteration 2, LOW): slicing BEFORE collapsing keeps the per-call
 * work constant regardless of output size — tool outputs can be
 * enormous, and regex-collapsing them whole made the cost
 * proportional to that size. The prefix is 2.5x the rendered
 * bound, so outcomes for outputs under it are byte-identical to
 * the unbounded form; beyond it, content past the prefix cannot
 * influence an 80-character summary.
 */
const SOLVED_OUTCOME_PREFIX_LENGTH = 200;

/**
 * Extracts a chat message's user-authored text (FR-013): the joined,
 * trimmed text of its non-synthetic text parts. Synthetic parts — this
 * plugin's own critiques, host auto-continues, other plugins'
 * injections — are not user input and must never become the goal;
 * non-text parts carry no user prose. Structurally defensive (FR-005):
 * an odd payload yields empty text — no goal — rather than a throw.
 *
 * @param parts The message's parts, when present.
 * @returns The joined, trimmed user text; empty when there is none.
 */
function userMessageText(parts: unknown): string {
  if (!Array.isArray(parts)) {
    return '';
  }
  const texts: string[] = [];
  for (const part of parts) {
    if (typeof part === 'object' && part !== null && part.type === 'text' && part.synthetic !== true) {
      if (typeof part.text === 'string') {
        texts.push(part.text);
      }
    }
  }
  return texts.join('\n\n').trim();
}

/**
 * Derives a solved item's short outcome (FR-014): the tool output
 * collapsed to a single line (whitespace runs become one space — each
 * memo entry must stay one line) and truncated to
 * SOLVED_OUTCOME_MAX_LENGTH characters, ellipsis included. The
 * collapse input is sliced to a bounded prefix first (review
 * iteration 2, LOW) so the per-call work is constant rather than
 * proportional to tool-output size. The
 * `tool.execute.after` typings expose no error field (only
 * title/output/metadata), so an absent or unreadable output logs the
 * brief placeholder 'completed' — the call did complete, which is all
 * the memo line claims.
 *
 * @param output The hook's output payload, when present.
 * @returns The bounded single-line outcome summary.
 */
function solvedOutcome(output: unknown): string {
  const raw =
    typeof output === 'object' && output !== null && typeof (output as { output?: unknown }).output === 'string'
      ? (output as { output: string }).output
      : '';
  // Slice to the bounded prefix BEFORE collapsing (review iteration
  // 2, LOW): constant per-call work; under-prefix outputs unchanged.
  const collapsed = raw.slice(0, SOLVED_OUTCOME_PREFIX_LENGTH).replace(/\s+/g, ' ').trim();
  if (collapsed === '') {
    return 'completed';
  }
  if (collapsed.length <= SOLVED_OUTCOME_MAX_LENGTH) {
    return collapsed;
  }
  return `${collapsed.slice(0, SOLVED_OUTCOME_MAX_LENGTH - 3)}...`;
}

/**
 * Appends to a most-recent-bounded log — the storage side of FR-017.
 * Pushes the entry, then trims the array in place to its `cap` most
 * recent entries (the tail — the same end `buildMemo` renders from).
 *
 * Storage is trimmed to exactly the render cap with NO headroom
 * factor, a deliberate choice: `buildMemo` can never render more than
 * the cap, both bounds read the same memoLimits resolution chain
 * (session config → environment → defaults), and a lowered cap only
 * discards entries that could never render — so anything beyond the
 * cap is pure memory waste in a long session. Trimming mutates the
 * existing array (`splice`/`length`), never replacing it, so live
 * state references stay valid. A cap of zero or less keeps nothing.
 *
 * @param log The session-state log array to append to.
 * @param entry The entry to append.
 * @param cap The maximum number of entries to store.
 */
function appendBounded<T>(log: T[], entry: T, cap: number): void {
  log.push(entry);
  if (cap <= 0) {
    log.length = 0;
    return;
  }
  if (log.length > cap) {
    log.splice(0, log.length - cap);
  }
}

// ── D2: auditor side-session adapter ───────────────────────────────

// The plugin package does not re-export the SDK types, so derive them
// from the client (the .opencode/lib/agent-executor.ts convention).
type SessionPromptOptions = Parameters<PluginInput['client']['session']['prompt']>[0];
type SessionPromptResponse = Awaited<ReturnType<PluginInput['client']['session']['prompt']>>;
type SessionPromptPart = NonNullable<SessionPromptResponse['data']>['parts'][number];

/** Prompt body augmented with `variant`, which the SDK typings lag (agent-executor convention). */
type PromptBodyWithVariant = NonNullable<SessionPromptOptions['body']> & { variant?: string };

function errorText(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error) ?? 'unknown error';
  } catch {
    return 'unknown error';
  }
}

/**
 * Formats a failed client response for a rejection message: the error
 * payload when present, otherwise the HTTP status. Mirrors
 * agent-executor's `responseFailure`, trimmed to the adapter's needs.
 *
 * @param label What operation failed.
 * @param response The client response that carried no usable data.
 * @returns A human-readable failure description.
 */
function responseFailure(label: string, response: { error?: unknown; response?: { status?: number } }): string {
  if (response.error !== undefined && response.error !== null) {
    return `${label}: ${errorText(response.error)}`;
  }
  const status = response.response?.status;
  return status !== undefined ? `${label}: HTTP ${status}` : `${label}: missing response data`;
}

/**
 * Splits a "<provider>/<model-id>" slug the way agent-executor's
 * `directModelIdentity` does.
 *
 * @param model The configured auditor model slug.
 * @returns The provider/model pair, or null when the slug is malformed.
 */
function splitModelSlug(model: string): { providerID: string; modelID: string } | null {
  const separator = model.indexOf('/');
  if (separator <= 0 || separator === model.length - 1) {
    return null;
  }
  return { providerID: model.slice(0, separator), modelID: model.slice(separator + 1) };
}

/**
 * Lenient response-text extraction (design D2): joins the response's
 * non-ignored text parts. Structurally defensive so a runtime shape
 * drift yields empty text (and a rejection upstream) rather than a crash.
 *
 * @param parts The prompted message's parts, when present.
 * @returns The joined, trimmed response text.
 */
function extractResponseText(parts: readonly SessionPromptPart[] | undefined): string {
  if (!Array.isArray(parts)) {
    return '';
  }
  return parts
    .filter((part): part is Extract<SessionPromptPart, { type: 'text' }> => part.type === 'text' && part.ignored !== true)
    .map((part) => part.text)
    .join('\n\n')
    .trim();
}

/**
 * Builds the D2 `invokeModel` adapter: each call creates a dedicated
 * auditor side session — never the supervised conversation (FR-004) —
 * and prompts it with the configured auditor model/variant, mirroring
 * `.opencode/lib/agent-executor.ts`'s session.create/session.prompt call
 * shapes. A fresh session per audit keeps the peer audit stateless per
 * call (FR-001) with no cross-audit context bleed. The side session's
 * ID is registered for hook self-suppression the moment `create`
 * resolves — before prompting — and discarded at cleanup (review
 * iteration 2, HIGH; see `auditorSessionIds`). The side session is
 * deleted on EVERY exit path (review finding #10, widened to the
 * failure paths by review iteration 2): it is ephemeral scaffolding,
 * and without deletion N persistent `supervisor-audit @ ...` sessions
 * accumulate per audit — including failed audits, which in the
 * designed degradation mode (unauthenticated auditor) is every
 * audit. Deletion runs fail-open in its own try/catch — a delete
 * failure logs, never fails the audit, and never masks the original
 * error on a failure path. Failures still reject so `runPeerAudit`'s
 * fail-open path (FR-005) records them.
 *
 * @param client The plugin input's OpenCode HTTP client.
 * @param directory The project directory scoping the side session.
 * @returns The InvokeModel function driving the auditor side session.
 */
export function createInvokeModel(client: PluginInput['client'], directory: string): InvokeModel {
  return async (prompt: string, config: AuditConfig): Promise<string> => {
    const identity = splitModelSlug(config.auditorModel);
    if (identity === null) {
      throw new Error(`auditor model '${config.auditorModel}' is not a <provider>/<model-id> slug`);
    }
    const created = await client.session.create({
      body: {
        title: `supervisor-audit @ ${config.auditorModel} (${config.auditorVariant})`,
      },
      query: { directory },
    });
    const auditorSessionID = created.data?.id;
    if (auditorSessionID === undefined) {
      throw new Error(responseFailure('auditor side session create failed', created));
    }
    // Self-suppression (review iteration 2, HIGH): register the side
    // session BEFORE prompting — from this moment its bus events must
    // not re-enter the hooks (see `auditorSessionIds`).
    auditorSessionIds.add(auditorSessionID);
    // Best-effort delete of the ephemeral side session, fail-open in
    // its own try/catch (review finding #10): a delete failure logs
    // and never fails the audit — and never masks the original error
    // when invoked from a failure path below.
    const deleteSideSession = async (): Promise<void> => {
      try {
        const deleted = await client.session.delete({ path: { id: auditorSessionID } });
        if (deleted.error !== undefined && deleted.error !== null) {
          console.error(`[supervisor] ${responseFailure('auditor side session delete failed', deleted)}`);
        }
      } catch (error) {
        console.error(`[supervisor] auditor side session delete failed open: ${errorText(error)}`);
      }
    };
    try {
      const body: PromptBodyWithVariant = {
        model: { providerID: identity.providerID, modelID: identity.modelID },
        variant: config.auditorVariant,
        parts: [{ type: 'text', text: prompt }],
      };
      const prompted = await client.session.prompt({
        path: { id: auditorSessionID },
        query: { directory },
        body,
      });
      if (prompted.data === undefined) {
        throw new Error(responseFailure('auditor side session prompt failed', prompted));
      }
      if (prompted.data.info.error !== undefined) {
        throw new Error(`auditor side session message error: ${errorText(prompted.data.info.error)}`);
      }
      const text = extractResponseText(prompted.data.parts);
      if (text === '') {
        throw new Error('auditor side session returned no response text');
      }
      // Success path: delete exactly once, now that the audit result
      // is secured (text extracted).
      await deleteSideSession();
      return text;
    } catch (error) {
      // Failure paths delete too (review iteration 2, MEDIUM
      // resource-leak finding): prompt transport rejection, missing
      // prompt data, in-band message error, and empty extracted text
      // all used to throw past the delete — in the designed
      // degradation mode (unauthenticated auditor) every audit takes
      // a failure path, leaking one stored session per audit. Delete
      // best-effort, then rethrow so runPeerAudit's fail-open path
      // (FR-005) records the original error as before.
      await deleteSideSession();
      throw error;
    } finally {
      // Discard the self-suppression registration with the session
      // itself: once deleted, the side session no longer exists, so
      // no further events can carry this ID.
      auditorSessionIds.delete(auditorSessionID);
    }
  };
}

// ── Critique delivery (task 3.3; FR-007/FR-008, spike 1.2) ────────

/** One failed-audit critique bound for the supervised session. */
interface CritiqueDeliveryRequest {
  /** The supervised session that produced the failed step. */
  sessionID: string;
  /** The auditor's critique, carried verbatim under the framing prefix. */
  critique: string;
  /** Failure classification (design D3); the caller defaults absent severity to minor. */
  severity: AuditSeverity;
  /** Resolved hook config supplying the maxRegenerations bound. */
  config: HookConfig;
  /** The session's live state — critiqueCount and critiqueLog write through. */
  state: SessionState;
}

/**
 * Frames a critique for delivery (spike 1.2): a minimal, consistent
 * corrective prefix so the user-role synthetic message reads as an
 * audit finding to address rather than a fresh user request. The
 * critique itself is carried verbatim.
 *
 * @param critique The auditor's critique.
 * @returns The text of the delivered synthetic user part.
 */
function critiqueMessage(critique: string): string {
  return `[supervisor] audit finding — correct the failed step and continue:\n${critique}`;
}

/**
 * Builds the critique-delivery boundary (task 3.3) bound to the plugin
 * input's client, mirroring `createInvokeModel`'s binding. Minor
 * failures steer the supervised session's next turn (FR-007); severe
 * failures interrupt first (FR-008) — `session.abort` MUST precede the
 * delivery or it kills the corrective turn it exists to start
 * (spike 1.2). Both severities deliver through `session.promptAsync`
 * (the 204 fire-and-forget call — never the sync `session.prompt`,
 * whose HTTP response stays open for the whole steered turn) as a
 * synthetic-marked user part: V1 has no delivery option, so steer is
 * emergent (spike 1.2).
 *
 * The bound: `maxRegenerations` caps the whole intervention per
 * session — the severe abort AND the delivered critique. Critique
 * turns emit new reasoning parts that re-enter the audit pipeline, so
 * the cap is the loop guard; the live smoke test (design.md,
 * FR-008 side finding) observed the unbounded-abort wedge — after the
 * bound was spent, markers re-quoted from history kept triggering
 * aborts every turn with no escape — so the same knob now bounds the
 * abort too (decision amendment, review findings #2/#8). Over the
 * bound a severe finding neither aborts nor delivers: it is recorded
 * in `critiqueLog` as withheld (FR-015). The delivery slot is
 * reserved immediately after the bound check, before ANY await, on
 * every path (review iteration 2, MEDIUM: the `event` hook is
 * fire-and-forget and audits run concurrently, so check-and-reserve
 * must be atomic — the old severe path let two concurrent findings
 * both pass the check before either incremented). Slot release on
 * delivery failure is asymmetric: the MINOR path releases (no side
 * effect fired — only delivered critiques count), while the SEVERE
 * path keeps the slot once the abort has been attempted — the
 * intervention (interrupt) already fired, and releasing it would let
 * persistent promptAsync failures with succeeding aborts recur
 * without spending the bound, contradicting the bounded-intervention
 * amendment above. Either way the failed critique is recorded as
 * withheld; the log itself is storage-bounded to
 * `memoLimits.maxCritiques` (FR-017, most-recent, via `appendBounded`)
 * so long sessions cannot grow it without limit.
 *
 * Never rejects (FR-005): transport rejections and in-band response
 * errors fail open — logged and recorded as undelivered — because the
 * `event` hook must not reject. `promptAsync`'s 204 means accepted,
 * not delivered; server-side fork failures surface as Event.Error bus
 * events, an accepted fail-open gap (spike 1.2).
 *
 * @param client The plugin input's OpenCode HTTP client.
 * @returns The delivery function the event hook awaits per failed audit.
 */
function createCritiqueDelivery(client: PluginInput['client']): (request: CritiqueDeliveryRequest) => Promise<void> {
  return async ({ sessionID, critique, severity, config, state }) => {
    // FR-007: at most maxRegenerations interventions per session — the
    // bound governs the whole intervention (abort AND steer). Decision
    // amendment (review findings #2/#8, smoke-test FR-008 side finding):
    // the abort previously fired unconditionally even over the bound, so
    // markers re-quoted from history kept interrupting every turn after
    // the bound was spent, wedging the session. Over the bound a severe
    // finding MUST NOT abort and MUST NOT deliver — the critique is
    // recorded as withheld (FR-015) and the delivery returns. The slot
    // reservation below follows this check immediately, before any
    // await, so check-and-reserve stays atomic under concurrent audits.
    if (state.critiqueCount >= config.maxRegenerations) {
      appendBounded(state.critiqueLog, { text: critique, severity, delivered: false }, config.memoLimits.maxCritiques);
      console.warn(
        `[supervisor] critique bound (${config.maxRegenerations}) reached for session ${sessionID}; ` +
          'critique recorded without delivery'
      );
      return;
    }
    // Reserve the delivery slot immediately after the bound check,
    // before ANY await, on every path (review iteration 2, MEDIUM):
    // the event hook is fire-and-forget and audits run concurrently,
    // so a reservation deferred past the severe abort's await let
    // two concurrent findings both pass the bound check. From here
    // the slot is spent; the release rules in the catch below are
    // asymmetric.
    state.critiqueCount += 1;
    // FR-008: severe findings interrupt first, before the delivery —
    // an abort after delivery kills the corrective turn (spike 1.2).
    // Under the bound only (the check above has already returned);
    // the tool guard separately blocks execution of severe findings,
    // so a spent bound still leaves that protection active.
    if (severity === 'severe') {
      try {
        const aborted = await client.session.abort({ path: { id: sessionID } });
        if (aborted.error !== undefined && aborted.error !== null) {
          // In-band HTTP error (the SDK resolves these rather than
          // rejecting); fail open — the delivery below is still attempted.
          console.error(`[supervisor] ${responseFailure('session abort failed', aborted)}`);
        }
      } catch (error) {
        console.error(`[supervisor] session abort failed open: ${errorText(error)}`);
      }
    }
    try {
      const delivered = await client.session.promptAsync({
        path: { id: sessionID },
        body: { parts: [{ type: 'text', text: critiqueMessage(critique), synthetic: true }] },
      });
      if (delivered.error !== undefined && delivered.error !== null) {
        throw new Error(responseFailure('critique delivery failed', delivered));
      }
      // FR-015: record the delivered critique; the log itself is
      // storage-bounded to memoLimits.maxCritiques (FR-017).
      appendBounded(state.critiqueLog, { text: critique, severity, delivered: true }, config.memoLimits.maxCritiques);
    } catch (error) {
      // Transport failure (FR-005 fail-open): record the attempt as
      // withheld so the memo can still surface it. Slot release is
      // asymmetric (review iteration 2): the MINOR path releases the
      // reserved slot — no side effect fired, only delivered critiques
      // count; the SEVERE path keeps it — once the abort has been
      // attempted the intervention (interrupt) already fired, and
      // releasing the slot would let persistent promptAsync failures
      // with succeeding aborts recur without spending the bound,
      // contradicting the "whole intervention is bounded" amendment.
      if (severity !== 'severe') {
        state.critiqueCount -= 1;
      }
      appendBounded(state.critiqueLog, { text: critique, severity, delivered: false }, config.memoLimits.maxCritiques);
      console.error(`[supervisor] critique delivery failed open: ${errorText(error)}`);
    }
  };
}

// ── Experimental hook registration (D-risk "wrap registration, degrade") ──

/** Hook name for the experimental system-prompt transform (design D1 memo injection). */
const SYSTEM_TRANSFORM_HOOK = 'experimental.chat.system.transform';

/**
 * Structural handler type for the experimental system-transform hook,
 * deliberately NOT derived from `Hooks['experimental...']`: an
 * installed `@opencode-ai/plugin` whose typings drop the experimental
 * key must not break this module. Verified against
 * @opencode-ai/plugin 1.19.4, which declares the hook.
 */
type SystemTransformHandler = (
  input: { sessionID?: string; model: unknown },
  output: { system: string[] }
) => Promise<void>;

/**
 * Registers the experimental system-transform hook through a widened
 * record inside a guarded feature check, so registration degrades
 * gracefully (D-risk "wrap registration, degrade"): a typings or
 * runtime version without the hook loads this plugin memo-less rather
 * than failing, a host that never dispatches the key leaves it inert,
 * and any registration failure is contained — the memo is an
 * enhancement, never a load requirement (fail-open supervision).
 *
 * @param hooks The hook map being assembled by `server`.
 * @param handler The memo-injection handler (task 3.4).
 */
function registerSystemTransform(hooks: Hooks, handler: SystemTransformHandler): void {
  try {
    if (typeof handler !== 'function') {
      return;
    }
    (hooks as Record<string, unknown>)[SYSTEM_TRANSFORM_HOOK] = handler;
  } catch {
    // Memo-less degradation; never fail plugin load.
  }
}

// ── Plugin entry (design D1) ───────────────────────────────────────

/**
 * Loads directive files (FR-026) from
 * `<directory>/.opencode/supervisor/directives/*.md`, sorted by
 * filename for deterministic precedence. A missing or unreadable
 * directory yields no files (fail-open, FR-032) — directive-less
 * projects keep 2.1.0 behavior. I/O lives here in the hook layer
 * (design D3); parsing is pure in src/directives.ts.
 */
const loadDirectiveFiles = (directory: string): { name: string; content: string }[] => {
  try {
    const directivesDir = path.join(directory, '.opencode', 'supervisor', 'directives');
    return fs
      .readdirSync(directivesDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((entry) => ({
        name: entry.name,
        content: fs.readFileSync(path.join(directivesDir, entry.name), 'utf8'),
      }));
  } catch {
    return [];
  }
};

/**
 * Plugin server (design D1): assembles the hook map. The `event` hook
 * runs the full supervision path (tasks 3.2–3.3): synchronous dedupe →
 * strip → deterministic invariants → side-session peer audit →
 * verified-trace recording on pass, bounded critique delivery on
 * failure (steer for minor, interrupt + steer for severe). Task 3.4
 * wires the remaining supervision inputs and outputs: `chat.message`
 * captures the session goal (FR-013), `tool.execute.after` logs
 * bounded solved items (FR-014), and the experimental system
 * transform injects the supervision memo (FR-016). The tool guard
 * (task 3.5) enforces FR-009..FR-012 against the session's live
 * verified trace. Every hook is present, typed, and non-throwing,
 * except the tool guard's sanctioned block throw (spike 1.3).
 *
 * @param input The plugin input (OpenCode HTTP client, project context).
 * @param options Tuple-registration options (`[path, options]` in the
 *   `plugin` array): `options.directives` appends engineer directives
 *   after the file sources (FR-026).
 * @returns The registered hooks.
 */
const server = async (input: PluginInput, options?: PluginOptions): Promise<Hooks> => {
  // Engineer console (FR-026..FR-032): directives are static policy
  // loaded once per plugin start — not per-session state. Files come
  // from `.opencode/supervisor/directives/*.md` in the project
  // directory; tuple registration can add `options.directives`
  // entries after them (D1). Loading is fail-open throughout
  // (FR-032): unreadable directories yield no files, malformed files
  // and invalid rules degrade to warnings, and the combined set is
  // bounded to MAX_DIRECTIVES.
  const directiveFiles = loadDirectiveFiles(input.directory);
  const parsedFiles = parseDirectives(directiveFiles);
  const parsedOptions = parseOptionsDirectives(options?.directives);
  const allDirectives = [...parsedFiles.directives, ...parsedOptions.directives];
  const directives: Directive[] = allDirectives.slice(0, MAX_DIRECTIVES);
  const directiveWarnings = [
    ...parsedFiles.warnings,
    ...parsedOptions.warnings,
    ...(allDirectives.length > MAX_DIRECTIVES
      ? [`${allDirectives.length - MAX_DIRECTIVES} directive(s) beyond the cap of ${MAX_DIRECTIVES} dropped`]
      : []),
  ];
  // D6: compiled enforcement feeds the tool guard (FR-028); the
  // rendered advisory feeds the peer-audit prompt (FR-031).
  const { enforcement, warnings: compileWarnings } = compileEnforcement(directives);
  const directivesAdvisory = renderDirectivesAdvisory(directives);
  for (const warning of [...directiveWarnings, ...compileWarnings]) {
    console.warn(`[supervisor] ${warning}`);
  }
  // Module identity (review finding #20): log the loaded version once
  // per process — plugin load is proven by `server()` invocation
  // (spike 1.4), so this is the load line.
  if (!identityLogged) {
    identityLogged = true;
    // Review iteration 2 (LOW): log the EFFECTIVE auditor, not the
    // pluginConfig default — resolveHookConfig() applies the
    // environment tier (OPENCODE_SUPERVISOR_MODEL / _VARIANT) at the
    // moment the line prints, so an operator with env overrides sees
    // the model actually in use.
    const loaded = resolveHookConfig();
    console.log(
      `[supervisor] v${PLUGIN_VERSION} loaded (auditor: ${loaded.auditorModel}, variant: ${loaded.auditorVariant}${
        directives.length > 0 ? `, directives: ${directives.length}` : ''
      })`
    );
  }
  // D2 adapter (task 3.2): the live audit path's invokeModel, bound
  // once per plugin load to this input's client and project directory
  // (the PluginInput identity the SDK client scopes its queries by).
  // Every audit drives a dedicated auditor side session scoped to the
  // same directory as the supervised conversation (FR-004); tests
  // substitute the client to exercise the path without a network.
  const invokeModel = createInvokeModel(input.client, input.directory);
  // Task 3.3: the critique-delivery boundary, bound to the same client
  // so failed audits steer (or interrupt + steer) the supervised
  // session through the transports spike 1.2 confirmed. It enforces the
  // maxRegenerations bound, records every critique (FR-015), and never
  // rejects (FR-005).
  const deliverCritique = createCritiqueDelivery(input.client);
  const hooks: Hooks = {
    /**
     * Reasoning observation (design D1; spike 1.1, tasks 3.2–3.3).
     * Fire-and-forget: the runtime never awaits a rejection here, so
     * the body catches everything and the returned promise never
     * rejects. Dedupe runs synchronously before any async work
     * (FR-001); the audit then strips narrative (FR-002), runs the
     * deterministic invariants and the side-session peer audit, records
     * passed steps in the verified trace (FR-006), and hands failed
     * audits to the critique-delivery boundary (FR-007/FR-008): steer
     * for minor, interrupt + steer for severe, bounded and recorded.
     */
    event: async ({ event }) => {
      try {
        // Switch on event.type: undeclared types (message.part.delta
        // and friends) arrive at runtime and are not errors (spike 1.1).
        if (event.type !== 'message.part.updated') {
          return;
        }
        const part = event.properties.part;
        // Self-suppression FIRST (review iteration 2, HIGH): the
        // plugin's own side sessions share this directory, so their
        // bus events reach this hook — without this check the
        // auditor's reasoning parts would be audited recursively,
        // recorded as state, and steerable. See `auditorSessionIds`.
        if (isAuditorSessionId(part.sessionID)) {
          return;
        }
        // Completed reasoning parts only: the terminal publication
        // carries the full text once time.end is set (spike 1.1).
        if (part.type !== 'reasoning' || part.time.end === undefined) {
          return;
        }
        const state = sessionState.get(part.sessionID);
        const partKey = `${part.sessionID}:${part.messageID}:${part.id}`;
        if (state.seenParts.has(partKey)) {
          return; // FR-001: duplicate audits are structurally impossible.
        }
        state.seenParts.add(partKey);
        // Task 3.2 — the live audit path. FR-002: strip narrative per
        // config.stripMode BEFORE the invariant checks, the audit, and
        // trace matching; each completed part contributes one step.
        const config = resolveHookConfig();
        const [stepText] = stripNarrative([part.text], config.stripMode);
        // Nothing formal survives stripping: no audit, no model call,
        // nothing recorded (runPeerAudit would no-op; skip even that).
        if (stepText === undefined || stepText === '') {
          return;
        }
        // Deterministic invariants (FR-003) short-circuit inside
        // runPeerAudit before the side-session call; the goal (FR-013,
        // captured by `chat.message`) scopes drift findings whenever
        // present, and the engineer directives (FR-031) add violation
        // criteria whenever configured.
        const outcome = await runPeerAudit([stepText], config, invokeModel, state.goal, directivesAdvisory ?? undefined);
        if (outcome.passed) {
          // FR-006: only passed steps enter the verified trace, in
          // stripped form (FR-002) — the tool guard matches file paths
          // against exactly this text. Fail-open outcomes pass (FR-005),
          // so a degraded auditor never fences the session's tools.
          state.verifiedSteps.push(stepText);
          if (outcome.error !== undefined) {
            console.warn('[supervisor] peer audit failed open; step recorded as passed:', outcome.error);
          }
        } else {
          // Task 3.3 — critique delivery (FR-007/FR-008; spike 1.2). The
          // failed step stays out of the verified trace (FR-006) while
          // the auditor's critique steers the supervised session. An
          // absent severity defaults to minor (design D3, fail-open
          // conservatism: the bounded steer, never the interrupt).
          await deliverCritique({
            sessionID: part.sessionID,
            critique: outcome.critique,
            severity: outcome.severity ?? 'minor',
            config,
            state,
          });
        }
      } catch (error) {
        console.error('[supervisor] event hook failed:', errorText(error));
      }
    },

    /**
     * Goal capture (design D1; task 3.4): the FIRST user message of
     * the session becomes the goal (FR-013) — the audit's scope-drift
     * reference and the memo's "Session goal" line (FR-016). Never
     * replaced once set. Only user-role messages qualify (checked at
     * runtime — the typings type the payload as UserMessage, but a
     * host oddity could carry another role), and only their
     * non-synthetic text parts count: synthetic parts are plugin/host
     * injections, not user input. Whitespace-only text is no goal.
     * Fail-open (FR-005): odd payloads are logged, never thrown.
     */
    'chat.message': async (hookInput, output) => {
      try {
        // Self-suppression first (see `auditorSessionIds`): the audit
        // prompt must never become a side session's goal.
        if (isAuditorSessionId(hookInput.sessionID)) {
          return;
        }
        if (output?.message?.role !== 'user') {
          return; // not a user message (or an odd payload) — no goal
        }
        const state = sessionState.get(hookInput.sessionID);
        if (state.goal !== undefined) {
          return; // FR-013: the first user message wins, permanently
        }
        const text = userMessageText(output?.parts);
        if (text === '') {
          return; // whitespace-only or absent text is no goal
        }
        state.goal = text;
      } catch (error) {
        console.error('[supervisor] chat.message hook failed open:', errorText(error));
      }
    },

    /**
     * Tool guard (design D1; task 3.5; spike 1.3): verifies every
     * tool call's intent (FR-009..FR-012) before execution against
     * the session's live verified trace — the same stripped,
     * audit-passed steps the `event` hook records (FR-006); the trace
     * and the guard config resolve per call. Throwing is the
     * sanctioned block (spike 1.3): the rejection preserves the
     * message, which becomes the tool-error result the model sees and
     * can self-correct from (FR-012). Guard infrastructure itself
     * fails open (FR-005) — only the deliberate block throw ever
     * rejects.
     */
    'tool.execute.before': async (hookInput, output) => {
      let verification: ToolVerificationResult;
      try {
        // Self-suppression first (see `auditorSessionIds`): the
        // plugin's own side sessions are not supervised conversations
        // to fence.
        if (isAuditorSessionId(hookInput.sessionID)) {
          return;
        }
        // The session's live verified trace (FR-006): the same array
        // the event hook pushes stripped, passed steps onto, so the
        // guard sees every step as soon as its audit completes.
        // FR-029: trigger rules are evaluated on every call — a
        // blocked call still records its trigger, because the
        // attempt itself is signal; recording happens before the
        // guard decision so neither path loses it.
        const state = sessionState.get(hookInput.sessionID);
        for (const id of matchTriggers(directives, hookInput.tool, extractArgPaths(output.args))) {
          if (!state.triggeredDirectives.includes(id)) {
            state.triggeredDirectives.push(id);
          }
        }
        verification = verifyToolIntent(
          { name: hookInput.tool, arguments: output.args },
          state.verifiedSteps,
          resolveHookConfig(),
          enforcement
        );
      } catch (error) {
        // Fail-open (FR-005): guard infrastructure must not break the session.
        console.error('[supervisor] tool guard failed open:', errorText(error));
        return;
      }
      if (!verification.allowed) {
        // Spike 1.3: the plugin host does not log trigger failures, so
        // the plugin logs each block itself — the reason is the
        // model's only corrective signal (FR-012).
        console.error(`[supervisor] blocked tool '${hookInput.tool}': ${verification.reason}`);
        throw new Error(`Execution blocked: ${verification.reason}`);
      }
    },

    /**
     * Solved items (design D1; task 3.4): appends one bounded
     * {tool, outcome} entry per completed tool call (FR-014) — the
     * memo's "Recently solved" section (FR-016). The outcome is the
     * tool output collapsed to one line and truncated short
     * (`solvedOutcome`); the hook typings expose no error field, so an
     * unreadable output logs the placeholder 'completed'. Storage is
     * bounded to the resolved memoLimits at append time (FR-017).
     * Fail-open (FR-005): odd payloads are logged, never thrown.
     */
    'tool.execute.after': async (hookInput, output) => {
      try {
        // Self-suppression first (see `auditorSessionIds`): side-session
        // tool output is audit machinery, not supervised progress.
        if (isAuditorSessionId(hookInput.sessionID)) {
          return;
        }
        const state = sessionState.get(hookInput.sessionID);
        appendBounded(
          state.solvedItems,
          { tool: hookInput.tool, outcome: solvedOutcome(output) },
          resolveHookConfig().memoLimits.maxSolvedItems
        );
      } catch (error) {
        console.error('[supervisor] tool.execute.after hook failed open:', errorText(error));
      }
    },

    /**
     * Agent console, first slice (FR-020/FR-021; design D1): self-serve
     * tools the supervised agent can call. The descriptions are
     * meta-prompts — they tell the agent WHEN a reminder earns its
     * place: facts that must survive context compaction and stay in
     * view every turn. State flows through the same session-state
     * layer (design D4) the memo reads, and results echo the stored
     * text so the reminder lands even where the memo cannot (D7 —
     * gateways may drop pushed system messages; the tool result is
     * in-conversation). Side sessions (FR-024) get an inert result,
     * never state. The execute bodies are pure state operations: no
     * network, no async infrastructure, so no fail-open wrapper is
     * needed.
     */
    tool: {
      remind_me: tool({
        description:
          'Store a durable reminder for this session. Use it for facts that must survive context compaction and stay in view every turn: ' +
          'dead ends ("do not retry X — it fails because Y"), environment quirks ("use bash 4.5 for the test suite, other versions error"), ' +
          'decisions already made, and constraints the user stated mid-session. ' +
          'The reminder reappears in the supervisor memo each turn; clear it with forget_reminder when it no longer applies.',
        args: {
          text: tool.schema.string().describe('The fact to remember, stated as a constraint or instruction to future turns.'),
        },
        execute: async (args, context) => {
          // FR-024: the plugin's own side sessions are audit machinery —
          // inert result, no state, never an error.
          if (isAuditorSessionId(context.sessionID)) {
            return 'Reminder tools are not available in supervisor side sessions.';
          }
          // FR-025: whitespace-only text is rejected with an actionable
          // message; over-length text truncates at the fixed ceiling.
          const prepared = prepareReminderText(args.text);
          if (!prepared.ok) {
            return prepared.error;
          }
          const state = sessionState.get(context.sessionID);
          // D3: monotonic per-session sequence — ids are unique and never
          // recycled, so a stale forget_reminder can never hit a new
          // reminder that reused an old id.
          state.reminderSeq += 1;
          const id = `r${state.reminderSeq}`;
          // FR-023: storage is bounded to the most recent reminders at
          // append time (the render-side bound lives in buildMemo).
          state.reminders = addReminder(
            state.reminders,
            { id, text: prepared.text, addedAt: new Date().toISOString() },
            resolveHookConfig().memoLimits.maxReminders
          );
          // FR-020: the result echoes the stored text and id — the
          // in-conversation delivery that survives gateway memo drops (D7).
          const truncationNote = prepared.truncated ? ' (truncated to 2000 characters)' : '';
          return (
            `Reminder ${id} stored: ${prepared.text}${truncationNote}. ` +
            `It reappears in the supervisor memo each turn; clear it with forget_reminder ${id} when it no longer applies.`
          );
        },
      }),
      forget_reminder: tool({
        description:
          'Clear a stored reminder by its id (e.g. r1) once it no longer applies — stale reminders crowd the memo. ' +
          'Current ids appear in the supervisor memo\'s Reminders section and in every remind_me result.',
        args: {
          id: tool.schema.string().describe('The reminder id to clear, e.g. r1.'),
        },
        execute: async (args, context) => {
          if (isAuditorSessionId(context.sessionID)) {
            return 'Reminder tools are not available in supervisor side sessions.';
          }
          const state = sessionState.get(context.sessionID);
          const next = clearReminder(state.reminders, args.id);
          if (next === null) {
            // FR-021: an unknown id yields an actionable result — the
            // current ids, so the caller can re-issue against a real one
            // (the same corrective-signal philosophy as FR-012).
            if (state.reminders.length === 0) {
              return `No reminder matches "${args.id}" — the session has no reminders.`;
            }
            const ids = state.reminders.map((reminder) => reminder.id).join(', ');
            return `No reminder matches "${args.id}" — current reminders: ${ids}.`;
          }
          state.reminders = next;
          return `Reminder ${args.id} cleared.`;
        },
      }),
    },

    /**
     * Dispose (design D4): supervision state is in-process only; clear
     * it when the plugin unloads so a re-register starts clean.
     */
    dispose: async () => {
      sessionState.clearAll();
    },
  };

  // Memo injection (design D1; task 3.4; FR-016): registered through
  // the guarded helper so absence of the experimental hook degrades to
  // memo-less operation instead of failing plugin load (D-risk).
  const systemTransform: SystemTransformHandler = async (hookInput, output) => {
    try {
      // Self-suppression first (see `auditorSessionIds`): never inject
      // the supervision memo into the plugin's own audit calls.
      if (isAuditorSessionId(hookInput?.sessionID)) {
        return;
      }
      // Graceful lookup (FR-016): a dispatch without a sessionID, or
      // for a session this plugin holds no state for, leaves the
      // system prompt untouched. `peek` never initializes, so a
      // transform-only session cannot create state as a side effect.
      const sessionId = hookInput?.sessionID;
      const state = typeof sessionId === 'string' ? sessionState.peek(sessionId) : undefined;
      if (state === undefined) {
        return;
      }
      const memo = buildMemo(
        {
          goal: state.goal,
          // FR-029/FR-030: unconditioned directives are always
          // active; conditioned ones surface once triggered.
          directives: activeDirectives(directives, state.triggeredDirectives),
          reminders: state.reminders,
          solvedItems: state.solvedItems,
          critiques: state.critiqueLog,
        },
        resolveHookConfig().memoLimits
      );
      // Nothing to show (no goal, no log entries): the system prompt
      // stays untouched — the memo is an enhancement, never a
      // requirement (FR-016).
      if (memo === null) {
        return;
      }
      // Convention (verified against the 1.19.4 typings): the hook
      // returns Promise<void> and communicates by in-place mutation of
      // the output, so the memo lands as one new system element after
      // the host's prompt. Array-guarded so an odd payload — no
      // system array at all — never throws.
      if (Array.isArray(output?.system)) {
        output.system.push(memo);
      }
    } catch (error) {
      console.error('[supervisor] system transform failed open:', errorText(error));
    }
  };
  registerSystemTransform(hooks, systemTransform);

  return hooks;
};

/** OpenCode plugin module (spike 1.4: file-source plugins must carry `id`). The id matches `PLUGIN_CONFIG_KEY` so a user discovering the registered plugin id can use it as the session-config key (review finding #5). */
export const plugin = { id: 'opencode-supervisor', server } satisfies PluginModule;

export default plugin;
