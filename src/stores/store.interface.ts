
export interface StoreInterface {
    get(key: string): Promise<number[]>;
    set(key: string, value: number[]): Promise<void>;
    delete(key: string): Promise<void>;
}