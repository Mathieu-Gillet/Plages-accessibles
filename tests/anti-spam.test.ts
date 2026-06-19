import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { isHoneypotTriggered, isRateLimited, clientIp } from '@/lib/anti-spam'

describe('isHoneypotTriggered', () => {
  it('is false when the decoy field is absent or empty', () => {
    expect(isHoneypotTriggered({})).toBe(false)
    expect(isHoneypotTriggered({ website: '' })).toBe(false)
    expect(isHoneypotTriggered(null)).toBe(false)
    expect(isHoneypotTriggered('nope')).toBe(false)
  })

  it('is true when the decoy field is filled (a bot)', () => {
    expect(isHoneypotTriggered({ website: 'http://spam.example' })).toBe(true)
  })
})

describe('clientIp', () => {
  it('prefers the platform-set x-real-ip header', () => {
    const req = new Request('https://x', {
      headers: { 'x-real-ip': '9.9.9.9', 'x-forwarded-for': '1.1.1.1, 2.2.2.2' },
    })
    expect(clientIp(req)).toBe('9.9.9.9')
  })

  it('falls back to the left-most x-forwarded-for entry', () => {
    const req = new Request('https://x', { headers: { 'x-forwarded-for': '1.1.1.1, 2.2.2.2' } })
    expect(clientIp(req)).toBe('1.1.1.1')
  })

  it('returns "unknown" when no IP header is present', () => {
    expect(clientIp(new Request('https://x'))).toBe('unknown')
  })
})

describe('isRateLimited', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 1))
  })
  afterEach(() => vi.useRealTimers())

  it('allows up to `max` calls then blocks within the window', () => {
    const ip = 'test-ip-a'
    expect(isRateLimited(ip, 3)).toBe(false) // 1
    expect(isRateLimited(ip, 3)).toBe(false) // 2
    expect(isRateLimited(ip, 3)).toBe(false) // 3
    expect(isRateLimited(ip, 3)).toBe(true) // 4 — over the limit
  })

  it('tracks each IP independently', () => {
    expect(isRateLimited('test-ip-b', 1)).toBe(false)
    expect(isRateLimited('test-ip-b', 1)).toBe(true)
    expect(isRateLimited('test-ip-c', 1)).toBe(false) // different IP, fresh budget
  })

  it('resets once the window has elapsed', () => {
    const ip = 'test-ip-d'
    expect(isRateLimited(ip, 1, 1000)).toBe(false)
    expect(isRateLimited(ip, 1, 1000)).toBe(true)
    vi.advanceTimersByTime(1001)
    expect(isRateLimited(ip, 1, 1000)).toBe(false)
  })
})
