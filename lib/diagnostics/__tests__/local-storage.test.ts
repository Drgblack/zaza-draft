// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from 'vitest'

import { getLastRunFromStorage, saveLastRunTimestamp } from '@/lib/diagnostics/local-storage'

beforeEach(() => {
  window.localStorage.clear()
})

describe('diagnostics local storage', () => {
  it('returns null when no timestamp', () => {
    expect(getLastRunFromStorage()).toBeNull()
  })

  it('saves and reads an ISO timestamp', () => {
    const date = new Date('2026-01-15T12:34:56.789Z')
    saveLastRunTimestamp(date)
    const parsed = getLastRunFromStorage()
    expect(parsed).not.toBeNull()
    expect(parsed?.seconds).toBe(Math.floor(date.getTime() / 1000))
    expect(parsed?.nanoseconds).toBe((date.getTime() % 1000) * 1_000_000)
  })
})
