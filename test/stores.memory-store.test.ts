/**
 * Tests the in-memory store implementation used by the rate limiter.
 */
import { describe, it, expect } from "vitest";
import { MemoryStore } from "../src/stores/memory.store";

describe("MemoryStore", () => {
  it("returns an empty array for unknown keys", async () => {
    const store = new MemoryStore();
    const result = await store.get("missing");

    expect(result).toEqual([]);
  });

  it("persists and retrieves timestamps per key", async () => {
    const store = new MemoryStore();
    const timestamps = [1, 2, 3];

    await store.set("a", timestamps);
    const result = await store.get("a");

    expect(result).toEqual(timestamps);
  });

  it("isolates values across different keys", async () => {
    const store = new MemoryStore();

    await store.set("a", [1]);
    await store.set("b", [2, 3]);

    const a = await store.get("a");
    const b = await store.get("b");

    expect(a).toEqual([1]);
    expect(b).toEqual([2, 3]);
  });

  it("deletes values for a key", async () => {
    const store = new MemoryStore();

    await store.set("a", [1, 2]);
    await store.delete("a");

    const result = await store.get("a");
    expect(result).toEqual([]);
  });
});
