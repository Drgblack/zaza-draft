import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { withRetry } from './retry';

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return immediately on success', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    const result = await withRetry(operation);
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed eventually', async () => {
    vi.useRealTimers();
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('Temporary error'))
      .mockRejectedValueOnce(new Error('Another temporary error'))
      .mockResolvedValue('success');

    const result = await withRetry(operation);
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should not retry on 4xx errors', async () => {
    const clientError = new Error('Bad request');
    (clientError as any).status = 400;
    
    const operation = vi.fn().mockRejectedValue(clientError);
    
    await expect(withRetry(operation)).rejects.toThrow('Bad request');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should respect max attempts', async () => {
    vi.useRealTimers();
    const operation = vi.fn().mockRejectedValue(new Error('Persistent error'));
    
    await expect(withRetry(operation, 3)).rejects.toThrow('Persistent error');
    expect(operation).toHaveBeenCalledTimes(3);
  });
});