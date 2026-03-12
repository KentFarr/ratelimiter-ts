import { EventEmitter } from "events";

/**
 * Payload describing a single rate‑limit evaluation.
 *
 * This is emitted for both successful and rejected requests so that callers
 * can log, observe, or react to rate‑limit activity in a central place.
 */
export interface RateLimitEvent {
  /**
   * Logical key that was limited (IP, user ID, route, etc.).
   */
  key: string;

  /**
   * Requested route/path as seen by the limiter.
   */
  route: string;

  /**
   * Configured maximum number of requests for this key and window.
   */
  limit: number;

  /**
   * How many requests remain before the limit is exceeded.
   */
  remaining: number;

  /**
   * Epoch time in milliseconds when the window resets.
   */
  resetTime: number;

  /**
   * Convenience metric: percentage of the limit that has been used.
   */
  percentUsed: number;
}

/**
 * Typed wrapper around Node's `EventEmitter` for rate‑limit events.
 *
 * The `Ratelimiter` class extends this to expose a simple, semantic API:
 * - `"limit:reached"` when a request is rejected.
 * - `"limit:warning"` when usage passes a high‑water mark.
 * - `"request:checked"` after every evaluation.
 */
export class RateLimitEventEmitter extends EventEmitter {
  emitLimitReached(event: RateLimitEvent): void {
    this.emit("limit:reached", event);
  }

  emitLimitWarning(event: RateLimitEvent): void {
    this.emit("limit:warning", event);
  }

  emitRequestChecked(event: RateLimitEvent): void {
    this.emit("request:checked", event);
  }
}