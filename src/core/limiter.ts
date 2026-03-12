import { StoreInterface } from "../stores/store.interface";
import type { HttpRequest } from "../types/https";
import { LimitResult } from "./result";
import { RateLimitEvent, RateLimitEventEmitter } from "../events/emitter";

/**
 * Configuration for a `Ratelimiter` instance.
 *
 * You plug in:
 * - a rate‑limit algorithm (e.g. `fixedWindow` or `slidingWindow`),
 * - a key‑derivation function (e.g. `ipKey`, `routeKey`, or `userKey`),
 * - the numeric limit and window size,
 * - and a store implementation for persistence.
 */
export interface RatelimiterConfig {
  /**
   * Pure function that evaluates the rate limit based on prior timestamps.
   */
  algorithm: (
    timestamps: number[],
    limit: number,
    key: string,
    windowMs: number
  ) => LimitResult;

  /**
   * Function that maps an incoming request to a logical rate‑limit key.
   */
  key: (req: HttpRequest) => string;

  /**
   * Maximum number of requests allowed per window.
   */
  limit: number;

  /**
   * Size of the evaluation window in milliseconds.
   */
  windowMs: number;

  /**
   * Storage backend used to load and persist request timestamps.
   */
  store: StoreInterface;
}

/**
 * High‑level rate limiter that ties together an algorithm, key function,
 * and store, and emits structured events describing usage.
 */
export class Ratelimiter extends RateLimitEventEmitter {
  constructor(private config: RatelimiterConfig) {
    super();
  }

  /**
   * Evaluate the rate limit for a given request.
   *
   * This method:
   * - derives the key,
   * - loads historical timestamps from the store,
   * - runs the configured algorithm,
   * - appends a new timestamp when permitted,
   * - emits rich telemetry events,
   * - and returns the `LimitResult`.
   */
  async check(req: HttpRequest): Promise<LimitResult> {
    const key = this.config.key(req);
    const timestamps = await this.config.store.get(key);

    const result = this.config.algorithm(
      timestamps,
      this.config.limit,
      key,
      this.config.windowMs
    );

    const percentUsed =
      ((this.config.limit - result.remaining) / this.config.limit) * 100;

    const event: RateLimitEvent = {
      key: result.key,
      route: req.path,
      limit: result.limit,
      remaining: result.remaining,
      resetTime: result.resetTime,
      percentUsed,
    };

    if (result.permitted) {
      await this.config.store.set(key, [...timestamps, Date.now()]);
    }

    if (!result.permitted) {
      this.emitLimitReached(event);
    }

    if (percentUsed > 80) {
      this.emitLimitWarning(event);
    }

    this.emitRequestChecked(event);
    return result;
  }
}
