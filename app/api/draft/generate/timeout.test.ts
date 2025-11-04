export const revalidate = 0;

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { withTimeout, TimeoutError } from './timeout';

describe('withTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should complete normally if operation finishes before timeout', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    
    const promise = withTimeout(operation, { timeoutMs: 5000 });
    vi.advanceTimersByTime(1000);
    
    const result = await promise;
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should throw TimeoutError if operation exceeds timeout', async () => {
    const operation = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 6000))
    );
    
    const promise = withTimeout(operation, { timeoutMs: 5000 });
    vi.runAllTimers();
    
    await expect(promise).rejects.toThrow(TimeoutError);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should use default 10s timeout if not specified', async () => {
    const operation = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 11000))
    );
    
    const promise = withTimeout(operation);
    vi.runAllTimers();
    
    await expect(promise).rejects.toThrow(TimeoutError);
  });

  it('should respect external abort signal', async () => {
    const controller = new AbortController();
    const operation = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 5000))
    );
    
    const promise = withTimeout(operation, { 
      signal: controller.signal,
      timeoutMs: 10000 
    });
    
    vi.advanceTimersByTime(100); // Small delay
    controller.abort();
    
    await expect(promise).rejects.toThrow('Operation canceled');
  });
});
// tmp: edit 2025-11-01T12:49:32.6707271+01:00

// tmp edit 2025-11-01T12:51:20.4592023+01:00


