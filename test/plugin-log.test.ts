import test from 'node:test';
import assert from 'node:assert/strict';
import type { PluginInput } from '@opencode-ai/plugin';
import { createPluginLogger, PLUGIN_LOG_DEDUPE_CAP, PLUGIN_LOG_SERVICE } from '../src/plugin-log.ts';

/** Recorded /log call shape. */
interface RecordedLogCall {
  body?: { service?: string; level?: string; message?: string; extra?: Record<string, unknown> };
}

/** A client whose app.log records every call. */
function recordingClient(): { client: PluginInput['client']; calls: RecordedLogCall[] } {
  const calls: RecordedLogCall[] = [];
  const client = {
    app: {
      log: async (options: RecordedLogCall) => {
        calls.push(options);
        return {};
      },
    },
  };
  return { client: client as unknown as PluginInput['client'], calls };
}

test('createPluginLogger routes info, warn, and error through app.log with the service tag', () => {
  const { client, calls } = recordingClient();
  const logger = createPluginLogger(client);

  logger.info('identity line');
  logger.warn('config file ignored');
  logger.error('tool guard failed open');

  assert.equal(calls.length, 3);
  for (const call of calls) {
    assert.equal(call.body?.service, PLUGIN_LOG_SERVICE);
  }
  assert.deepEqual(
    calls.map((call) => call.body?.level),
    ['info', 'warn', 'error']
  );
  assert.deepEqual(
    calls.map((call) => call.body?.message),
    ['identity line', 'config file ignored', 'tool guard failed open']
  );
});

test('warn and error entries dedupe by level and message; info never dedupes', () => {
  const { client, calls } = recordingClient();
  const logger = createPluginLogger(client);

  logger.warn('same warning');
  logger.warn('same warning');
  logger.warn('same warning');
  logger.error('same error');
  logger.error('same error');
  // The same MESSAGE at a different level is a different entry.
  logger.error('same warning');
  // Info entries are structurally rare (identity, triggers, grants) and
  // never deduplicated, so a retried identity line still lands (FR-054).
  logger.info('same info');
  logger.info('same info');

  const warns = calls.filter((call) => call.body?.level === 'warn');
  const errors = calls.filter((call) => call.body?.level === 'error');
  const infos = calls.filter((call) => call.body?.level === 'info');
  assert.equal(warns.length, 1);
  assert.equal(errors.length, 2); // 'same error' + 'same warning' at error level
  assert.equal(infos.length, 2);
});

test('the dedupe set clears at its cap, so pre-cap messages can log again', () => {
  const { client, calls } = recordingClient();
  const logger = createPluginLogger(client);

  // Distinct warnings up to and past the cap all deliver.
  for (let i = 0; i < PLUGIN_LOG_DEDUPE_CAP + 1; i += 1) {
    logger.warn(`distinct warning ${i}`);
  }
  assert.equal(calls.length, PLUGIN_LOG_DEDUPE_CAP + 1);

  // The cap-reaching insert cleared the set, so message #0 —
  // normally deduplicated from here on — is delivered again.
  logger.warn('distinct warning 0');
  assert.equal(calls.length, PLUGIN_LOG_DEDUPE_CAP + 2);
  assert.equal(calls[calls.length - 1].body?.message, 'distinct warning 0');
});

test('empty messages are skipped and extra metadata rides the body', () => {
  const { client, calls } = recordingClient();
  const logger = createPluginLogger(client);

  logger.info('');
  logger.warn('');
  logger.error('with extra', { sessionID: 's-1' });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].body?.message, 'with extra');
  assert.deepEqual(calls[0].body?.extra, { sessionID: 's-1' });
});

test('a rejected app.log POST is absorbed — no throw, no unhandled rejection', async () => {
  const client = {
    app: {
      log: async () => {
        throw new Error('server listener not up yet');
      },
    },
  } as unknown as PluginInput['client'];
  const logger = createPluginLogger(client);

  const unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown) => unhandled.push(reason);
  process.on('unhandledRejection', onUnhandled);
  try {
    assert.doesNotThrow(() => logger.error('bootstrap-time failure'));
    // Let the rejected promise's microtask queue drain.
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(unhandled.length, 0);
  } finally {
    process.off('unhandledRejection', onUnhandled);
  }
});

test('a client without a resolvable app surface is absorbed synchronously', () => {
  const logger = createPluginLogger({} as unknown as PluginInput['client']);
  assert.doesNotThrow(() => logger.info('identity line'));
  assert.doesNotThrow(() => logger.warn('degraded client'));
  assert.doesNotThrow(() => logger.error('degraded client'));
});

test('the logger never writes to console (FR-052: no stdout/stderr)', () => {
  const { client } = recordingClient();
  const logger = createPluginLogger(client);

  const writes: string[] = [];
  const original = { log: console.log, warn: console.warn, error: console.error };
  console.log = (...args: unknown[]) => writes.push(`log:${args.join(' ')}`);
  console.warn = (...args: unknown[]) => writes.push(`warn:${args.join(' ')}`);
  console.error = (...args: unknown[]) => writes.push(`error:${args.join(' ')}`);
  try {
    logger.info('identity line');
    logger.warn('config file ignored');
    logger.error('tool guard failed open');
  } finally {
    console.log = original.log;
    console.warn = original.warn;
    console.error = original.error;
  }
  assert.equal(writes.length, 0);
});
