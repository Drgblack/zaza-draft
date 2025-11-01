// app/api/draft/generate/retry.ts
export class TimeoutError extends Error {
  constructor(message = "Operation timed out") {
    super(message);
    this.name = "TimeoutError";
  }
}

export class CancelError extends Error {
  constructor(message = "Operation cancelled") {
    super(message);
    this.name = "CancelError";
  }
}

export type RetryOptions = {
  attempts?: number;          // total attempts incl. the first run (default 3)
  base?: number;              // base backoff in ms (default 500)
  factor?: number;            // exponential factor (default 1.5)
  jitter?: boolean;           // add +/- 50 % jitter (default true)
  maxDelay?: number;          // cap the backoff (default 10_000)
  timeoutMs?: number;         // per-attempt timeout (default undefined = no per-attempt timeout)
  signal?: AbortSignal;       // external cancellation
  shouldRetry?: (err: unknown) => boolean; // retry predicate
  onRetry?: (err: unknown, attempt: number, delayMs: number) => void; // hook
  logger?: (msg: string) => void; // optional logger; if omitted, silent by default
};

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => {
      if (signal) signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(t);
      reject(new CancelError());
    }
    if (signal) signal.addEventListener("abort", onAbort, { once: true });
  });
}

export async function withRetry<T>(
  fn: (attempt: number, signal?: AbortSignal) => Promise<T>,
  opts: RetryOptions = {}
): Promise<T> {
  const {
    attempts = 3,
    base = 500,
    factor = 1.5,
    jitter = true,
    maxDelay = 10_000,
    timeoutMs,
    signal,
    shouldRetry = () => true,
    onRetry,
    logger: loggerOpt,
  } = opts;

  // Only log if explicitly asked to or env flag set
  const logger =
    loggerOpt ||
    (process.env.DEBUG_RETRY === "1" ? (msg: string) => console.log(msg) : undefined);

  for (let attempt = 1; attempt <= attempts; attempt++) {
    // Per-attempt timeout wrapper
    const controller = new AbortController();
    const composite = mergeSignals(signal, controller.signal);

    try {
      const run = fn(attempt, composite);
      const result = timeoutMs
        ? await promiseWithTimeout(run, timeoutMs, controller)
        : await run;
      return result;
    } catch (err) {
      // External cancellation should surface immediately
      if (isAbort(signal)) throw new CancelError();

      // Non-retryable? bubble out
      if (!shouldRetry(err) || attempt === attempts) {
        throw err;
      }

      // Backoff
      let delay = Math.min(maxDelay, Math.floor(base * Math.pow(factor, attempt - 1)));
      if (jitter) {
        const jitterFactor = 1 + (Math.random() * 1.0 - 0.5); // +/- 50%
        delay = Math.max(0, Math.floor(delay * jitterFactor));
      }

      if (logger) logger(`Retry attempt ${attempt}/${attempts} after ${delay}ms: ${formatErr(err)}`);
      if (onRetry) onRetry(err, attempt, delay);

      await sleep(delay, signal);
      continue;
    }
  }
  // Should never reach here
  // eslint-disable-next-line no-throw-literal
  throw new Error("withRetry: exhausted attempts unexpectedly");
}

function isAbort(signal?: AbortSignal) {
  return !!(signal && signal.aborted);
}

function formatErr(err: unknown) {
  return err instanceof Error ? err.message : String(err);
}

function mergeSignals(a?: AbortSignal, b?: AbortSignal): AbortSignal | undefined {
  if (!a && !b) return undefined;
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  if (a) a.addEventListener("abort", onAbort);
  if (b) b.addEventListener("abort", onAbort);
  if (a?.aborted || b?.aborted) ctrl.abort();
  return ctrl.signal;
}

async function promiseWithTimeout<T>(
  p: Promise<T>,
  ms: number,
  controller: AbortController
): Promise<T> {
  let t: NodeJS.Timeout;

  // Resolve with a sentinel on timeout instead of rejecting to avoid unhandled rejections
  const TIMEOUT = Symbol("timeout");

  // Guard the original promise: if we aborted, swallow its late rejection
  const guarded = p.then(
    (v) => v,
    (e) => {
      if (controller.signal.aborted) {
        return new Promise<T>(() => {}); // never settles; prevents late unhandled rejection
      }
      throw e;
    }
  );

  const timeout = new Promise<typeof TIMEOUT>((resolve) => {
    t = setTimeout(() => {
      controller.abort();
      resolve(TIMEOUT);
    }, ms);
  });

  try {
    const result = await Promise.race<[T | typeof TIMEOUT]>([guarded as any, timeout as any]);
    if (result === TIMEOUT) throw new TimeoutError();return result as T;
  } finally {
    clearTimeout(t!);
  }
}