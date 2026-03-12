import {LimitResult} from "../core/result";


export function fixedWindow( 
        timestamps: number[],
        limit: number,
        key: string,
        windowMs: number
    ): LimitResult {
        const now = Date.now();
        const start = Math.floor(now / windowMs) * windowMs;
        const end = start + windowMs;
        const totalRequests = timestamps.filter(timestamp => timestamp >= start && timestamp < end).length;
        const remaining = Math.max(0, limit - totalRequests);
        if (totalRequests >= limit) {
            return {
                permitted: false,
                remaining: remaining,
                resetTime: end,
                limit: limit,
                key: key,
            }
        }
        return {
            permitted: true,
            remaining: remaining,
            resetTime: end,
            limit: limit,
            key: key,
        }
    }