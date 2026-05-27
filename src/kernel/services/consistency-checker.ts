import type { IConsistencyChecker, ConsistencyCheckItem, ConsistencyReport, CodeManifest } from '../contracts/consistency-checker';
import { BUILTIN_MANIFEST } from './code-manifest';

const FILE_PATH_RE = /src\/[\w./-]+\.(ts|tsx|md)/g;
const PASCAL_CASE_RE = /\b[A-Z][a-zA-Z0-9]+\b/g;
const COLON_EVENT_RE = /\b[a-z]+(?::[a-z]+)+\b/g;
const METHOD_CALL_RE = /\b[a-z][a-zA-Z0-9]+(?=\s*\()/g;

function extractFilePaths(content: string, docFile: string): Omit<ConsistencyCheckItem, 'found' | 'matchedTo' | 'note'>[] {
  const matches = [...content.matchAll(FILE_PATH_RE)];
  const seen = new Set<string>();
  return matches
    .map(m => m[0])
    .filter(f => {
      if (seen.has(f)) return false;
      seen.add(f);
      return true;
    })
    .map(name => {
      const lineApprox = getLineNumber(content, name);
      return { type: 'file_path' as const, name, docFile, lineApprox };
    });
}

function extractTypeNames(content: string, docFile: string): Omit<ConsistencyCheckItem, 'found' | 'matchedTo' | 'note'>[] {
  const matches = [...content.matchAll(PASCAL_CASE_RE)];
  const seen = new Set<string>();
  const skip = new Set(['SuperAgents', 'README', 'System', 'React', 'TypeScript', 'JavaScript', 'Node', 'HTML', 'CSS', 'JSON', 'Zod', 'DAG', 'UUID', 'OS', 'DI', 'LLM', 'UI', 'API', 'DB', 'URL', 'JSDoc', 'SLA', 'TTL', 'EMA', 'AST', 'ORM', 'SQL', 'DOM', 'SRE', 'P0', 'P1', 'P2', 'P3', 'v4', 'DOC', 'A', 'B', 'N', 'M', 'File', 'Create', 'Read', 'Write', 'Edit', 'LIFO', 'Vite', 'Map', 'Set', 'Promise', 'Date', 'Error', 'Array', 'Record', 'String', 'Number', 'Boolean', 'Object', 'Partial', 'Pick', 'Omit', 'Exclude', 'Extract', 'ReturnType', 'Parameters', 'ConstructorParameters', 'InstanceType', 'ThisType', 'NonNullable', 'ThisParameterType', 'OmitThisParameter']);
  return matches
    .map(m => m[0])
    .filter(n => {
      if (skip.has(n)) return false;
      if (seen.has(n)) return false;
      if (n.startsWith('I') && n.length > 1 && n[1] === n[1].toUpperCase()) return true; // interface
      if (n.endsWith('Service') || n.endsWith('Engine') || n.endsWith('Metrics') || n.endsWith('Metric') || n.endsWith('Graph') || n.endsWith('Report')) return true;
      if (n.endsWith('Result') || n.endsWith('State') || n.endsWith('Edge') || n.endsWith('Config') || n.endsWith('Phase')) return true;
      if (n.endsWith('Score') || n.endsWith('Impact') || n.endsWith('Point') || n.endsWith('Changer') || n.endsWith('Correlation')) return true;
      if (n.endsWith('Limit') || n.endsWith('Snapshot') || n.endsWith('Topology') || n.endsWith('Claim') || n.endsWith('Entry')) return true;
      if (n.endsWith('Node') || n.endsWith('Edge') || n.endsWith('Tree') || n.endsWith('Level') || n.endsWith('Tier')) return true;
      return false;
    })
    .filter(n => {
      seen.add(n);
      return true;
    })
    .map(name => {
      const lineApprox = getLineNumber(content, name);
      return { type: 'type_name' as const, name, docFile, lineApprox };
    });
}

function extractEventNames(content: string, docFile: string): Omit<ConsistencyCheckItem, 'found' | 'matchedTo' | 'note'>[] {
  const matches = [...content.matchAll(COLON_EVENT_RE)];
  const seen = new Set<string>();
  return matches
    .map(m => m[0])
    .filter(e => e.includes(':') && e.split(':').length >= 2 && !e.startsWith('http'))
    .filter(e => {
      if (seen.has(e)) return false;
      seen.add(e);
      return true;
    })
    .map(name => {
      const lineApprox = getLineNumber(content, name);
      return { type: 'event_name' as const, name, docFile, lineApprox };
    });
}

function getLineNumber(content: string, substr: string): number {
  const idx = content.indexOf(substr);
  if (idx === -1) return 0;
  return content.substring(0, idx).split('\n').length;
}

function normalizeFilePath(name: string, manifest: CodeManifest): string | null {
  const fixed = name.startsWith('/') ? name.slice(1) : name;
  const match = manifest.entries.find(e => e.type === 'file_path' && (e.name === fixed || e.name === name));
  return match ? match.name : null;
}

function findInManifest(name: string, type: 'type_name' | 'interface_name' | 'event_name' | 'service_name' | 'method_name', manifest: CodeManifest): CodeManifestEntry | undefined {
  return manifest.entries.find(e => e.type === type && e.name === name);
}

const PHRASE_MAP: Record<string, string> = {
  'debate-service.ts': 'src/kernel/services/debate-service.ts',
  'debate-interpreter.ts': 'src/kernel/services/debate-interpreter.ts',
  'debate-governor/': 'src/kernel/services/debate-governor/',
  'debate-governor/types.ts': 'src/kernel/services/debate-governor/types.ts',
  'container.ts': 'src/kernel/container.ts',
  'bootstrap.ts': 'src/kernel/bootstrap.ts',
  'kernel.ts': 'src/kernel/kernel.ts',
  'instances.ts': 'src/kernel/instances.ts',
  'service-registration.ts': 'src/kernel/service-registration.ts',
  'topology-defaults.ts': 'src/kernel/state/topology-defaults.ts',
  'event-names.ts': 'src/kernel/events/event-names.ts',
};

export class ConsistencyChecker implements IConsistencyChecker {
  private lastReport: ConsistencyReport | null = null;
  private manifest: CodeManifest;

  constructor(manifest?: CodeManifest) {
    this.manifest = manifest ?? BUILTIN_MANIFEST;
  }

  getManifest(): CodeManifest {
    return this.manifest;
  }

  getLastReport(): ConsistencyReport | null {
    return this.lastReport;
  }

  checkDocs(docContents: Record<string, string>): ConsistencyReport {
    const items: ConsistencyCheckItem[] = [];

    for (const [docFile, content] of Object.entries(docContents)) {
      const shortName = docFile.split('/').pop() ?? docFile;

      // Extract and check file paths
      const fileRefs = extractFilePaths(content, shortName);
      for (const ref of fileRefs) {
        const normalized = normalizeFilePath(ref.name, this.manifest);
        const phraseMatch = Object.entries(PHRASE_MAP).find(([phrase]) => ref.name.includes(phrase));
        if (normalized) {
          items.push({ ...ref, found: true, matchedTo: normalized });
        } else if (phraseMatch) {
          items.push({ ...ref, found: true, matchedTo: phraseMatch[1], note: 'matched via phrase map' });
        } else {
          items.push({ ...ref, found: false, note: 'file not in manifest' });
        }
      }

      // Extract and check type names
      const typeRefs = extractTypeNames(content, shortName);
      for (const ref of typeRefs) {
        if (ref.name.startsWith('I') && ref.name[1] === ref.name[1].toUpperCase()) {
          // Interface name
          const match = findInManifest(ref.name, 'interface_name', this.manifest);
          items.push({ ...ref, type: 'interface_name', found: !!match, matchedTo: match?.location });
        } else {
          // Type or service name
          const typeMatch = findInManifest(ref.name, 'type_name', this.manifest);
          const svcMatch = !typeMatch ? findInManifest(ref.name, 'service_name', this.manifest) : undefined;
          if (typeMatch) {
            items.push({ ...ref, found: true, matchedTo: typeMatch.location });
          } else if (svcMatch) {
            items.push({ ...ref, type: 'service_name', found: true, matchedTo: svcMatch.location });
          } else {
            items.push({ ...ref, found: false });
          }
        }
      }

      // Extract and check event names
      const eventRefs = extractEventNames(content, shortName);
      for (const ref of eventRefs) {
        const match = findInManifest(ref.name, 'event_name', this.manifest);
        items.push({ ...ref, found: !!match, matchedTo: match?.location });
      }
    }

    const passed = items.filter(i => i.found).length;
    const failed = items.filter(i => !i.found).length;

    const byCategory: Record<string, { total: number; passed: number; failed: number }> = {};
    for (const item of items) {
      if (!byCategory[item.type]) {
        byCategory[item.type] = { total: 0, passed: 0, failed: 0 };
      }
      byCategory[item.type].total++;
      if (item.found) {
        byCategory[item.type].passed++;
      } else {
        byCategory[item.type].failed++;
      }
    }

    let summary: string;
    if (failed === 0) {
      summary = `All ${passed} references verified — docs match code manifest.`;
    } else if (failed < 5) {
      summary = `${failed} of ${items.length} references unresolved (${Math.round((passed / items.length) * 100)}% match). Minor drift detected.`;
    } else if (failed < 20) {
      summary = `${failed} of ${items.length} references unresolved (${Math.round((passed / items.length) * 100)}% match). Moderate drift — review flagged items.`;
    } else {
      summary = `${failed} of ${items.length} references unresolved (${Math.round((passed / items.length) * 100)}% match). Significant drift — documentation needs update.`;
    }

    const report: ConsistencyReport = {
      timestamp: Date.now(),
      total: items.length,
      passed,
      failed,
      items,
      byCategory,
      summary,
    };

    this.lastReport = report;
    return report;
  }
}
