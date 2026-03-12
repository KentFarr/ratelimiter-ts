import { Request } from "express";

export function ipKey(req: Request): string {
    return req.ip ?? "unknown-ip";
}

