import type {
  HttpRequest,
  HttpResponse,
  NextFunction,
  RequestHandler,
} from "../types/https";
import { Ratelimiter } from "../core/limiter";

/**
 * Small adapter that bridges a `Ratelimiter` instance to an Express‑style
 * middleware function.
 *
 * It uses the minimal `HttpRequest`/`HttpResponse` interfaces defined in
 * `src/types/https.ts`, but is compatible with `express.Request` and
 * `express.Response` when wired up in a Node.js app.
 *
 * If the request is over the limit, it responds with HTTP 429 and a JSON
 * payload; otherwise it calls `next()` to continue the middleware chain.
 */
export function expressAdapter(limiter: Ratelimiter): RequestHandler {
  return async (req: HttpRequest, res: HttpResponse, next: NextFunction) => {
    const result = await limiter.check(req);

    if (!result.permitted) {
      res.status(429).json({ error: "Too Many Requests" });
      return;
    }

    next();
  };
}
