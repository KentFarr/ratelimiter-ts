import { Request } from "express";

/**
 * Key–derivation strategy that uses `req.ip` as the rate–limit key.
 *
 * This is useful for IP–based rate limiting where you want to share
 * limits across all routes for the same client IP.
 *
 * @param req - Incoming Express request.
 * @returns The IP address, or `"unknown-ip"` as a defensive fallback.
 */
export function ipKey(req: Request): string {
  return req.ip ?? "unknown-ip";
}

