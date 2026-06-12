import { genId } from '../../utils/gen-id';
import type { ConfigRegistry } from '../contracts/config-registry';
import { CONFIG, replaceConfig } from './config-registry';

export interface ConfigVersion {
  id: string;
  version: string;
  timestamp: number;
  author: string;
  comment: string;
  configSnapshot: ConfigRegistry;
}

export interface ConfigDiffItem {
  path: string;
  oldValue?: unknown;
  newValue?: unknown;
  value?: unknown;
}

export interface ConfigDiff {
  added: ConfigDiffItem[];
  updated: ConfigDiffItem[];
  deleted: ConfigDiffItem[];
}

export class ConfigHistoryService {
  private history: ConfigVersion[] = [];
  private currentVersionSeq = 1;

  constructor() {
    // Commit initial seed configuration version
    this.commit(CONFIG, 'System', 'Initial configuration seed (v1.0.0)');
  }

  commit(config: ConfigRegistry, author: string, comment: string): ConfigVersion {
    // Clone config deeply to preserve immutability
    const snapshot = JSON.parse(JSON.stringify(config));
    const versionString = `1.0.${this.currentVersionSeq++}`;
    const newVersion: ConfigVersion = {
      id: genId('cfg'),
      version: versionString,
      timestamp: Date.now(),
      author,
      comment,
      configSnapshot: snapshot,
    };
    this.history.push(newVersion);
    return newVersion;
  }

  getHistory(): ConfigVersion[] {
    return [...this.history];
  }

  getVersion(id: string): ConfigVersion | undefined {
    return this.history.find(v => v.id === id);
  }

  async rollback(versionId: string, author = 'System'): Promise<ConfigRegistry> {
    const target = this.getVersion(versionId);
    if (!target) {
      throw new Error(`Rollback failed: Config version "${versionId}" not found.`);
    }

    // Replace live config in place to propagate changes immediately
    const nextConfig = JSON.parse(JSON.stringify(target.configSnapshot));
    replaceConfig(nextConfig);

    this.commit(CONFIG, author, `Rollback to version ${target.version} (${target.comment})`);
    return CONFIG;
  }

  diff(versionIdA: string, versionIdB: string): ConfigDiff {
    const verA = this.getVersion(versionIdA);
    const verB = this.getVersion(versionIdB);

    if (!verA || !verB) {
      throw new Error(`Diff failed: One or both config versions ("${versionIdA}", "${versionIdB}") not found.`);
    }

    return this.deepDiff(verA.configSnapshot, verB.configSnapshot);
  }

  private deepDiff(objA: any, objB: any, prefix = ''): ConfigDiff {
    const added: ConfigDiffItem[] = [];
    const updated: ConfigDiffItem[] = [];
    const deleted: ConfigDiffItem[] = [];

    const keysA = Object.keys(objA || {});
    const keysB = Object.keys(objB || {});
    const allKeys = new Set([...keysA, ...keysB]);

    for (const key of allKeys) {
      const path = prefix ? `${prefix}.${key}` : key;
      const hasA = keysA.includes(key);
      const hasB = keysB.includes(key);

      if (hasA && !hasB) {
        deleted.push({ path, value: objA[key] });
      } else if (!hasA && hasB) {
        added.push({ path, value: objB[key] });
      } else {
        const valA = objA[key];
        const valB = objB[key];

        if (valA !== valB) {
          if (
            typeof valA === 'object' &&
            typeof valB === 'object' &&
            valA !== null &&
            valB !== null &&
            !Array.isArray(valA) &&
            !Array.isArray(valB)
          ) {
            const nested = this.deepDiff(valA, valB, path);
            added.push(...nested.added);
            updated.push(...nested.updated);
            deleted.push(...nested.deleted);
          } else {
            updated.push({ path, oldValue: valA, newValue: valB });
          }
        }
      }
    }

    return { added, updated, deleted };
  }
}
