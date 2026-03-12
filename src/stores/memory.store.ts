import { StoreInterface } from "./store.interface";

export class MemoryStore implements StoreInterface {
    private store: Map<string, number[]> = new Map(); 

    async get(key: string): Promise<number[]> {
        return this.store.get(key) || [];
    }

    async set(key: string, value: number[]): Promise<void> {
        this.store.set(key, value);
    }

    async delete(key: string): Promise<void> {
        this.store.delete(key);
    }
}