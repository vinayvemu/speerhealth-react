import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test the echo suppressor in isolation (not importing the singleton)
class EchoSuppressor {
  private readonly pending = new Set<string>();
  private readonly TTL: number;

  constructor(ttl = 3000) { this.TTL = ttl; }

  tag(id: string): void {
    this.pending.add(id);
    setTimeout(() => this.pending.delete(id), this.TTL);
  }

  isMine(id: string): boolean {
    return this.pending.has(id);
  }
}

describe('EchoSuppressor', () => {
  let suppressor: EchoSuppressor;

  beforeEach(() => {
    vi.useFakeTimers();
    suppressor = new EchoSuppressor(3000);
  });

  afterEach(() => { vi.useRealTimers(); });

  it('returns false for untagged IDs', () => {
    expect(suppressor.isMine('abc')).toBe(false);
  });

  it('returns true immediately after tagging', () => {
    suppressor.tag('abc');
    expect(suppressor.isMine('abc')).toBe(true);
  });

  it('returns false after TTL expires', () => {
    suppressor.tag('abc');
    vi.advanceTimersByTime(3001);
    expect(suppressor.isMine('abc')).toBe(false);
  });

  it('handles multiple IDs independently', () => {
    suppressor.tag('id-1');
    suppressor.tag('id-2');
    expect(suppressor.isMine('id-1')).toBe(true);
    expect(suppressor.isMine('id-2')).toBe(true);
    expect(suppressor.isMine('id-3')).toBe(false);
  });

  it('can re-tag after expiry', () => {
    suppressor.tag('abc');
    vi.advanceTimersByTime(3001);
    expect(suppressor.isMine('abc')).toBe(false);
    suppressor.tag('abc');
    expect(suppressor.isMine('abc')).toBe(true);
  });

  it('does not affect other IDs when one expires', () => {
    suppressor.tag('first');
    vi.advanceTimersByTime(1500);
    suppressor.tag('second'); // tagged 1.5s later
    vi.advanceTimersByTime(1501); // first expires, second still valid
    expect(suppressor.isMine('first')).toBe(false);
    expect(suppressor.isMine('second')).toBe(true);
  });
});
