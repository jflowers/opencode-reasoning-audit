import test from 'node:test';
import assert from 'node:assert/strict';
import plugin from '../index.ts';
import { stripNarrative } from '../src/stripper.ts';
import { verifyToolIntent } from '../src/tool-guard.ts';

test('stripNarrative isolates code and math steps', () => {
  const steps = [
    'First let us think about the problem.',
    'rate = 24 * 15 = 360',
    '```ts\nconst ok = true;\n```',
  ];
  const cleaned = stripNarrative(steps, 'code_and_math');
  assert.equal(cleaned.length, 2);
});

test('onMessageUpdated injects challenge and triggers regenerate on math error', async () => {
  const injected: any[] = [];
  let regeneratedCount = 0;

  const mockSession = {
    id: 'test-session-1',
    async injectMessage(msg: any) {
      injected.push(msg);
    },
    async regenerate() {
      regeneratedCount += 1;
    },
  };

  const faultyMessage = {
    role: 'assistant',
    content: 'Total capacity is 340.',
    reasoning_steps: [
      'Let us compute the capacity.',
      'capacity = 24 * 15 = 340',
    ],
  };

  await plugin.onMessageUpdated(faultyMessage, mockSession);

  assert.equal(faultyMessage.is_audited, true);
  assert.equal(injected.length, 1);
  assert.ok(injected[0].content.includes('CRITICAL LOGIC ERROR DETECTED BY AUDITOR'));
  assert.equal(regeneratedCount, 1);
});

test('onToolExecute blocks reward hacking (--no-verify)', () => {
  assert.throws(() => {
    plugin.onToolExecute({
      name: 'bash',
      arguments: { command: 'git commit -m "bypass" --no-verify' },
    });
  }, /Execution blocked/);
});
