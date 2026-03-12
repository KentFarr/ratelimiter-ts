import { LimitResult } from "../core/result";

/**
 * Evaluates a sliding–window rate limit.
 *
 * The window is defined as `(now - windowMs, now]`. All `timestamps` that fall
 * into this interval are counted to determine whether the current request
 * should be permitted.
 *
 * @param timestamps - Historical request timestamps for this key (epoch ms).
 * @param limit - Maximum number of requests allowed in the sliding window.
 * @param key - Logical identifier being limited (IP, user ID, route, etc.).
 * @param windowMs - Size of the sliding window in milliseconds.
 * @returns A {@link LimitResult} describing whether the request is permitted
 *          and when the current window will reset.
 */
export function slidingWindow(
  timestamps: number[],
  limit: number,
  key: string,
  windowMs: number
): LimitResult {
  const now = Date.now();
  const start = now - windowMs;

  // If we have previous activity, reset when the earliest in–window
  // timestamp falls out of the window; otherwise, reset is one full
  // window in the future from "now".
  const end =
    timestamps.length > 0 ? timestamps[0] + windowMs : now + windowMs;

  const totalRequests = timestamps.filter(
    (timestamp) => timestamp >= start && timestamp < end
  ).length;

  const remaining = Math.max(0, limit - totalRequests);

  if (totalRequests >= limit) {
    return {
      permitted: false,
      remaining,
      resetTime: end,
      limit,
      key,
    };
  }

  return {
    permitted: true,
    remaining,
    resetTime: end,
    limit,
    key,
  };
}