/**
 * Abstract contract for a timestamp store used by the rate limiter.
 *
 * Implementations can be in–memory, Redis, a database, or any other
 * backend that can persist an ordered list of request timestamps.
 */
export interface StoreInterface {
  /**
   * Returns all known timestamps (epoch ms) associated with the key.
   */
  get(key: string): Promise<number[]>;

  /**
   * Persists the full list of timestamps for the given key.
   */
  set(key: string, value: number[]): Promise<void>;

  /**
   * Deletes all timestamps and metadata associated with the key.
   */
  delete(key: string): Promise<void>;
}