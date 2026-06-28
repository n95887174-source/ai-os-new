export interface KvRepository {
  get<T>(id: string): Promise<T | null>;
  set<T>(id: string, value: T): Promise<void>;
  delete(id: string): Promise<void>;
  list(prefix?: string): Promise<Array<{ id: string; value: unknown }>>;
  clear(): Promise<void>;
}
