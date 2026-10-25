import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Hooks, PluginInput } from '@opencode-ai/plugin';
import plugin, { sessionState } from '../index.ts';
import {
  activeDirectives,
  compileEnforcement,
  evaluateEnforcement,
  globToRegExp,
  matchTriggers,
  MAX_DIRECTIVES,
  MAX_DIRECTIVE_TEXT,
  MAX_DIRECTIVES_RENDER_BUDGET,
  parseDirectives,
  parseOptionsDirectives,
  renderDirectives,
  renderDirectivesAdvisory,
  type Directive,
} from '../src/directives.ts';
import { buildMemo, DEFAULT_MEMO_LIMITS } from '../src/memo.ts';
import { runPeerAudit, type AuditConfig, type InvokeModel } from '../src/auditor.ts';

// ── Helpers (each test file is self-contained) ──

/** Builds one directive markdown file: advisory text plus an optional rules fence. */
function directiveFile(text: string, rules: object | null): string {
  if (!rules) return text;
  return `${text}\n\n\`\`\`supervisor\n${JSON.stringify(rules)}\n\`\`\`\n`;
}

/** Creates a temp project dir with the given directive files; returns its path. */
function makeDirectiveDir(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'supervisor-directives-'));
  const directivesDir = path.join(dir, '.opencode', 'supervisor', 'directives');
  fs.mkdirSync(directivesDir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(directivesDir, name), content);
  }
  return dir;
}

/** A representative plugin input pointed at the given project directory. */
function mockPluginInput(directory: string): PluginInput {
  return {
    client: {
      session: {
        create: async () => ({ data: { id: 'mock-side-session' } }),
        prompt: async () => ({ data: { info: {}, parts: [] } }),
        promptAsync: async () => ({}),
        abort: async () => ({}),
        delete: async () => ({}),
      },
    },
    directory,
  } as unknown as PluginInput;
}

/** Event-hook input shape, for casting deliberately undeclared event payloads. */
type EventHookInput = Parameters<NonNullable<Hooks['event']>>[0];

/** A synthetic completed reasoning part (the SDK's terminal publication shape). */
function completedReasoningPart(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'part-1',
    sessionID: 'event-session-1',
    messageID: 'msg-1',
    type: 'reasoning',
    text: 'the rate = 24 * 15 = 360',
    time: { start: 1, end: 2 },
    ...overrides,
  };
}

/** Dispatches one message.part.updated event through the hook. */
function dispatchPart(hooks: Hooks, part: unknown): Promise<void> {
  return hooks.event!({ event: { type: 'message.part.updated', properties: { part } } } as unknown as EventHookInput);
}

/** Dispatches one tool.execute.before through the hook with raw args. */
function dispatchToolBefore(hooks: Hooks, sessionID: string, tool: string, args: unknown): Promise<void> {
  return hooks['tool.execute.before']!({ tool, sessionID, callID: 'call-1' }, { args });
}

/** Dispatches one system-transform invocation through the hook. */
function dispatchSystemTransform(hooks: Hooks, input: unknown, output: unknown): Promise<void> {
  return hooks['experimental.chat.system.transform']!(input, output);
}

/** Every OPENCODE_SUPERVISOR_* knob, for env-cleaning around hook-layer tests. */
const DIRECTIVE_ENV_NAMES = [
  'OPENCODE_SUPERVISOR_MODEL',
  'OPENCODE_SUPERVISOR_VARIANT',
  'OPENCODE_SUPERVISOR_MAX_REGENERATIONS',
  'OPENCODE_SUPERVISOR_STRIP_MODE',
  'OPENCODE_SUPERVISOR_BLOCK_REWARD_HACKING',
  'OPENCODE_SUPERVISOR_REQUIRE_STEP_REFERENCE_IN_TOOLS',
  'OPENCODE_SUPERVISOR_MEMO_MAX_SOLVED_ITEMS',
  'OPENCODE_SUPERVISOR_MEMO_MAX_CRITIQUES',
  'OPENCODE_SUPERVISOR_MEMO_MAX_REMINDERS',
];

/** Saves/deletes the supervisor env knobs around `run`, restoring after. */
async function withCleanDirectivesEnv(run: () => Promise<void>): Promise<void> {
  const saved: Record<string, string | undefined> = {};
  for (const name of DIRECTIVE_ENV_NAMES) {
    saved[name] = process.env[name];
    delete process.env[name];
  }
  try {
    await run();
  } finally {
    for (const name of DIRECTIVE_ENV_NAMES) {
      const value = saved[name];
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  }
}

/** A fixed no-secrets directive used across guard and memo tests. */
const NO_SECRETS_TEXT = 'Never read, print, or copy secret material.';

const NO_SECRETS_RULES = { enforce: [{ forbidPath: 'secrets/**' }] };

// ── Pure module: parseDirectives (FR-026, FR-027) ──

test('parseDirectives reads a file with advisory text and a rules fence', () => {
  const { directives, warnings } = parseDirectives([
    { name: 'no-secrets.md', content: directiveFile(NO_SECRETS_TEXT, NO_SECRETS_RULES) },
  ]);
  assert.deepEqual(warnings, []);
  assert.equal(directives.length, 1);
  assert.equal(directives[0].id, 'no-secrets');
  assert.equal(directives[0].text, NO_SECRETS_TEXT);
  assert.deepEqual(directives[0].enforce, [{ forbidPath: 'secrets/**' }]);
  assert.equal(directives[0].when, undefined);
});

test('parseDirectives accepts a text-only advisory file without a fence', () => {
  const { directives, warnings } = parseDirectives([
    { name: 'prefer-bun.md', content: 'Run tests with bun, not node.' },
  ]);
  assert.deepEqual(warnings, []);
  assert.deepEqual(directives, [{ id: 'prefer-bun', text: 'Run tests with bun, not node.' }]);
});

test('parseDirectives skips a file whose rules fence is not valid JSON', () => {
  const broken = `${NO_SECRETS_TEXT}\n\n\`\`\`supervisor\n{"enforce": [}\n\`\`\`\n`;
  const { directives, warnings } = parseDirectives([{ name: 'broken.md', content: broken }]);
  assert.deepEqual(directives, []);
  assert.equal(warnings.length, 1);
  assert.ok(warnings[0].includes('broken.md'));
});

test('parseDirectives skips a file with neither text nor rules', () => {
  const { directives, warnings } = parseDirectives([{ name: 'empty.md', content: '   \n\t ' }]);
  assert.deepEqual(directives, []);
  assert.equal(warnings.length, 1);
  assert.ok(warnings[0].includes('empty.md'));
});

test('parseDirectives drops invalid rule entries and rules beyond the per-directive cap', () => {
  const rules = {
    enforce: [
      { forbidPath: 'secrets/**' },
      { forbidPattern: 'git\\s+push\\s+--force' },
      { unrelated: true },
      'not-an-object',
      { forbidPath: 'a/**' },
      { forbidPath: 'b/**' },
      { forbidPath: 'c/**' },
      { forbidPath: 'd/**' },
      { forbidPath: 'e/**' },
      { forbidPath: 'f/**' },
      { forbidPath: 'g/**' },
      { forbidPath: 'h/**' },
    ],
  };
  const { directives, warnings } = parseDirectives([
    { name: 'capped.md', content: directiveFile('policy', rules) },
  ]);
  assert.equal(directives.length, 1);
  // 12 entries, 2 invalid, 10 kept: the cap keeps the first ten raw entries
  // minus the invalid ones, so 8 survive.
  assert.equal(directives[0].enforce?.length, 8);
  assert.equal(warnings.length, 1);
  assert.ok(warnings[0].includes("'capped'"));
  assert.ok(warnings[0].includes('4 enforce rule(s) skipped'));
});

test('parseDirectives truncates advisory text at the fixed ceiling', () => {
  const long = 'x'.repeat(MAX_DIRECTIVE_TEXT + 500);
  const { directives } = parseDirectives([{ name: 'long.md', content: long }]);
  assert.equal(directives[0].text.length, MAX_DIRECTIVE_TEXT);
});

test('parseDirectives parses when-rules alongside enforce-rules', () => {
  const rules = {
    enforce: [{ forbidPath: 'secrets/**' }],
    when: [{ tool: 'bash' }, { path: 'src/crypto/**' }],
  };
  const { directives } = parseDirectives([
    { name: 'mixed.md', content: directiveFile('policy', rules) },
  ]);
  assert.deepEqual(directives[0].when, [{ tool: 'bash' }, { path: 'src/crypto/**' }]);
});

// ── Pure module: parseOptionsDirectives (FR-026) ──

test('parseOptionsDirectives validates entries and defaults missing ids', () => {
  const { directives, warnings } = parseOptionsDirectives([
    { text: 'first', enforce: [{ forbidPattern: 'rm\\s+-rf\\s+/' }] },
    { id: 'custom', text: 'second' },
    { text: '' },
  ]);
  assert.equal(directives.length, 2);
  assert.equal(directives[0].id, 'd1');
  assert.deepEqual(directives[0].enforce, [{ forbidPattern: 'rm\\s+-rf\\s+/' }]);
  assert.equal(directives[1].id, 'custom');
  assert.equal(warnings.length, 1);
});

test('parseOptionsDirectives ignores a non-array value with a warning', () => {
  const { directives, warnings } = parseOptionsDirectives('nope');
  assert.deepEqual(directives, []);
  assert.equal(warnings.length, 1);
  assert.ok(warnings[0].includes('options.directives'));
});

test('parseOptionsDirectives passes undefined and null through as empty', () => {
  assert.deepEqual(parseOptionsDirectives(undefined), { directives: [], warnings: [] });
  assert.deepEqual(parseOptionsDirectives(null), { directives: [], warnings: [] });
});

// ── Pure module: globToRegExp ──

test('globToRegExp matches basenames with a leading-dot glob', () => {
  const regex = globToRegExp('.env*');
  assert.ok(regex.test('.env'));
  assert.ok(regex.test('.env.local'));
  assert.ok(!regex.test('keep.env'));
});

test('globToRegExp keeps a directory prefix under a recursive segment', () => {
  const regex = globToRegExp('secrets/**');
  assert.ok(regex.test('secrets/credentials.json'));
  assert.ok(regex.test('secrets/a/b.pem'));
  assert.ok(!regex.test('src/secrets/credentials.json'));
});

test('globToRegExp lets a leading recursive segment match zero directories', () => {
  const regex = globToRegExp('**/*.pem');
  assert.ok(regex.test('key.pem'));
  assert.ok(regex.test('a/b/key.pem'));
});

test('globToRegExp keeps single stars inside one path segment', () => {
  const regex = globToRegExp('src/*.ts');
  assert.ok(regex.test('src/a.ts'));
  assert.ok(!regex.test('src/a/b.ts'));
});

test('globToRegExp treats a question mark as one character', () => {
  const regex = globToRegExp('file?.txt');
  assert.ok(regex.test('file1.txt'));
  assert.ok(!regex.test('file12.txt'));
});

// ── Pure module: compileEnforcement + evaluateEnforcement (FR-028) ──

test('compileEnforcement compiles paths and patterns, skipping invalid regexes', () => {
  const directives: Directive[] = [
    {
      id: 'no-secrets',
      text: NO_SECRETS_TEXT,
      enforce: [{ forbidPath: 'secrets/**' }, { forbidPattern: '(' }],
    },
  ];
  const { enforcement, warnings } = compileEnforcement(directives);
  assert.equal(enforcement.forbidPaths.length, 1);
  assert.equal(enforcement.forbidPatterns.length, 0);
  assert.equal(warnings.length, 1);
  assert.ok(warnings[0].includes('no-secrets'));
});

test('evaluateEnforcement blocks a forbidden path with an actionable reason', () => {
  const { enforcement } = compileEnforcement([
    { id: 'no-secrets', text: NO_SECRETS_TEXT, enforce: [{ forbidPath: 'secrets/**' }] },
  ]);
  const verdict = evaluateEnforcement(
    enforcement,
    'bash',
    JSON.stringify({ command: 'cat secrets/credentials.json' }),
    ['secrets/credentials.json']
  );
  assert.equal(verdict.allowed, false);
  assert.ok(verdict.reason.includes("engineer directive 'no-secrets'"));
  assert.ok(verdict.reason.includes('secrets/credentials.json'));
  assert.ok(verdict.reason.includes(NO_SECRETS_TEXT));
});

test('evaluateEnforcement blocks a forbidden pattern case-insensitively', () => {
  const { enforcement } = compileEnforcement([
    { id: 'no-force-push', text: 'Never force-push.', enforce: [{ forbidPattern: 'git\\s+push\\s+--force' }] },
  ]);
  const verdict = evaluateEnforcement(
    enforcement,
    'bash',
    JSON.stringify({ command: 'GIT PUSH --FORCE' }),
    []
  );
  assert.equal(verdict.allowed, false);
  assert.ok(verdict.reason.includes('forbidden pattern'));
  assert.ok(verdict.reason.includes('Never force-push.'));
});

test('evaluateEnforcement allows when nothing matches and when rules are absent', () => {
  const { enforcement } = compileEnforcement([
    { id: 'no-secrets', text: NO_SECRETS_TEXT, enforce: [{ forbidPath: 'secrets/**' }] },
  ]);
  assert.deepEqual(
    evaluateEnforcement(enforcement, 'bash', '{}', []),
    { allowed: true, reason: '' }
  );
  const empty = compileEnforcement([{ id: 'advisory', text: 'be kind' }]).enforcement;
  assert.deepEqual(evaluateEnforcement(empty, 'bash', 'anything', ['secrets/x.json']), {
    allowed: true,
    reason: '',
  });
});

// ── Pure module: matchTriggers + activeDirectives (FR-029) ──

test('matchTriggers matches tool names case-insensitively', () => {
  const directives: Directive[] = [
    { id: 'bash-only', text: 'note', when: [{ tool: 'bash' }] },
    { id: 'unrelated', text: 'note', when: [{ tool: 'edit' }] },
    { id: 'always', text: 'note' },
  ];
  assert.deepEqual(matchTriggers(directives, 'BASH', []), ['bash-only']);
});

test('matchTriggers matches argument paths against when-globs', () => {
  const directives: Directive[] = [
    { id: 'crypto', text: 'note', when: [{ path: 'src/crypto/**' }] },
  ];
  assert.deepEqual(matchTriggers(directives, 'edit', ['src/crypto/aes.ts']), ['crypto']);
  assert.deepEqual(matchTriggers(directives, 'edit', ['src/other/aes.ts']), []);
});

test('activeDirectives keeps unconditioned directives always active', () => {
  const directives: Directive[] = [
    { id: 'always', text: 'always text' },
    { id: 'cond', text: 'cond text', when: [{ tool: 'bash' }] },
  ];
  assert.deepEqual(activeDirectives(directives, []), [{ id: 'always', text: 'always text' }]);
  assert.deepEqual(activeDirectives(directives, ['cond']), [
    { id: 'always', text: 'always text' },
    { id: 'cond', text: 'cond text' },
  ]);
});

// ── Pure module: rendering (FR-030, FR-032) ──

test('renderDirectives renders the section and returns null when empty', () => {
  assert.equal(renderDirectives([]), null);
  const section = renderDirectives([{ id: 'no-secrets', text: NO_SECRETS_TEXT }]);
  assert.equal(section, `Directives:\n- no-secrets: ${NO_SECRETS_TEXT}`);
});

test('renderDirectives truncates beyond the fixed render budget with a note', () => {
  const directives = Array.from({ length: 40 }, (_, i) => ({ id: `d${i}`, text: 'y'.repeat(200) }));
  const section = renderDirectives(directives);
  assert.ok(section !== null);
  assert.ok(section.length < 8000);
  assert.ok(section.includes('more directives omitted'));
  assert.ok(section.includes(`${MAX_DIRECTIVES_RENDER_BUDGET}`));
});

test('renderDirectivesAdvisory renders id-text lines without a header', () => {
  assert.equal(renderDirectivesAdvisory([]), null);
  const advisory = renderDirectivesAdvisory([{ id: 'no-secrets', text: NO_SECRETS_TEXT }]);
  assert.equal(advisory, `no-secrets: ${NO_SECRETS_TEXT}`);
});

// ── Memo integration (FR-030) ──

test('buildMemo renders directives between the goal and reminders', () => {
  const memo = buildMemo(
    {
      goal: 'ship the change',
      directives: [{ id: 'no-secrets', text: NO_SECRETS_TEXT }],
      reminders: [{ id: 'r1', text: 'use bash 4.5', addedAt: '2026-10-25T00:00:00.000Z' }],
      solvedItems: [{ tool: 'bash', outcome: 'tests passed' }],
      critiques: [{ text: 'arithmetic slipped', severity: 'minor', delivered: true }],
    },
    DEFAULT_MEMO_LIMITS
  );
  assert.ok(memo !== null);
  assert.ok(memo.includes(`Directives:\n- no-secrets: ${NO_SECRETS_TEXT}`));
  assert.ok(memo.indexOf('Session goal:') < memo.indexOf('Directives:'));
  assert.ok(memo.indexOf('Directives:') < memo.indexOf('Reminders:'));
  assert.ok(memo.indexOf('Reminders:') < memo.indexOf('Recently solved:'));
});

test('buildMemo omits the directives section when no directives are active', () => {
  const memo = buildMemo(
    { goal: 'g', reminders: [], solvedItems: [], critiques: [] },
    DEFAULT_MEMO_LIMITS
  );
  assert.equal(memo, 'Session goal:\ng');
});

test('buildMemo renders a directives-only memo', () => {
  const memo = buildMemo(
    { directives: [{ id: 'no-secrets', text: NO_SECRETS_TEXT }], solvedItems: [], critiques: [] },
    DEFAULT_MEMO_LIMITS
  );
  assert.equal(memo, `Directives:\n- no-secrets: ${NO_SECRETS_TEXT}`);
});

// ── Auditor integration (FR-031) ──

const AUDIT_CONFIG: AuditConfig = {
  auditorModel: 'google/gemini-3.8-flash',
  auditorVariant: 'low',
  stripMode: 'code_and_math',
  maxRegenerations: 2,
  blockRewardHacking: true,
  requireStepReferenceInTools: true,
};

test('runPeerAudit includes a directives section when text is provided', async () => {
  const prompts: string[] = [];
  const invokeModel: InvokeModel = async (prompt: string) => {
    prompts.push(prompt);
    return JSON.stringify({ passed: true, failedStep: null, severity: null, critique: 'ok' });
  };
  const outcome = await runPeerAudit(
    ['x = 1 + 1 = 2'],
    AUDIT_CONFIG,
    invokeModel,
    undefined,
    `no-secrets: ${NO_SECRETS_TEXT}`
  );
  assert.equal(outcome.passed, true);
  assert.ok(prompts[0].includes('Engineer directives (flag steps that violate them):'));
  assert.ok(prompts[0].includes(NO_SECRETS_TEXT));
});

test('runPeerAudit preserves the prior prompt when no directives are configured', async () => {
  const prompts: string[] = [];
  const invokeModel: InvokeModel = async (prompt: string) => {
    prompts.push(prompt);
    return JSON.stringify({ passed: true, failedStep: null, severity: null, critique: 'ok' });
  };
  await runPeerAudit(['x = 1 + 1 = 2'], AUDIT_CONFIG, invokeModel);
  assert.ok(!prompts[0].includes('Engineer directives'));
});

// ── Hook layer: loading, memo, guard, triggers (FR-026..FR-030, FR-032) ──

test('directive files load from the project directory into the memo', async () => {
  const dir = makeDirectiveDir({
    'no-secrets.md': directiveFile(NO_SECRETS_TEXT, NO_SECRETS_RULES),
  });
  try {
    await withCleanDirectivesEnv(async () => {
      const hooks = await plugin.server(mockPluginInput(dir));
      sessionState.get('directives-load');
      const output = { system: [] as string[] };
      await dispatchSystemTransform(hooks, { sessionID: 'directives-load', model: {} }, output);
      assert.equal(output.system.length, 1);
      assert.ok(output.system[0].includes('Directives:'));
      assert.ok(output.system[0].includes(`- no-secrets: ${NO_SECRETS_TEXT}`));
      await hooks.dispose!();
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a forbidden path blocks the tool call with the directive named', async () => {
  const dir = makeDirectiveDir({
    'no-secrets.md': directiveFile(NO_SECRETS_TEXT, NO_SECRETS_RULES),
  });
  try {
    await withCleanDirectivesEnv(async () => {
      const hooks = await plugin.server(mockPluginInput(dir));
      await assert.rejects(
        dispatchToolBefore(hooks, 'guard-session', 'bash', { command: 'cat secrets/token.ts' }),
        (error: unknown) => {
          assert.ok(error instanceof Error);
          assert.ok(error.message.includes("Execution blocked: Tool 'bash' blocked by engineer directive 'no-secrets'"));
          assert.ok(error.message.includes('secrets/token.ts'));
          return true;
        }
      );
      await hooks.dispose!();
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a forbidden pattern blocks the tool call case-insensitively', async () => {
  const dir = makeDirectiveDir({
    'no-force-push.md': directiveFile('Never force-push main.', {
      enforce: [{ forbidPattern: 'git\\s+push\\s+--force' }],
    }),
  });
  try {
    await withCleanDirectivesEnv(async () => {
      const hooks = await plugin.server(mockPluginInput(dir));
      await assert.rejects(
        dispatchToolBefore(hooks, 'pattern-session', 'bash', { command: 'git push --force origin main' }),
        /forbidden pattern 'git\\s\+push\\s\+--force'/
      );
      await hooks.dispose!();
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('clean tool calls proceed while directives are configured', async () => {
  const dir = makeDirectiveDir({
    'no-secrets.md': directiveFile(NO_SECRETS_TEXT, NO_SECRETS_RULES),
  });
  try {
    await withCleanDirectivesEnv(async () => {
      const hooks = await plugin.server(mockPluginInput(dir));
      await dispatchToolBefore(hooks, 'clean-session', 'bash', { command: 'bun test' });
      await hooks.dispose!();
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a trigger rule surfaces its directive in the memo after a matching call', async () => {
  const dir = makeDirectiveDir({
    'legacy-note.md': directiveFile('Explain migration constraints first.', {
      when: [{ path: 'src/legacy/**' }],
    }),
  });
  try {
    await withCleanDirectivesEnv(async () => {
      const hooks = await plugin.server(mockPluginInput(dir));
      sessionState.get('trigger-session');

      const before = { system: [] as string[] };
      await dispatchSystemTransform(hooks, { sessionID: 'trigger-session', model: {} }, before);
      assert.equal(before.system.length, 0);

      await dispatchToolBefore(hooks, 'trigger-session', 'edit', { path: 'src/legacy/queue.ts' });

      const after = { system: [] as string[] };
      await dispatchSystemTransform(hooks, { sessionID: 'trigger-session', model: {} }, after);
      assert.equal(after.system.length, 1);
      assert.ok(after.system[0].includes('- legacy-note: Explain migration constraints first.'));
      await hooks.dispose!();
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a blocked call still records its trigger', async () => {
  const dir = makeDirectiveDir({
    'no-secrets.md': directiveFile(NO_SECRETS_TEXT, NO_SECRETS_RULES),
    'secrets-note.md': directiveFile('Ask the engineer for vault access.', {
      when: [{ path: 'secrets/**' }],
    }),
  });
  try {
    await withCleanDirectivesEnv(async () => {
      const hooks = await plugin.server(mockPluginInput(dir));
      sessionState.get('blocked-trigger-session');
      await assert.rejects(
        dispatchToolBefore(hooks, 'blocked-trigger-session', 'bash', { command: 'cat secrets/credentials.json' })
      );
      assert.ok(sessionState.get('blocked-trigger-session').triggeredDirectives.includes('secrets-note'));
      const output = { system: [] as string[] };
      await dispatchSystemTransform(hooks, { sessionID: 'blocked-trigger-session', model: {} }, output);
      assert.equal(output.system.length, 1);
      assert.ok(output.system[0].includes('- secrets-note: Ask the engineer for vault access.'));
      await hooks.dispose!();
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a project without directives keeps the 2.1.0 behavior', async () => {
  await withCleanDirectivesEnv(async () => {
    const hooks = await plugin.server(mockPluginInput('/tmp/supervisor-test'));
    sessionState.get('baseline-session');
    sessionState.get('baseline-session').goal = 'a goal';
    const output = { system: [] as string[] };
    await dispatchSystemTransform(hooks, { sessionID: 'baseline-session', model: {} }, output);
    assert.equal(output.system.length, 1);
    assert.ok(!output.system[0].includes('Directives:'));
    await dispatchToolBefore(hooks, 'baseline-session', 'bash', { command: 'bun test' });
    await hooks.dispose!();
  });
});

test('options.directives registers directives through the tuple channel', async () => {
  await withCleanDirectivesEnv(async () => {
    const hooks = await plugin.server(mockPluginInput('/tmp/supervisor-test'), {
      directives: [{ id: 'opt-directive', text: 'Prefer bun over node.', when: [{ tool: 'bash' }] }],
    });
    sessionState.get('options-session');
    await dispatchToolBefore(hooks, 'options-session', 'bash', { command: 'bun test' });
    const output = { system: [] as string[] };
    await dispatchSystemTransform(hooks, { sessionID: 'options-session', model: {} }, output);
    assert.equal(output.system.length, 1);
    assert.ok(output.system[0].includes('- opt-directive: Prefer bun over node.'));
    await hooks.dispose!();
  });
});

test('the directive count bound drops the overflow with a warning', async () => {
  const files: Record<string, string> = {};
  for (let i = 1; i <= MAX_DIRECTIVES + 5; i += 1) {
    files[`d${String(i).padStart(2, '0')}.md`] = `policy ${i}`;
  }
  const dir = makeDirectiveDir(files);
  try {
    await withCleanDirectivesEnv(async () => {
      const warnings: string[] = [];
      const originalWarn = console.warn;
      console.warn = (message: string) => warnings.push(message);
      try {
        const hooks = await plugin.server(mockPluginInput(dir));
        sessionState.get('cap-session');
        const output = { system: [] as string[] };
        await dispatchSystemTransform(hooks, { sessionID: 'cap-session', model: {} }, output);
        assert.equal(output.system.length, 1);
        assert.ok(output.system[0].includes('- d20: policy 20'));
        assert.ok(!output.system[0].includes('d21'));
        await hooks.dispose!();
      } finally {
        console.warn = originalWarn;
      }
      assert.ok(warnings.some((w) => w.includes('beyond the cap')));
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the event-hook audit prompt carries the directives advisory', async () => {
  const dir = makeDirectiveDir({
    'no-secrets.md': directiveFile(NO_SECRETS_TEXT, NO_SECRETS_RULES),
  });
  try {
    await withCleanDirectivesEnv(async () => {
      const prompts: string[] = [];
      const input = mockPluginInput(dir);
      (input.client as { session: Record<string, unknown> }).session.prompt = async (
        request: unknown
      ) => {
        prompts.push(JSON.stringify(request));
        return {
          data: {
            info: {},
            parts: [
              {
                type: 'text',
                text: JSON.stringify({ passed: true, failedStep: null, severity: null, critique: 'ok' }),
              },
            ],
          },
        };
      };
      const hooks = await plugin.server(input);
      await dispatchPart(hooks, completedReasoningPart({ sessionID: 'audit-directives-session' }));
      await new Promise((resolve) => setTimeout(resolve, 0));
      assert.equal(prompts.length, 1);
      assert.ok(prompts[0].includes('Engineer directives (flag steps that violate them):'));
      assert.ok(prompts[0].includes(NO_SECRETS_TEXT));
      assert.ok(sessionState.get('audit-directives-session').verifiedSteps.length === 1);
      await hooks.dispose!();
    });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
