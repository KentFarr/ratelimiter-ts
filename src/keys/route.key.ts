import { Request } from "express";

export function routeKey(req: Request): string {
        return `${req.method}:${req.path}`
    }