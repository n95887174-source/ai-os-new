export interface Skill {
  id: string;
  name: string;
  description?: string;
  category?: string;
  status?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface SkillsStore {
  loadAll(): Promise<Skill[]>;
  saveAll(skills: Skill[]): Promise<void>;
  count(): Promise<number>;
  clear(): Promise<void>;
  exportAll(): Promise<string>;
  importAll(payload: string): Promise<void>;
}
