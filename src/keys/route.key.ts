import type { HttpRequest } from "../types/https";

/**
 * Key–derivation strategy that uses the HTTP method and path.
 *
 * This is useful when you want per–route limits, e.g. `GET:/api/login`
 * is treated separately from `POST:/api/login`.
 *
 * @param req - Incoming HTTP request.
 * @returns A string of the form `"METHOD:/path"`.
 */
export function routeKey(req: HttpRequest): string {
  return `${req.method}:${req.path}`;
}