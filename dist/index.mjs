// src/stores/memory.store.ts
var MemoryStore = class {
  store = /* @__PURE__ */ new Map();
  async get(key) {
    return this.store.get(key) || [];
  }
  async set(key, value) {
    this.store.set(key, value);
  }
  async delete(key) {
    this.store.delete(key);
  }
};

// src/algorithms/fixed-window.ts
function fixedWindow(timestamps, limit, key, windowMs) {
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
      key
    };
  }
  return {
    permitted: true,
    remaining,
    resetTime: end,
    limit,
    key
  };
}

// src/algorithms/sliding-window.ts
function slidingWindow(timestamps, limit, key, windowMs) {
  const now = Date.now();
  const start = now - windowMs;
  const end = timestamps.length > 0 ? timestamps[0] + windowMs : now + windowMs;
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
      key
    };
  }
  return {
    permitted: true,
    remaining,
    resetTime: end,
    limit,
    key
  };
}

// src/keys/ip.key.ts
function ipKey(req) {
  return req.ip ?? "unknown-ip";
}

// src/keys/route.key.ts
function routeKey(req) {
  return `${req.method}:${req.path}`;
}

// src/keys/user.key.ts
function userKey(headerName) {
  return function inner(req) {
    const raw = req.headers[headerName];
    if (Array.isArray(raw)) {
      return raw[0] ?? "unknown-user";
    }
    return raw ?? "unknown-user";
  };
}

// src/events/emitter.ts
import { EventEmitter } from "events";
var RateLimitEventEmitter = class extends EventEmitter {
  emitLimitReached(event) {
    this.emit("limit:reached", event);
  }
  emitLimitWarning(event) {
    this.emit("limit:warning", event);
  }
  emitRequestChecked(event) {
    this.emit("request:checked", event);
  }
};

// src/core/limiter.ts
var Ratelimiter = class extends RateLimitEventEmitter {
  constructor(config) {
    super();
    this.config = config;
  }
  async check(req) {
    const key = this.config.key(req);
    const timestamps = await this.config.store.get(key);
    const result = this.config.algorithm(timestamps, this.config.limit, key, this.config.windowMs);
    const percentUsed = (this.config.limit - result.remaining) / this.config.limit * 100;
    const event = {
      key: result.key,
      route: req.path,
      limit: result.limit,
      remaining: result.remaining,
      resetTime: result.resetTime,
      percentUsed
    };
    if (result.permitted) {
      await this.config.store.set(key, [...timestamps, Date.now()]);
    }
    if (!result.permitted) {
      this.emitLimitReached(event);
    }
    if (percentUsed > 80) {
      this.emitLimitWarning(event);
    }
    this.emitRequestChecked(event);
    return result;
  }
};

// src/adapters/express.ts
function expressAdapter(limiter) {
  return async (req, res, next) => {
    const result = await limiter.check(req);
    if (!result.permitted) {
      res.status(429).json({ error: "Too Many Requests" });
      return;
    }
    next();
  };
}
export {
  MemoryStore,
  Ratelimiter,
  expressAdapter,
  fixedWindow,
  ipKey,
  routeKey,
  slidingWindow,
  userKey
};
