/**
 * Tests the fixed-window rate limiting algorithm in isolation.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { fixedWindow } from "../src/algorithms/fixed-window";

describe("fixedWindow", () => {
  const windowMs = 1000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("permits when there is no prior activity", () => {
    const result = fixedWindow([], 5, "key", windowMs);

    expect(result.permitted).toBe(true);
    expect(result.remaining).toBe(5);
    expect(result.limit).toBe(5);
    expect(result.key).toBe("key");

    const now = Date.now();
    expect(result.resetTime).toBe(now + windowMs);
  });

  it("permits when under the limit within the current window", () => {
    const now = Date.now();
    const start = Math.floor(now / windowMs) * windowMs;

    const timestamps = [start + 10, start + 20];
    const result = fixedWindow(timestamps, 5, "key", windowMs);

    expect(result.permitted).toBe(true);
    expect(result.remaining).toBe(3);
    expect(result.resetTime).toBe(start + windowMs);
  });

  it("rejects when exactly at the limit in the current window", () => {
    const now = Date.now();
    const start = Math.floor(now / windowMs) * windowMs;

    const timestamps = [
      start + 10,
      start + 20,
      start + 30,
      start + 40,
      start + 50,
    ];

    const result = fixedWindow(timestamps, 5, "key", windowMs);

    expect(result.permitted).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetTime).toBe(start + windowMs);
  });

  it("counts only timestamps from the current window", () => {
    const now = Date.now();
    const start = Math.floor(now / windowMs) * windowMs;
    const previousWindowStart = start - windowMs;

    const timestamps = [
      previousWindowStart + 900, // outside current window
      start + 10,
      start + 20,
    ];

    const result = fixedWindow(timestamps, 5, "key", windowMs);

    expect(result.permitted).toBe(true);
    expect(result.remaining).toBe(3);
    expect(result.resetTime).toBe(start + windowMs);
  });

  it("rejects when over the limit in the current window", () => {
    const now = Date.now();
    const start = Math.floor(now / windowMs) * windowMs;

    const timestamps = [
      start + 10,
      start + 20,
      start + 30,
      start + 40,
      start + 50,
      start + 60,
    ];

    const result = fixedWindow(timestamps, 5, "key", windowMs);

    expect(result.permitted).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetTime).toBe(start + windowMs);
  });
});
