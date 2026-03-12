import { Request } from "express";

/**
 * Factory for a key–derivation strategy based on a request header.
 *
 * Common examples are `Authorization`, `X-User-Id`, or `X-Api-Key`.
 * If the header is missing or empty, the fallback `"unknown-user"`
 * is returned to keep the key space well–defined.
 *
 * @param headerName - Name of the header to read (case–insensitive).
 * @returns A function that maps an Express request to a user key.
 */
export function userKey(headerName: string): (req: Request) => string {
  return function inner(req: Request): string {
    const raw = req.headers[headerName];

    if (Array.isArray(raw)) {
      return raw[0] ?? "unknown-user";
    }

    return raw ?? "unknown-user";
  };
}