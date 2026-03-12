/**
 * Tests the Express adapter that plugs the `Ratelimiter` into an
 * Express-style middleware pipeline.
 */
import { describe, it, expect, vi } from "vitest";
import { expressAdapter } from "../src/adapters/express";
import type {
  HttpRequest,
  HttpResponse,
  NextFunction,
} from "../src/types/https";
import { Ratelimiter } from "../src/core/limiter";
import type { LimitResult } from "../src/core/result";

function makeRequest(): HttpRequest {
  return {
    path: "/api",
    method: "GET",
    headers: {},
  };
}

function makeResponse() {
  const res: Partial<HttpResponse> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as HttpResponse;
}

describe("expressAdapter", () => {
  it("calls next when the limiter permits the request", async () => {
    const limiter = new Ratelimiter({} as any);
    const result: LimitResult = {
      permitted: true,
      remaining: 1,
      resetTime: Date.now(),
      limit: 2,
      key: "key",
    };
    vi.spyOn(limiter, "check").mockResolvedValue(result);

    const handler = expressAdapter(limiter);
    const req = makeRequest();
    const res = makeResponse();
    const next: NextFunction = vi.fn();

    await handler(req, res, next);

    expect(limiter.check).toHaveBeenCalledWith(req);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it("responds with 429 when the limiter rejects the request", async () => {
    const limiter = new Ratelimiter({} as any);
    const result: LimitResult = {
      permitted: false,
      remaining: 0,
      resetTime: Date.now(),
      limit: 2,
      key: "key",
    };
    vi.spyOn(limiter, "check").mockResolvedValue(result);

    const handler = expressAdapter(limiter);
    const req = makeRequest();
    const res = makeResponse();
    const next: NextFunction = vi.fn();

    await handler(req, res, next);

    expect(limiter.check).toHaveBeenCalledWith(req);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith({ error: "Too Many Requests" });
    expect(next).not.toHaveBeenCalled();
  });
});
