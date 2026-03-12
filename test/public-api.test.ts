/**
 * Verifies that the package's public API surface re-exports the
 * expected algorithms, stores, key helpers, and adapter.
 */
import { describe, it, expect } from "vitest";
import {
  fixedWindow,
  slidingWindow,
  MemoryStore,
  ipKey,
  routeKey,
  userKey,
  Ratelimiter,
  expressAdapter,
} from "../src";

describe("public API surface", () => {
  it("exposes rate limit algorithms", () => {
    expect(typeof fixedWindow).toBe("function");
    expect(typeof slidingWindow).toBe("function");
  });

  it("exposes store implementations", () => {
    expect(typeof MemoryStore).toBe("function");
    const store = new MemoryStore();
    expect(store).toBeInstanceOf(MemoryStore);
  });

  it("exposes key derivation helpers", () => {
    expect(typeof ipKey).toBe("function");
    expect(typeof routeKey).toBe("function");
    expect(typeof userKey).toBe("function");
  });

  it("exposes the Ratelimiter class and express adapter", () => {
    expect(typeof Ratelimiter).toBe("function");
    expect(typeof expressAdapter).toBe("function");
  });
});
