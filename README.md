## ratelimiter-ts

`ratelimiter-ts` is a small, framework‑agnostic set of **TypeScript primitives for building rate limiters**.

Instead of being a single hard‑coded middleware, this library gives you the **building blocks**:

- **Algorithms**: fixed‑window and sliding‑window counters.
- **Storage abstraction**: a pluggable `StoreInterface` you can back with memory, Redis, a DB, etc.
- **Key helpers**: helpers for deriving rate‑limit keys from Express `Request` objects (IP, route, or header‑based “user” keys).

You combine these primitives to implement rate limiting that fits your application and infrastructure.

---

### Installation

```bash
npm install ratelimiter-ts
```

This package targets modern Node.js with TypeScript support. It also ships type definitions out of the box.

> Note: In this repo the build pipeline (e.g. `tsup` configuration) is not yet wired up. The examples below assume you either
> compile the source yourself or consume it from TypeScript directly.

---

### Core Concepts

#### 1. LimitResult

All algorithms return a common shape:

```ts
import type { LimitResult } from "ratelimiter-ts";
```

- **`permitted`**: `true` if the request should be allowed, `false` if it is over the limit.
- **`remaining`**: how many requests remain in the current window.
- **`resetTime`**: epoch time (ms) when the window resets and the caller can expect a fresh allowance.
- **`limit`**: the configured maximum requests per window.
- **`key`**: the logical identifier being limited (IP, user ID, route, etc.).

This result is designed to map cleanly to HTTP rate‑limit headers such as
`Retry-After`, `RateLimit-Remaining`, `RateLimit-Reset`, etc.

#### 2. StoreInterface

The store abstraction defines **how request history is persisted**:

```ts
import type { StoreInterface } from "ratelimiter-ts";
```

```ts
interface StoreInterface {
  get(key: string): Promise<number[]>;
  set(key: string, value: number[]): Promise<void>;
  delete(key: string): Promise<void>;
}
```

- `get` should return a list of **timestamps in milliseconds** for the given key.
- `set` stores the **full list** of timestamps for that key.
- `delete` removes all history for the key.

The repo ships with `MemoryStore`, an in‑memory implementation:

```ts
import { MemoryStore } from "ratelimiter-ts";

const store = new MemoryStore();
```

For real deployments, you can create your own implementation backed by Redis, a database table, or any other shared backend by implementing `StoreInterface`.

#### 3. Algorithms

The project currently implements two classic algorithms.

##### fixedWindow

File: `src/algorithms/fixed-window.ts`

```ts
import { fixedWindow } from "ratelimiter-ts";
```

- **Idea**: Time is divided into discrete windows of size `windowMs`. All
  requests in the **current bucket** contribute to the count.
- **Pros**: Simple, fast, low overhead.
- **Cons**: Can allow bursty traffic at window boundaries (classic fixed‑window weakness).

Signature:

```ts
function fixedWindow(
  timestamps: number[],
  limit: number,
  key: string,
  windowMs: number
): LimitResult;
```

- `timestamps`: all prior request timestamps for this key.
- `limit`: max allowed per window.
- `key`: identifier being limited, echoed back in the result.
- `windowMs`: window size in milliseconds.

##### slidingWindow

File: `src/algorithms/sliding-window.ts`

```ts
import { slidingWindow } from "ratelimiter-ts";
```

- **Idea**: Use a **moving window** `(now - windowMs, now]` instead of rigid buckets.
- **Pros**: Smoother limits, less boundary burstiness compared to fixed‑window.
- **Cons**: Slightly more computational work than a strict bucket counter.

Signature:

```ts
function slidingWindow(
  timestamps: number[],
  limit: number,
  key: string,
  windowMs: number
): LimitResult;
```

Semantics are analogous to `fixedWindow`, but the window is computed dynamically
relative to `now`.

#### 4. Key helpers

To make it easy to define **what you are limiting**, there are small helpers for Express:

```ts
import { ipKey, routeKey, userKey } from "ratelimiter-ts";
``>

- **`ipKey(req)`** → returns the IP from `req.ip` (fallback `"unknown-ip"`).
- **`routeKey(req)`** → returns `"METHOD:/path"` for the current route.
- **`userKey(headerName)`** → returns a function that reads `req.headers[headerName]`
  (e.g. `"Authorization"` or `"X-User-Id"`) and falls back to `"unknown-user"`.

You can freely compose these or write your own functions to derive keys that make sense for your domain.

---

### Putting it together: Express example

The library does **not** ship a pre‑built Express middleware yet, but you can
build one easily using the primitives.

Below is a full example using a sliding‑window limit per user (from a header)
with an in‑memory store.

```ts
import express, { Request, Response, NextFunction } from "express";
import {
  MemoryStore,
  slidingWindow,
  userKey,
  type LimitResult,
} from "ratelimiter-ts";

const app = express();
const store = new MemoryStore();

// Build a user key function based on an Authorization header.
const getUserKey = userKey("authorization");

const WINDOW_MS = 60_000; // 1 minute
const LIMIT = 100; // 100 requests per minute per user

async function rateLimiter(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const key = getUserKey(req);

  // Load history for this key
  const timestamps = await store.get(key);
  const now = Date.now();

  // Drop old timestamps outside the sliding window, to keep the list small
  const recent = timestamps.filter((t) => t > now - WINDOW_MS);

  // Evaluate current request
  const result: LimitResult = slidingWindow(recent, LIMIT, key, WINDOW_MS);

  // Persist updated history when the request is allowed
  if (result.permitted) {
    recent.unshift(now);
    await store.set(key, recent);
  }

  // Optionally set rate‑limit headers
  res.setHeader("X-RateLimit-Limit", result.limit.toString());
  res.setHeader("X-RateLimit-Remaining", result.remaining.toString());
  res.setHeader("X-RateLimit-Reset", result.resetTime.toString());

  if (!result.permitted) {
    // Optional: HTTP 429 with retry information
    const retryAfterSeconds = Math.max(
      0,
      Math.ceil((result.resetTime - now) / 1000)
    );
    res.setHeader("Retry-After", retryAfterSeconds.toString());
    return res.status(429).json({
      error: "Too Many Requests",
      key: result.key,
      limit: result.limit,
      resetTime: result.resetTime,
    });
  }

  return next();
}

app.use(rateLimiter);

app.get("/hello", (_req, res) => {
  res.json({ message: "Hello, world!" });
});

app.listen(3000, () => {
  console.log("Server listening on http://localhost:3000");
});
```

This is intentionally straightforward and explicit so you can tailor it to:

- Use `fixedWindow` instead of `slidingWindow`.
- Limit per IP (`ipKey`) or per route (`routeKey`) instead of per user.
- Swap `MemoryStore` for a Redis‑backed implementation.

---

### Implementing a custom store (e.g. Redis)

To make the limiter work across many processes or servers, implement `StoreInterface` on top of a shared system like Redis.

Example sketch (not production‑ready, but outlines the idea):

```ts
import type { StoreInterface } from "ratelimiter-ts";
import { createClient, type RedisClientType } from "redis";

export class RedisStore implements StoreInterface {
  constructor(private readonly client: RedisClientType) {}

  async get(key: string): Promise<number[]> {
    const raw = await this.client.lRange(key, 0, -1);
    return raw.map((v) => Number(v)).filter((n) => !Number.isNaN(n));
  }

  async set(key: string, value: number[]): Promise<void> {
    const pipeline = this.client.multi();
    pipeline.del(key);
    if (value.length > 0) {
      pipeline.rPush(
        key,
        value.map((v) => v.toString())
      );
    }
    await pipeline.exec();
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }
}
```

You can then drop `RedisStore` into exactly the same middleware shape as the `MemoryStore` example.

---

### API Reference

#### Algorithms

- **`fixedWindow(timestamps, limit, key, windowMs): LimitResult`**
  - Fixed‑bucket rate limiting.
  - Uses discrete windows sized by `windowMs` based on the current time.
  - Best for simple “N requests per minute/second” where slight burstiness is acceptable.

- **`slidingWindow(timestamps, limit, key, windowMs): LimitResult`**
  - Sliding‑window rate limiting.
  - Counts requests in the continuous interval `(now - windowMs, now]`.
  - Provides smoother enforcement across boundaries.

#### Types

- **`LimitResult`**
  - `permitted: boolean`
  - `remaining: number`
  - `resetTime: number`
  - `limit: number`
  - `key: string`

- **`StoreInterface`**
  - `get(key: string): Promise<number[]>`
  - `set(key: string, value: number[]): Promise<void>`
  - `delete(key: string): Promise<void>`

#### Stores

- **`MemoryStore`**
  - In‑memory `Map<string, number[]>` implementation of `StoreInterface`.
  - Suitable for development, tests, or single‑process apps.
  - Not suitable for horizontally scaled or multi‑instance production deployments.

#### Key Helpers (Express)

- **`ipKey(req: Request): string`**
  - Returns `req.ip` or `"unknown-ip"`.
  - Good for IP‑based limits.

- **`routeKey(req: Request): string`**
  - Returns `"METHOD:/path"` (e.g. `"POST:/api/login"`).
  - Good for per‑route limits.

- **`userKey(headerName: string): (req: Request) => string`**
  - Produces a function that reads a specific header from the request.
  - Returns its string value or `"unknown-user"`.
  - Good for API key, user ID, or authorization‑token based limits.

---

### Project Layout

- `src/core/result.ts` – shared `LimitResult` type.
- `src/stores/store.interface.ts` – abstract storage contract.
- `src/stores/memory.store.ts` – in‑memory implementation of the store.
- `src/algorithms/fixed-window.ts` – fixed‑window rate‑limiting logic.
- `src/algorithms/sliding-window.ts` – sliding‑window rate‑limiting logic.
- `src/keys/ip.key.ts` – IP‑based key helper.
- `src/keys/route.key.ts` – route‑based key helper.
- `src/keys/user.key.ts` – header‑based user key helper.
- `src/index.ts` – package entry point re‑exporting the public API.

---

### Roadmap / Ideas

- Provide ready‑made middleware for:
  - Express (`express-rate-limiter` style).
  - Other popular Node frameworks (Fastify, Koa).
- Add additional algorithms:
  - Token bucket / leaky bucket.
  - Generic sliding log with efficient pruning.
- Provide first‑party stores:
  - Redis.
  - In‑memory LRU with TTLs.
- Improve TypeScript ergonomics:
  - Config objects instead of positional arguments.
  - Helper builders (easier composition of key+store+algorithm).

Contributions and feedback are welcome!

