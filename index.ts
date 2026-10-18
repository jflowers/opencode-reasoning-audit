/**
 * opencode-reasoning-audit — OpenCode Process Supervision & Reasoning Audit Middleware
 * Runtime: Bun / TypeScript
 * Installation: bunx oh-my-opencode install --local .
 */

import { stripNarrative } from './src/stripper';
import { runPeerAudit, type AuditConfig } from './src/auditor';
import { verifyToolIntent } from './src/tool-guard';

export const pluginConfig: AuditConfig = {
  auditorModel: 'gemini-3.8-flash',
  stripMode: 'code_and_math',
  injectRole: 'user',
  maxRegenerations: 2,
  blockRewardHacking: true,
  requireStepReferenceInTools: true,
};

// Track active verified steps per session for tool execution alignment
const sessionVerifiedSteps = new Map<string, string[]>();
const sessionRegenerationCounts = new Map<string, number>();

export default {
  name: 'opencode-reasoning-audit',
  version: '1.0.0',

  /**
   * Hook into message updates to inspect the Chain-of-Thought (CoT)
   * and trigger the challenge/self-correction loop when a step fails.
   */
  async onMessageUpdated(message: any, session: any) {
    if (message.role === 'assistant' && Array.isArray(message.reasoning_steps) && !message.is_audited) {
      const sessionId = session?.id || 'default-session';

      // 1. Process Supervision: Strip conversational narrative and isolate formal steps
      const cleanSteps = stripNarrative(message.reasoning_steps, pluginConfig.stripMode);
      sessionVerifiedSteps.set(sessionId, cleanSteps);

      // 2. Multi-Agent Peer Review via independent auditor model
      const auditResult = await runPeerAudit(cleanSteps, pluginConfig);

      if (!auditResult.passed) {
        // Mark this specific message so we do not get stuck in an infinite audit loop
        message.is_audited = true;

        const currentRetries = sessionRegenerationCounts.get(sessionId) || 0;
        if (currentRetries >= pluginConfig.maxRegenerations) {
          message.content =
            `⚠️ [Audit Failed after ${currentRetries} self-correction attempts: ${auditResult.critique}] \n\n` +
            message.content;
          return;
        }

        sessionRegenerationCounts.set(sessionId, currentRetries + 1);

        // 3. Inject a prompt challenging the primary agent with the auditor's structured critique
        if (session && typeof session.injectMessage === 'function') {
          await session.injectMessage({
            role: pluginConfig.injectRole,
            content: `⚠️ CRITICAL LOGIC ERROR DETECTED BY AUDITOR:
${auditResult.critique}

Please re-evaluate your chain of thought, correct the step listed above, and provide a revised answer.`,
          });
        }

        // 4. Force OpenCode to re-trigger the primary model's generation loop
        if (session && typeof session.regenerate === 'function') {
          await session.regenerate();
        }
      } else {
        message.is_audited = true;
        sessionRegenerationCounts.set(sessionId, 0);
      }
    }
  },

  /**
   * Hook into tool execution to catch "reward hacking" or hallucinated parameters
   * before any filesystem mutation or shell command runs.
   */
  onToolExecute(toolCall: any, session?: any) {
    const sessionId = session?.id || 'default-session';
    const cleanSteps = sessionVerifiedSteps.get(sessionId) || [];

    console.log(`[opencode-reasoning-audit] Auditing tool execution: ${toolCall.name}`);

    const verification = verifyToolIntent(toolCall, cleanSteps, pluginConfig);
    if (!verification.allowed) {
      throw new Error(`Execution blocked: ${verification.reason}`);
    }
  },
};
