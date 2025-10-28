export async function withRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on 400-level errors (client errors)
      if (error?.status >= 400 && error?.status < 500) {
        throw error;
      }

      if (attempt === maxAttempts) {
        break;
      }

      // Exponential backoff with jitter
      const delayMs = Math.min(
        baseDelayMs * Math.pow(2, attempt - 1) * (0.5 + Math.random()),
        10000 // Max 10s delay
      );
      
      console.warn(`Retry attempt ${attempt}/${maxAttempts} after ${delayMs}ms:`, error);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError || new Error('Operation failed after retries');
}