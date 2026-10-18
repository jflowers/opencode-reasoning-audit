/**
 * Tool Execution Intent Verifier
 * Prevents reward hacking and blocks tool calls whose arguments contradict
 * or are absent from the verified reasoning trace.
 */

import type { AuditConfig } from './auditor';

export interface ToolVerificationResult {
  allowed: boolean;
  reason: string;
}

export function verifyToolIntent(
  toolCall: { name: string; arguments?: Record<string, unknown> },
  verifiedSteps: string[],
  config: Pick<AuditConfig, 'blockRewardHacking' | 'requireStepReferenceInTools'>
): ToolVerificationResult {
  const rawArgs = JSON.stringify(toolCall.arguments || {});
  const lowerArgs = rawArgs.toLowerCase();

  if (config.blockRewardHacking) {
    if (
      lowerArgs.includes('--no-verify') ||
      lowerArgs.includes('.skip(') ||
      lowerArgs.includes('expect(true).tobe(true)') ||
      /rm\s+-rf\s+tests?/i.test(rawArgs)
    ) {
      return {
        allowed: false,
        reason: `Tool '${toolCall.name}' blocked for reward hacking / test bypass attempt.`,
      };
    }
  }

  if (config.requireStepReferenceInTools && verifiedSteps.length > 0) {
    const combinedSteps = verifiedSteps.join(' ').toLowerCase();
    const argStrings = Object.values(toolCall.arguments || {})
      .filter((v): v is string => typeof v === 'string')
      .flatMap((v) => v.match(/[a-zA-Z0-9_.\-\/]+\.(?:ts|tsx|js|json|py|md|sql|sh)/g) || []);

    for (const fileToken of argStrings) {
      const base = fileToken.split('/').pop()?.toLowerCase() || fileToken.toLowerCase();
      if (!combinedSteps.includes(base) && !combinedSteps.includes(fileToken.toLowerCase())) {
        return {
          allowed: false,
          reason: `Tool parameter '${fileToken}' in '${toolCall.name}' does not match verified reasoning steps.`,
        };
      }
    }
  }

  return {
    allowed: true,
    reason: 'Tool parameters align with verified logic.',
  };
}
