/**
 * Narrative Stripper for Process Supervision
 * Isolates formal code blocks, mathematical equations, and state invariants
 * from verbose Chain-of-Thought narrative text.
 */

export type StripMode = 'code_and_math' | 'balanced' | 'strict';

const NARRATIVE_PREFIX_REGEX = /^(?:(?:let's|let us|i will|i'll|now let's|first,|second,|third,|next,|finally,|hmm,|wait,|okay,|sure,|to solve this,|thinking about this,)\s+)+/i;

export function stripNarrative(
  rawSteps: string[],
  mode: StripMode = 'code_and_math'
): string[] {
  return rawSteps
    .map((step) => step.trim())
    .filter((step) => {
      const hasCode = step.includes('```') || /`[^`]+`/.test(step);
      const hasMathOrOps = /[\+\-\*\/=<>]|!==|===|<=|>=|\b(?:assert|return|throw|SELECT|UPDATE|DELETE|function)\b|\b(?:const|let)\s+[a-zA-Z_$]\w*\s*=/.test(step);
      const hasFormalSpec = /\b(?:O\([^)]+\)|step\s*\d+|invariant|precondition|postcondition|complexity|path|file)\b/i.test(step);

      if (mode === 'strict') {
        return step.includes('```') || /[0-9]+\s*[\+\-\*\/=]\s*[0-9]+|[a-zA-Z_]\w*\s*=\s*[^=]/.test(step);
      }
      if (mode === 'balanced') {
        return hasCode || hasMathOrOps || hasFormalSpec;
      }
      return hasCode || hasMathOrOps;
    })
    .map((step) =>
      step
        .replace(NARRATIVE_PREFIX_REGEX, '')
        .replace(/\b(?:I think that|It seems like|Basically,|Obviously,|Clearly,)\s*/gi, '')
        .trim()
    );
}
