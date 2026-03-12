import { StoreInterface } from "./store.interface";

/**
 * Simple in–memory implementation of {@link StoreInterface}.
 *
 * This is suitable for demos, tests, or single–process applications.
 * For distributed deployments you should implement a shared store
 * (e.g. Redis) that satisfies the same interface.
 */
export class MemoryStore implements StoreInterface {
  private readonly store: Map<string, number[]> = new Map();

  async get(key: string): Promise<number[]> {
    return this.store.get(key) || [];
  }

  async set(key: string, value: number[]): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}