import { Request } from "express";

/**
 * Key–derivation strategy that uses the HTTP method and path.
 *
 * This is useful when you want per–route limits, e.g. `GET:/api/login`
 * is treated separately from `POST:/api/login`.
 *
 * @param req - Incoming Express request.
 * @returns A string of the form `"METHOD:/path"`.
 */
export function routeKey(req: Request): string {
  return `${req.method}:${req.path}`;
}