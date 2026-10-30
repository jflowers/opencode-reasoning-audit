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
