/**
 * Minimal HTTP request shape used by this library.
 *
 * This intentionally mirrors the subset of `express.Request` that the
 * rate‑limiter needs so that the core logic stays framework‑agnostic.
 */
export interface HttpRequest {
  /**
   * IP address of the caller, if available.
   */
  ip?: string;

  /**
   * Normalised request path (e.g. `"/api/login"`).
   */
  path: string;

  /**
   * HTTP method (e.g. `"GET"`, `"POST"`).
   */
  method: string;

  /**
   * Request headers.
   */
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Minimal HTTP response surface required by the Express adapter.
 */
export interface HttpResponse {
  status(code: number): this;
  json(body: unknown): this;
}

/**
 * Continuation function in middleware‑style handlers.
 */
export type NextFunction = () => void;

/**
 * Generic request handler compatible with the minimal HTTP types.
 */
export type RequestHandler = (
  req: HttpRequest,
  res: HttpResponse,
  next: NextFunction
) => void | Promise<void>;