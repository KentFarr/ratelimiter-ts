import {LimitResult} from "../core/result";


export function slidingWindow( 
        timestamps: number[],
        limit: number,
        key: string,
        windowMs: number
    ): LimitResult {
        const now = Date.now();
        const start = now - windowMs;
        const end = timestamps.length > 0 ? timestamps[0] + windowMs : now + windowMs;
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