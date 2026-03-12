/**
 * Tests the helper functions that derive rate-limit keys from HTTP requests
 * (IP address, route, and header-based user identifiers).
 */
import { describe, it, expect } from "vitest";
import { ipKey } from "../src/keys/ip.key";
import { routeKey } from "../src/keys/route.key";
import { userKey } from "../src/keys/user.key";
import type { HttpRequest } from "../src/types/https";

describe("ipKey", () => {
  it("returns the IP when present", () => {
    const req: HttpRequest = {
      ip: "127.0.0.1",
      path: "/",
      method: "GET",
      headers: {},
    };

    expect(ipKey(req)).toBe("127.0.0.1");
  });

  it("falls back to 'unknown-ip' when ip is missing", () => {
    const req: HttpRequest = {
      path: "/",
      method: "GET",
      headers: {},
    };

    expect(ipKey(req)).toBe("unknown-ip");
  });
});

describe("routeKey", () => {
  it("combines method and path", () => {
    const req: HttpRequest = {
      path: "/api/login",
      method: "POST",
      headers: {},
    };

    expect(routeKey(req)).toBe("POST:/api/login");
  });
});

describe("userKey", () => {
  it("reads a string header value", () => {
    const keyFromAuth = userKey("authorization");
    const req: HttpRequest = {
      path: "/",
      method: "GET",
      headers: { authorization: "token-123" },
    };

    expect(keyFromAuth(req)).toBe("token-123");
  });

  it("reads the first value from an array header", () => {
    const keyFromAuth = userKey("x-user-id");
    const req: HttpRequest = {
      path: "/",
      method: "GET",
      headers: { "x-user-id": ["user-1", "user-2"] },
    };

    expect(keyFromAuth(req)).toBe("user-1");
  });

  it("falls back to 'unknown-user' when header is missing", () => {
    const keyFromAuth = userKey("authorization");
    const req: HttpRequest = {
      path: "/",
      method: "GET",
      headers: {},
    };

    expect(keyFromAuth(req)).toBe("unknown-user");
  });

  it("falls back to 'unknown-user' when header array is empty", () => {
    const keyFromAuth = userKey("authorization");
    const req: HttpRequest = {
      path: "/",
      method: "GET",
      headers: { authorization: [] },
    };

    expect(keyFromAuth(req)).toBe("unknown-user");
  });
});
