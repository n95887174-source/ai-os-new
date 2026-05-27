export type ConsistencyCheckType = 'file_path' | 'type_name' | 'interface_name' | 'event_name' | 'service_name' | 'method_name';

export interface ConsistencyCheckItem {
  type: ConsistencyCheckType;
  name: string;
  docFile: string;
  lineApprox: number;
  found: boolean;
  matchedTo?: string;
  note?: string;
}

export interface ConsistencyReport {
  timestamp: number;
  total: number;
  passed: number;
  failed: number;
  items: ConsistencyCheckItem[];
  byCategory: Record<string, { total: number; passed: number; failed: number }>;
  summary: string;
}

export interface CodeManifestEntry {
  name: string;
  type: ConsistencyCheckType;
  location: string;
}

export interface CodeManifest {
  version: string;
  generated: number;
  entries: CodeManifestEntry[];
}

export interface IConsistencyChecker {
  checkDocs(docContents: Record<string, string>): ConsistencyReport;
  getManifest(): CodeManifest;
  getLastReport(): ConsistencyReport | null;
}
