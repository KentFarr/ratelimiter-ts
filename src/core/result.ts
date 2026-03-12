/**
 * Result of evaluating a rate–limit decision.
 */
export interface LimitResult {
  /**
   * Whether the current request is allowed to proceed.
   */
  permitted: boolean;

  /**
   * How many requests are still allowed in the current window.
   */
  remaining: number;

  /**
   * Epoch time in milliseconds at which the current window resets
   * and the caller can expect the counter to be refreshed.
   */
  resetTime: number;

  /**
   * The configured maximum number of requests for this key and window.
   */
  limit: number;

  /**
   * Logical identifier that was limited (IP, user ID, route, etc.).
   */
  key: string;
}