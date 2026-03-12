import { Request } from "express";

export function userKey(headerName: string): (req: Request) => string {
        return function inner(req: Request): string {
            const raw = req.headers[headerName];
            if (Array.isArray(raw)) {
                return raw[0] ?? "unknown-user";
            }
            return raw ?? "unknown-user";
        }
}

