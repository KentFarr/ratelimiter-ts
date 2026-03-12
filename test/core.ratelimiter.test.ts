/**
 * Exercises the high-level `Ratelimiter` class, ensuring it evaluates limits,
 * updates the store, and emits the expected telemetry events.
 */
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import { Ratelimiter } from "../src/core/limiter";
import { fixedWindow } from "../src/algorithms/fixed-window";
import { MemoryStore } from "../src/stores/memory.store";
import type { HttpRequest } from "../src/types/https";

describe("Ratelimiter", () => {
  const windowMs = 1000;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("writes a new timestamp and emits request:checked when permitted", async () => {
    const store = new MemoryStore();
    const limiter = new Ratelimiter({
      algorithm: fixedWindow,
      key: (req: HttpRequest) => req.path,
      limit: 2,
      windowMs,
      store,
    });

    const checked = vi.fn();
    limiter.on("request:checked", checked);

    const req: HttpRequest = {
      path: "/api",
      method: "GET",
      headers: {},
    };

    const result = await limiter.check(req);

    expect(result.permitted).toBe(true);
    expect(result.remaining).toBe(2);
    expect(result.limit).toBe(2);
    expect(result.key).toBe("/api");

    const timestamps = await store.get("/api");
    expect(timestamps.length).toBe(1);

    expect(checked).toHaveBeenCalledTimes(1);
    const event = checked.mock.calls[0][0];
    expect(event.key).toBe("/api");
    expect(event.route).toBe("/api");
    expect(event.limit).toBe(2);
    expect(event.remaining).toBe(2);
    expect(event.percentUsed).toBe(0);
  });

  it("does not write a new timestamp and emits limit:reached when rejected", async () => {
    const store = new MemoryStore();
    const key = "/api";
    const limit = 2;

    // Pre-populate the store with timestamps that already use up the window.
    const now = Date.now();
    const start = Math.floor(now / windowMs) * windowMs;
    await store.set(key, [start + 10, start + 20]);

    const limiter = new Ratelimiter({
      algorithm: fixedWindow,
      key: (req: HttpRequest) => req.path,
      limit,
      windowMs,
      store,
    });

    const checked = vi.fn();
    const reached = vi.fn();
    limiter.on("request:checked", checked);
    limiter.on("limit:reached", reached);

    const req: HttpRequest = {
      path: key,
      method: "GET",
      headers: {},
    };

    const result = await limiter.check(req);

    expect(result.permitted).toBe(false);
    expect(result.remaining).toBe(0);

    const timestampsAfter = await store.get(key);
    expect(timestampsAfter).toEqual([start + 10, start + 20]);

    expect(checked).toHaveBeenCalledTimes(1);
    expect(reached).toHaveBeenCalledTimes(1);

    const event = reached.mock.calls[0][0];
    expect(event.key).toBe(key);
    expect(event.route).toBe(key);
    expect(event.limit).toBe(limit);
    expect(event.remaining).toBe(0);
  });

  it("emits limit:warning when usage exceeds 80% of the limit", async () => {
    const store = new MemoryStore();
    const key = "/api";
    const limit = 10;

    const now = Date.now();
    const start = Math.floor(now / windowMs) * windowMs;

    // Nine requests already in the current window (90% of limit).
    const timestamps = Array.from({ length: 9 }, (_, i) => start + 10 + i);
    await store.set(key, timestamps);

    const limiter = new Ratelimiter({
      algorithm: fixedWindow,
      key: (req: HttpRequest) => req.path,
      limit,
      windowMs,
      store,
    });

    const warning = vi.fn();
    const checked = vi.fn();
    limiter.on("limit:warning", warning);
    limiter.on("request:checked", checked);

    const req: HttpRequest = {
      path: key,
      method: "GET",
      headers: {},
    };

    const result = await limiter.check(req);

    expect(result.permitted).toBe(true);
    expect(result.remaining).toBe(1);

    expect(checked).toHaveBeenCalledTimes(1);
    expect(warning).toHaveBeenCalledTimes(1);

    const event = warning.mock.calls[0][0];
    expect(event.key).toBe(key);
    expect(event.route).toBe(key);
    expect(event.limit).toBe(limit);
    expect(event.remaining).toBe(1);
    expect(event.percentUsed).toBeGreaterThan(80);
  });
});
