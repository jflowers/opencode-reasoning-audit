/**
 * Engineer-directive parsing, compilation, matching, and rendering
 * for the engineer console (FR-026 .. FR-032).
 *
 * Directives are engineer-authored policy riding the same
 * session-state layer as the audit loop and the agent console:
 * advisory text is re-injected through the supervisor memo and the
 * peer-audit prompt, while `enforce` rules are compiled into the
 * tool guard. This module is fully pure — filesystem loading lives
 * in index.ts (design D3) — and every parse or compile failure is
 * fail-open: malformed input is skipped with a warning instead of
 * throwing (FR-032). An empty directive set never blocks anything
 * and reproduces 2.1.0 behavior (FR-026).
 */

export interface EnforcementRule {
  forbidPath?: string;
  forbidPattern?: string;
}

export interface TriggerRule {
  tool?: string;
  path?: string;
}

export interface Directive {
  id: string;
  text: string;
  enforce?: EnforcementRule[];
  when?: TriggerRule[];
}

/** Minimal render shape consumed by the memo and audit prompt. */
export interface DirectiveText {
  id: string;
  text: string;
}

export interface CompiledForbidPath {
  regex: RegExp;
  glob: string;
  directiveId: string;
  text: string;
}

export interface CompiledForbidPattern {
  regex: RegExp;
  source: string;
  directiveId: string;
  text: string;
}

export interface CompiledEnforcement {
  forbidPaths: CompiledForbidPath[];
  forbidPatterns: CompiledForbidPattern[];
}

/** Fixed bounds — non-configurable by design (D8, FR-032). */
export const MAX_DIRECTIVES = 20;
export const MAX_DIRECTIVE_TEXT = 1000;
export const MAX_RULES_PER_DIRECTIVE = 10;
export const MAX_DIRECTIVES_RENDER_BUDGET = 4000;

const FENCE_PATTERN = /```supervisor\n([\s\S]*?)```/;

export interface DirectiveFile {
  name: string;
  content: string;
}

export interface ParseDirectivesResult {
  directives: Directive[];
  warnings: string[];
}

interface RawRules {
  enforce?: unknown;
  when?: unknown;
}

const normalizeEnforcementRules = (
  raw: unknown
): { rules: EnforcementRule[]; dropped: number } => {
  if (raw === undefined || raw === null) return { rules: [], dropped: 0 };
  if (!Array.isArray(raw)) return { rules: [], dropped: 1 };
  const rules: EnforcementRule[] = [];
  let dropped = 0;
  for (const entry of raw.slice(0, MAX_RULES_PER_DIRECTIVE)) {
    if (typeof entry !== 'object' || entry === null) {
      dropped += 1;
      continue;
    }
    const record = entry as Record<string, unknown>;
    const rule: EnforcementRule = {};
    if (typeof record.forbidPath === 'string' && record.forbidPath.trim().length > 0) {
      rule.forbidPath = record.forbidPath.trim();
    }
    if (typeof record.forbidPattern === 'string' && record.forbidPattern.trim().length > 0) {
      rule.forbidPattern = record.forbidPattern.trim();
    }
    if (rule.forbidPath === undefined && rule.forbidPattern === undefined) {
      dropped += 1;
      continue;
    }
    rules.push(rule);
  }
  if (raw.length > MAX_RULES_PER_DIRECTIVE) {
    dropped += raw.length - MAX_RULES_PER_DIRECTIVE;
  }
  return { rules, dropped };
};

const normalizeTriggerRules = (
  raw: unknown
): { rules: TriggerRule[]; dropped: number } => {
  if (raw === undefined || raw === null) return { rules: [], dropped: 0 };
  if (!Array.isArray(raw)) return { rules: [], dropped: 1 };
  const rules: TriggerRule[] = [];
  let dropped = 0;
  for (const entry of raw.slice(0, MAX_RULES_PER_DIRECTIVE)) {
    if (typeof entry !== 'object' || entry === null) {
      dropped += 1;
      continue;
    }
    const record = entry as Record<string, unknown>;
    const rule: TriggerRule = {};
    if (typeof record.tool === 'string' && record.tool.trim().length > 0) {
      rule.tool = record.tool.trim();
    }
    if (typeof record.path === 'string' && record.path.trim().length > 0) {
      rule.path = record.path.trim();
    }
    if (rule.tool === undefined && rule.path === undefined) {
      dropped += 1;
      continue;
    }
    rules.push(rule);
  }
  if (raw.length > MAX_RULES_PER_DIRECTIVE) {
    dropped += raw.length - MAX_RULES_PER_DIRECTIVE;
  }
  return { rules, dropped };
};

/**
 * Parse directive files (FR-026, FR-027). Each file's markdown body
 * is the advisory text; the first ```supervisor-fenced block holds a
 * JSON rules object. The file id is the filename without `.md`.
 * Malformed files are skipped with a warning (fail-open).
 */
export const parseDirectives = (files: DirectiveFile[]): ParseDirectivesResult => {
  const directives: Directive[] = [];
  const warnings: string[] = [];
  for (const file of files) {
    const id = file.name.replace(/\.md$/, '');
    let text = file.content;
    let rawRules: RawRules = {};
    const fence = file.content.match(FENCE_PATTERN);
    if (fence) {
      try {
        rawRules = JSON.parse(fence[1]) as RawRules;
      } catch {
        warnings.push(
          `directive file '${file.name}' has a malformed supervisor rules block; file skipped`
        );
        continue;
      }
      text = file.content.replace(FENCE_PATTERN, '');
    }
    const trimmed = text.trim().slice(0, MAX_DIRECTIVE_TEXT);
    const enforce = normalizeEnforcementRules(rawRules.enforce);
    const when = normalizeTriggerRules(rawRules.when);
    if (enforce.dropped > 0) {
      warnings.push(
        `directive '${id}': ${enforce.dropped} enforce rule(s) skipped (invalid or beyond the cap of ${MAX_RULES_PER_DIRECTIVE})`
      );
    }
    if (when.dropped > 0) {
      warnings.push(
        `directive '${id}': ${when.dropped} when rule(s) skipped (invalid or beyond the cap of ${MAX_RULES_PER_DIRECTIVE})`
      );
    }
    if (!trimmed && enforce.rules.length === 0 && when.rules.length === 0) {
      warnings.push(
        `directive file '${file.name}' has neither advisory text nor rules; file skipped`
      );
      continue;
    }
    directives.push({
      id,
      text: trimmed,
      ...(enforce.rules.length > 0 ? { enforce: enforce.rules } : {}),
      ...(when.rules.length > 0 ? { when: when.rules } : {}),
    });
  }
  return { directives, warnings };
};

/**
 * Parse the `options.directives` array from tuple plugin
 * registration (FR-026). Same validation as files; entries without
 * an id get `d<index>`.
 */
export const parseOptionsDirectives = (raw: unknown): ParseDirectivesResult => {
  if (raw === undefined || raw === null) {
    return { directives: [], warnings: [] };
  }
  if (!Array.isArray(raw)) {
    return { directives: [], warnings: ['options.directives is not an array; ignored'] };
  }
  const directives: Directive[] = [];
  const warnings: string[] = [];
  raw.forEach((entry, index) => {
    if (typeof entry !== 'object' || entry === null) {
      warnings.push(`options.directives[${index}] is not an object; skipped`);
      return;
    }
    const record = entry as Record<string, unknown>;
    const id =
      typeof record.id === 'string' && record.id.trim().length > 0
        ? record.id.trim()
        : `d${index + 1}`;
    const text =
      typeof record.text === 'string' ? record.text.trim().slice(0, MAX_DIRECTIVE_TEXT) : '';
    const enforce = normalizeEnforcementRules(record.enforce);
    const when = normalizeTriggerRules(record.when);
    if (enforce.dropped > 0) {
      warnings.push(
        `directive '${id}': ${enforce.dropped} enforce rule(s) skipped (invalid or beyond the cap of ${MAX_RULES_PER_DIRECTIVE})`
      );
    }
    if (when.dropped > 0) {
      warnings.push(
        `directive '${id}': ${when.dropped} when rule(s) skipped (invalid or beyond the cap of ${MAX_RULES_PER_DIRECTIVE})`
      );
    }
    if (!text && enforce.rules.length === 0 && when.rules.length === 0) {
      warnings.push(`options.directives[${index}] ('${id}') has neither text nor rules; skipped`);
      return;
    }
    directives.push({
      id,
      text,
      ...(enforce.rules.length > 0 ? { enforce: enforce.rules } : {}),
      ...(when.rules.length > 0 ? { when: when.rules } : {}),
    });
  });
  return { directives, warnings };
};

/**
 * Compile a glob to an anchored RegExp (design D4): a `**` segment
 * (optionally slash-terminated) matches zero or more path segments,
 * a bare `**` matches anything including slashes, and `*` and `?`
 * stay within one segment. Everything else is literal. Never
 * throws.
 */
export const globToRegExp = (glob: string): RegExp => {
  let source = '^';
  for (let i = 0; i < glob.length; i += 1) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        if (glob[i + 2] === '/') {
          source += '(?:.*/)?';
          i += 2;
        } else {
          source += '.*';
          i += 1;
        }
      } else {
        source += '[^/]*';
      }
    } else if (c === '?') {
      source += '[^/]';
    } else {
      source += c.replace(/[.\+^${}()|\[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`${source}$`);
};

/**
 * Compile enforcement rules for the tool guard (FR-028). Invalid
 * forbid-pattern regexes are skipped with a warning (fail-open,
 * FR-032); glob compilation cannot throw.
 */
export const compileEnforcement = (
  directives: Directive[]
): { enforcement: CompiledEnforcement; warnings: string[] } => {
  const forbidPaths: CompiledForbidPath[] = [];
  const forbidPatterns: CompiledForbidPattern[] = [];
  const warnings: string[] = [];
  for (const directive of directives) {
    for (const rule of directive.enforce ?? []) {
      if (rule.forbidPath !== undefined) {
        forbidPaths.push({
          regex: globToRegExp(rule.forbidPath),
          glob: rule.forbidPath,
          directiveId: directive.id,
          text: directive.text,
        });
      }
      if (rule.forbidPattern !== undefined) {
        try {
          forbidPatterns.push({
            regex: new RegExp(rule.forbidPattern, 'i'),
            source: rule.forbidPattern,
            directiveId: directive.id,
            text: directive.text,
          });
        } catch {
          warnings.push(
            `directive '${directive.id}' forbidPattern '${rule.forbidPattern}' is not a valid regex; rule skipped`
          );
        }
      }
    }
  }
  return { enforcement: { forbidPaths, forbidPatterns }, warnings };
};

export interface EnforcementVerdict {
  allowed: boolean;
  reason: string;
}

/**
 * Evaluate compiled enforcement against a tool call (FR-028).
 * Paths match on the full path or the basename; patterns match the
 * raw serialized arguments, case-insensitively. An empty rule set
 * never blocks. Block reasons name the directive, the match, and
 * the advisory text so the model can correct course (FR-012).
 */
export const evaluateEnforcement = (
  enforcement: CompiledEnforcement,
  toolName: string,
  rawArgs: string,
  argPaths: string[]
): EnforcementVerdict => {
  for (const rule of enforcement.forbidPaths) {
    for (const path of argPaths) {
      const basename = path.split('/').pop() ?? path;
      if (rule.regex.test(path) || rule.regex.test(basename)) {
        return {
          allowed: false,
          reason:
            `Tool '${toolName}' blocked by engineer directive '${rule.directiveId}': ` +
            `arguments touch forbidden path '${path}' (glob '${rule.glob}'). ${rule.text}`,
        };
      }
    }
  }
  for (const rule of enforcement.forbidPatterns) {
    if (rule.regex.test(rawArgs)) {
      return {
        allowed: false,
        reason:
          `Tool '${toolName}' blocked by engineer directive '${rule.directiveId}': ` +
          `arguments match forbidden pattern '${rule.source}'. ${rule.text}`,
      };
    }
  }
  return { allowed: true, reason: '' };
};

/**
 * Return the ids of directives whose `when` rules match the tool
 * call (FR-029): tool names compare case-insensitively; path globs
 * match any extracted argument path on the full path or basename.
 * Directives without `when` rules never trigger here — they are
 * always active.
 */
export const matchTriggers = (
  directives: Directive[],
  toolName: string,
  argPaths: string[]
): string[] => {
  const lowerTool = toolName.toLowerCase();
  return directives
    .filter((directive) => {
      const rules = directive.when ?? [];
      return rules.some((rule) => {
        if (rule.tool !== undefined && rule.tool.toLowerCase() === lowerTool) {
          return true;
        }
        if (rule.path !== undefined) {
          const regex = globToRegExp(rule.path);
          return argPaths.some((path) => {
            const basename = path.split('/').pop() ?? path;
            return regex.test(path) || regex.test(basename);
          });
        }
        return false;
      });
    })
    .map((directive) => directive.id);
};

/**
 * The memo-visible directive set (FR-029, FR-030): directives
 * without `when` rules are always active; conditioned directives
 * are active once triggered for the session.
 */
export const activeDirectives = (
  directives: Directive[],
  triggeredIds: string[]
): DirectiveText[] =>
  directives
    .filter(
      (directive) =>
        (directive.when ?? []).length === 0 || triggeredIds.includes(directive.id)
    )
    .map((directive) => ({ id: directive.id, text: directive.text }));

const renderBudgetedLines = (lines: string[], budget: number): string | null => {
  if (lines.length === 0) return null;
  let used = 0;
  const included: string[] = [];
  for (const line of lines) {
    if (used + line.length + 1 > budget) break;
    included.push(line);
    used += line.length + 1;
  }
  if (included.length === lines.length) {
    return lines.join('\n');
  }
  const omitted = lines.length - included.length;
  return `${included.join('\n')}\n(${omitted} more directive${
    omitted === 1 ? '' : 's'
  } omitted — render budget of ${budget} characters)`;
};

/**
 * Render the memo `Directives:` section (FR-030): `- <id>: <text>`
 * lines, whole-line truncated to the aggregate render budget with a
 * truncation note (D8 — applies the Change B memo-design lesson).
 */
export const renderDirectives = (
  directives: DirectiveText[],
  budget = MAX_DIRECTIVES_RENDER_BUDGET
): string | null => {
  const body = renderBudgetedLines(
    directives.map((directive) => `- ${directive.id}: ${directive.text}`),
    budget
  );
  return body === null ? null : `Directives:\n${body}`;
};

/**
 * Render directives for the peer-audit prompt (FR-031): plain
 * `<id>: <text>` lines under the same render budget. Returns null
 * when there is nothing to audit against.
 */
export const renderDirectivesAdvisory = (
  directives: Directive[],
  budget = MAX_DIRECTIVES_RENDER_BUDGET
): string | null =>
  renderBudgetedLines(
    directives.map((directive) => `${directive.id}: ${directive.text}`),
    budget
  );
