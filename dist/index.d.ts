import { EventEmitter } from 'events';

/**
 * Result of evaluating a rate–limit decision.
 */
interface LimitResult {
    /**
     * Whether the current request is allowed to proceed.
     */
    permitted: boolean;
    /**
     * How many requests are still allowed in the current window.
     */
    remaining: number;
    /**
     * Epoch time in milliseconds at which the current window resets
     * and the caller can expect the counter to be refreshed.
     */
    resetTime: number;
    /**
     * The configured maximum number of requests for this key and window.
     */
    limit: number;
    /**
     * Logical identifier that was limited (IP, user ID, route, etc.).
     */
    key: string;
}

/**
 * Abstract contract for a timestamp store used by the rate limiter.
 *
 * Implementations can be in–memory, Redis, a database, or any other
 * backend that can persist an ordered list of request timestamps.
 */
interface StoreInterface {
    /**
     * Returns all known timestamps (epoch ms) associated with the key.
     */
    get(key: string): Promise<number[]>;
    /**
     * Persists the full list of timestamps for the given key.
     */
    set(key: string, value: number[]): Promise<void>;
    /**
     * Deletes all timestamps and metadata associated with the key.
     */
    delete(key: string): Promise<void>;
}

/**
 * Simple in–memory implementation of {@link StoreInterface}.
 *
 * This is suitable for demos, tests, or single–process applications.
 * For distributed deployments you should implement a shared store
 * (e.g. Redis) that satisfies the same interface.
 */
declare class MemoryStore implements StoreInterface {
    private readonly store;
    get(key: string): Promise<number[]>;
    set(key: string, value: number[]): Promise<void>;
    delete(key: string): Promise<void>;
}

/**
 * Evaluates a fixed–window rate limit.
 *
 * The current time is snapped to a discrete window of size `windowMs`
 * and all `timestamps` that fall inside the current window are counted.
 *
 * @param timestamps - Historical request timestamps for this key (epoch ms).
 * @param limit - Maximum number of requests allowed per window.
 * @param key - Logical identifier being limited (IP, user ID, route, etc.).
 * @param windowMs - Size of the fixed window in milliseconds.
 * @returns A {@link LimitResult} describing whether the request is permitted
 *          and when the current window will reset.
 */
declare function fixedWindow(timestamps: number[], limit: number, key: string, windowMs: number): LimitResult;

/**
 * Evaluates a sliding–window rate limit.
 *
 * The window is defined as `(now - windowMs, now]`. All `timestamps` that fall
 * into this interval are counted to determine whether the current request
 * should be permitted.
 *
 * @param timestamps - Historical request timestamps for this key (epoch ms).
 * @param limit - Maximum number of requests allowed in the sliding window.
 * @param key - Logical identifier being limited (IP, user ID, route, etc.).
 * @param windowMs - Size of the sliding window in milliseconds.
 * @returns A {@link LimitResult} describing whether the request is permitted
 *          and when the current window will reset.
 */
declare function slidingWindow(timestamps: number[], limit: number, key: string, windowMs: number): LimitResult;

interface HttpRequest {
    ip?: string;
    path: string;
    method: string;
    headers: Record<string, string | string[] | undefined>;
}
interface HttpResponse {
    status(code: number): this;
    json(body: unknown): this;
}
type NextFunction = () => void;
type RequestHandler = (req: HttpRequest, res: HttpResponse, next: NextFunction) => void | Promise<void>;

/**
 * Key–derivation strategy that uses `req.ip` as the rate–limit key.
 *
 * This is useful for IP–based rate limiting where you want to share
 * limits across all routes for the same client IP.
 *
 * @param req - Incoming HTTP request.
 * @returns The IP address, or `"unknown-ip"` as a defensive fallback.
 */
declare function ipKey(req: HttpRequest): string;

/**
 * Key–derivation strategy that uses the HTTP method and path.
 *
 * This is useful when you want per–route limits, e.g. `GET:/api/login`
 * is treated separately from `POST:/api/login`.
 *
 * @param req - Incoming HTTP request.
 * @returns A string of the form `"METHOD:/path"`.
 */
declare function routeKey(req: HttpRequest): string;

/**
 * Factory for a key–derivation strategy based on a request header.
 *
 * Common examples are `Authorization`, `X-User-Id`, or `X-Api-Key`.
 * If the header is missing or empty, the fallback `"unknown-user"`
 * is returned to keep the key space well–defined.
 *
 * @param headerName - Name of the header to read (case–insensitive).
 * @returns A function that maps an HTTP request to a user key.
 */
declare function userKey(headerName: string): (req: HttpRequest) => string;

interface RateLimitEvent {
    key: string;
    route: string;
    limit: number;
    remaining: number;
    resetTime: number;
    percentUsed: number;
}
declare class RateLimitEventEmitter extends EventEmitter {
    emitLimitReached(event: RateLimitEvent): void;
    emitLimitWarning(event: RateLimitEvent): void;
    emitRequestChecked(event: RateLimitEvent): void;
}

interface RatelimiterConfig {
    algorithm: (timestamps: number[], limit: number, key: string, windowMs: number) => LimitResult;
    key: (req: HttpRequest) => string;
    limit: number;
    windowMs: number;
    store: StoreInterface;
}
declare class Ratelimiter extends RateLimitEventEmitter {
    private config;
    constructor(config: RatelimiterConfig);
    check(req: HttpRequest): Promise<LimitResult>;
}

declare function expressAdapter(limiter: Ratelimiter): RequestHandler;

export { type LimitResult, MemoryStore, Ratelimiter, type RatelimiterConfig, type StoreInterface, expressAdapter, fixedWindow, ipKey, routeKey, slidingWindow, userKey };
