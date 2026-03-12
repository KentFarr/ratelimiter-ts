import { LimitResult } from "../core/result";

/**
 * Evaluates a fixed–window rate limit.
 *
 * The current time is snapped to a discrete window of size `windowMs`
 * and all `timestamps` that fall inside the current window are counted.
 *
 * @param timestamps - Historical request timestamps for this key (epoch ms).
 * @param limit - Maximum number of requests allowed per window.
 * @param key - Logical identifier being limited (IP, user ID, route, etc.).
 * @param windowMs - Size of the fixed window in milliseconds.
 * @returns A {@link LimitResult} describing whether the request is permitted
 *          and when the current window will reset.
 */
export function fixedWindow(
  timestamps: number[],
  limit: number,
  key: string,
  windowMs: number
): LimitResult {
  const now = Date.now();
  const start = Math.floor(now / windowMs) * windowMs;
  const end = start + windowMs;

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