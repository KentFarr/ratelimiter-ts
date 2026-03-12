export interface LimitResult {
    permitted: boolean; 
    remaining: number; 
    resetTime: number;
    limit: number;
    key: string;
}