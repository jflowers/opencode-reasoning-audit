import type { PluginInput } from '@opencode-ai/plugin';

/**
 * Shared hook-layer test mock (review round 2, CS-004): a plugin
 * input whose `app.log` records entries, for log-routing tests
 * (FR-052). Previously duplicated across the audit, directives, and
 * gates test files.
 */
export function recordingPluginInput(
  directory: string = '/tmp/supervisor-test'
): { input: PluginInput; logEntries: Array<{ level: string; message: string }> } {
  const logEntries: Array<{ level: string; message: string }> = [];
  const input = {
    client: {
      session: {
        create: async () => ({ data: { id: 'mock-side-session' } }),
        prompt: async () => ({ data: { info: {}, parts: [] } }),
        promptAsync: async () => ({}),
        abort: async () => ({}),
        delete: async () => ({}),
      },
      app: {
        log: async (options: unknown) => {
          const body = (options as { body?: { level?: string; message?: string } }).body;
          logEntries.push({ level: body?.level ?? '', message: body?.message ?? '' });
          return {};
        },
      },
      config: { get: async () => ({ data: { small_model: 'mock/derived-model' } }) },
    },
    directory,
  };
  return { input: input as unknown as PluginInput, logEntries };
}

/**
 * Shared hook-layer test mock (review round 4): a silent plugin input —
 * `app.log` is a no-op and `config.get` serves a derived model — for
 * tests that exercise hook behavior rather than log routing. Previously
 * the dominant inline stub across the audit, console, directives,
 * gates, and reminders test files.
 */
export function silentPluginInput(directory: string = '/tmp/supervisor-test'): PluginInput {
  const input = {
    client: {
      session: {
        create: async () => ({ data: { id: 'mock-side-session' } }),
        prompt: async () => ({ data: { info: {}, parts: [] } }),
        promptAsync: async () => ({}),
        abort: async () => ({}),
        delete: async () => ({}),
      },
      app: {
        log: async () => ({}),
      },
      config: { get: async () => ({ data: { small_model: 'mock/derived-model' } }) },
    },
    directory,
  };
  return input as unknown as PluginInput;
}

/**
 * Shared silent client surface (review round 5): spread into bespoke
 * mock clients so hand-built harnesses get the same no-op `app.log`
 * and derived-model `config.get` as `silentPluginInput` without
 * re-copying the pair. Tests that need a different `config.get`
 * (an empty config, to keep no model resolved) keep that part
 * inline after the spread.
 */
export const silentClientSurface = {
  app: { log: async () => ({}) },
  config: { get: async () => ({ data: { small_model: 'mock/derived-model' } }) },
};
