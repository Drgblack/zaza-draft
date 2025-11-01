export type TimeoutOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
};

export class TimeoutError extends Error {
  constructor(message = 'Operation timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export class CancelError extends Error {
  constructor(message = 'Operation canceled') {
    super(message);
    this.name = 'CancelError';
  }
}

export async function withTimeout<T>(
  operation: () => Promise<T>,
  { signal, timeoutMs = 10_000 }: TimeoutOptions = {}
): Promise<T> {
  const timeoutController = new AbortController();
  const timeout = setTimeout(() => timeoutController.abort(), timeoutMs);

  // Create composite abort signal if external signal provided
  const abortController = signal ? new AbortController() : timeoutController;
  if (signal) {
    signal.addEventListener('abort', () => abortController.abort());
    timeoutController.signal.addEventListener('abort', () => abortController.abort());
  }

  try {
    return await Promise.race([
      operation(),
      new Promise<T>((_, reject) => {
        abortController.signal.addEventListener('abort', () => {
          if (signal?.aborted) {
            reject(new CancelError());
          } else {
            reject(new TimeoutError());
          }
        });
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}