import type { HttpRequest } from "../types/https";

/**
 * Key–derivation strategy that uses `req.ip` as the rate–limit key.
 *
 * This is useful for IP–based rate limiting where you want to share
 * limits across all routes for the same client IP.
 *
 * @param req - Incoming HTTP request.
 * @returns The IP address, or `"unknown-ip"` as a defensive fallback.
 */
export function ipKey(req: HttpRequest): string {
  return req.ip ?? "unknown-ip";
}

