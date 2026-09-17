export type RuntimeBindings = {
  DEEPSEEK_API_KEY?: string;
  DEEPSEEK_COACH_MODEL?: string;
  DEEPSEEK_EVALUATION_MODEL?: string;
};

declare global {
  // The legacy Sites worker can still inject model configuration while the
  // Vercel runtime reads the same values directly from process.env.
  var __AIPM_RUNTIME_ENV__: RuntimeBindings | undefined;
}

export function setRuntimeBindings(bindings: RuntimeBindings) {
  globalThis.__AIPM_RUNTIME_ENV__ = bindings;
}

export function getRuntimeBindings() {
  return globalThis.__AIPM_RUNTIME_ENV__ ?? {};
}
