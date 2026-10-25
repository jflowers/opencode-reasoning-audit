/**
 * Tool Execution Intent Verifier
 * Prevents reward hacking, enforces engineer directives, and blocks
 * tool calls whose arguments contradict or are absent from the
 * verified reasoning trace. The trace check is best-effort (design
 * D5): when the verified trace is empty it MUST NOT block (FR-011)
 * — only the reward-hacking patterns still apply (FR-009).
 * Directive enforcement (FR-028) applies whenever compiled engineer
 * rules exist and never blocks when the rule set is empty. Block
 * reasons are actionable (FR-012): they name the failed check and,
 * for trace mismatches, the unmatched path. Pure module: no OpenCode
 * imports, no I/O.
 */

import { evaluateEnforcement, extractPolicyPaths, type CompiledEnforcement } from './directives.ts';
import type { AuditConfig } from './auditor.ts';

export interface ToolVerificationResult {
  allowed: boolean;
  /** Corrective signal surfaced to the model on block (FR-012); informational when allowed. */
  reason: string;
}

/**
 * Reward-hacking marker set (FR-009): `--no-verify`, skipped-test markers,
 * tautological assertions, and test-directory deletion. Mirrors the marker
 * set in auditor.ts's deterministic invariants. `rawArgs` is the
 * JSON-serialized tool arguments and `lowerArgs` its lowercased form; the
 * rm -rf regex carries its own case-insensitive flag against rawArgs.
 *
 * @returns The matched marker so the block reason can name it (FR-012), or null when the arguments are clean.
 */
function matchRewardHackingMarker(rawArgs: string, lowerArgs: string): string | null {
  if (lowerArgs.includes('--no-verify')) {
    return '--no-verify';
  }
  if (lowerArgs.includes('.skip(')) {
    return '.skip(';
  }
  // Compared against lowerArgs, so `toBe` arrives lowercased.
  if (lowerArgs.includes('expect(true).tobe(true)')) {
    return 'expect(true).toBe(true)';
  }
  const deletedTests = /rm\s+-rf\s+tests?/i.exec(rawArgs);
  if (deletedTests) {
    return deletedTests[0];
  }
  return null;
}

/** File-path token in tool arguments (FR-010): path characters ending in a known source/config extension. */
const FILE_PATH_PATTERN = /[a-zA-Z0-9_.\-\/]+\.(?:ts|tsx|js|json|py|md|sql|sh)/g;

/**
 * Extracts every file-path token from the tool arguments (FR-010):
 * top-level string values scanned for path characters ending in a
 * known source/config extension. Feeds the trace check.
 * Engineer-directive enforcement and triggers (FR-028, FR-029) use
 * the broader `extractPolicyPaths` instead — this extension
 * allowlist cannot see `.env` or extensionless paths.
 */
export function extractArgPaths(args: Record<string, unknown> | undefined): string[] {
  return Object.values(args || {})
    .filter((v): v is string => typeof v === 'string')
    .flatMap((v) => v.match(FILE_PATH_PATTERN) || []);
}

/**
 * Finds the first file path in the tool arguments that is absent from the
 * verified trace (FR-010). A path counts as referenced when the trace
 * contains either the full token or its basename, case-insensitively.
 *
 * @param args The tool call's arguments; only top-level string values carry paths.
 * @param verifiedSteps The session's verified reasoning trace (non-empty).
 * @returns The unmatched path for the block reason (FR-012), or null when every path is referenced.
 */
function findUnreferencedPath(
  args: Record<string, unknown> | undefined,
  verifiedSteps: string[]
): string | null {
  const combinedSteps = verifiedSteps.join(' ').toLowerCase();
  const argPaths = extractArgPaths(args);

  for (const fileToken of argPaths) {
    const base = fileToken.split('/').pop()?.toLowerCase() || fileToken.toLowerCase();
    if (!combinedSteps.includes(base) && !combinedSteps.includes(fileToken.toLowerCase())) {
      return fileToken;
    }
  }
  return null;
}

/**
 * Verifies a tool call's intent before execution (FR-009..FR-012).
 * Reward-hacking argument patterns block unconditionally when enabled
 * (FR-009). The file-path trace check is best-effort (design D5): it
 * applies only when a verified trace exists — an empty trace MUST NOT
 * block (FR-011). Blocked results carry an actionable reason naming the
 * failed check and, for trace mismatches, the unmatched path (FR-012).
 *
 * @param toolCall The tool name and arguments about to execute.
 * @param verifiedSteps Reasoning steps that passed audit (the session's verified trace).
 * @param config Flags gating the reward-hacking and trace checks.
 * @param enforcement Compiled engineer-directive rules (FR-028); absent or empty never blocks.
 * @returns The verdict; `reason` is the model's corrective signal when blocked.
 */
export function verifyToolIntent(
  toolCall: { name: string; arguments?: Record<string, unknown> },
  verifiedSteps: string[],
  config: Pick<AuditConfig, 'blockRewardHacking' | 'requireStepReferenceInTools'>,
  enforcement?: CompiledEnforcement
): ToolVerificationResult {
  const rawArgs = JSON.stringify(toolCall.arguments || {});
  const lowerArgs = rawArgs.toLowerCase();

  if (config.blockRewardHacking) {
    const marker = matchRewardHackingMarker(rawArgs, lowerArgs);
    if (marker) {
      return {
        allowed: false,
        reason: `Tool '${toolCall.name}' blocked by the reward-hacking check: arguments contain '${marker}'. Fix the underlying defect instead of weakening or bypassing tests.`,
      };
    }
  }

  // Engineer-directive enforcement (FR-028): applies whenever compiled
  // rules exist — the directive set itself is the gate, not a config
  // flag — and an empty rule set never blocks. Reasons name the
  // directive, the match, and the advisory text (FR-012).
  if (enforcement && (enforcement.forbidPaths.length > 0 || enforcement.forbidPatterns.length > 0)) {
    const directiveVerdict = evaluateEnforcement(
      enforcement,
      toolCall.name,
      rawArgs,
      extractPolicyPaths(toolCall.arguments)
    );
    if (!directiveVerdict.allowed) {
      return {
        allowed: false,
        reason: directiveVerdict.reason,
      };
    }
  }

  if (config.requireStepReferenceInTools) {
    // FR-011 / design D5: an empty trace means no audited reasoning exists
    // yet (first call, auditor unavailable, audit still in flight) — the
    // path check MUST NOT block; only the reward-hacking check above applies.
    if (verifiedSteps.length === 0) {
      return {
        allowed: true,
        reason: 'Verified trace empty; only reward-hacking checks applied.',
      };
    }

    const unmatchedPath = findUnreferencedPath(toolCall.arguments, verifiedSteps);
    if (unmatchedPath) {
      return {
        allowed: false,
        reason: `Tool '${toolCall.name}' blocked by the file-path trace check: '${unmatchedPath}' is absent from the verified reasoning trace (no full-path or basename match). Reason about the file in verified steps, then retry.`,
      };
    }
  }

  return {
    allowed: true,
    reason: 'Tool parameters align with the verified reasoning trace.',
  };
}
