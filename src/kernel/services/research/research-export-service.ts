/**
 * Research Export Service
 * Export research findings in multiple formats
 */

import { rootLogger } from '../logger-service';
import { StorageAdapter } from '../storage-adapter';

const LOGGER = rootLogger.child('ResearchExport');

export interface ResearchProject {
  id: string;
  title: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  hypotheses: Hypothesis[];
  experiments: Experiment[];
  findings: Finding[];
  status: 'active' | 'completed' | 'archived';
  metadata: Record<string, string>;
}

export interface Hypothesis {
  id: string;
  title: string;
  description: string;
  confidence: number; // 0-1
  evidence: string[];
  createdAt: number;
  status: 'pending' | 'testing' | 'confirmed' | 'rejected';
}

export interface Experiment {
  id: string;
  title: string;
  hypothesisId: string;
  methodology: string;
  variables: { name: string; type: 'independent' | 'dependent' | 'controlled'; value: string }[];
  results: ExperimentResult;
  createdAt: number;
  completedAt?: number;
  status: 'planned' | 'running' | 'completed' | 'failed';
}

export interface ExperimentResult {
  data: Record<string, unknown>;
  metrics: Record<string, number>;
  conclusion: string;
  statisticalSignificance?: number;
}

export interface Finding {
  id: string;
  title: string;
  description: string;
  source: string;
  relevance: number; // 0-1
  tags: string[];
  linkedHypotheses: string[];
  createdAt: number;
}

export type ExportFormat = 'markdown' | 'json' | 'html' | 'pdf';
export type ExportOptions = {
  format: ExportFormat;
  includeRawData?: boolean;
  includeMetadata?: boolean;
  includeTimestamp?: boolean;
  template?: string;
};

const DEFAULT_OPTIONS: ExportOptions = {
  format: 'markdown',
  includeRawData: true,
  includeMetadata: true,
  includeTimestamp: true,
};

class ResearchExportService {
  private storage: StorageAdapter;
  private exportHistory: { projectId: string; format: ExportFormat; timestamp: number; size: number }[] = [];

  constructor() {
    this.storage = StorageAdapter.RESEARCH;
  }

  async init(): Promise<void> {
    const saved = await this.storage.get<{ history: ResearchExportService['exportHistory'] }>('history');
    if (saved) {
      this.exportHistory = saved.history;
    }
    LOGGER.info('ResearchExport', `Initialized with ${this.exportHistory.length} exports`);
  }

  /**
   * Export a research project
   */
  async export(project: ResearchProject, options: Partial<ExportOptions> = {}): Promise<string> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();

    LOGGER.info('ResearchExport', 'Exporting project', { projectId: project.id, format: opts.format });

    let content: string;
    switch (opts.format) {
      case 'markdown':
        content = this.toMarkdown(project, opts);
        break;
      case 'json':
        content = this.toJson(project, opts);
        break;
      case 'html':
        content = this.toHtml(project, opts);
        break;
      case 'pdf':
        content = this.toHtml(project, opts); // PDF generation handled client-side
        break;
      default:
        throw new Error(`Unsupported format: ${opts.format}`);
    }

    const record = {
      projectId: project.id,
      format: opts.format,
      timestamp: Date.now(),
      size: content.length,
    };
    this.exportHistory.push(record);
    await this.save();

    LOGGER.info('ResearchExport', 'Export complete', {
      projectId: project.id,
      format: opts.format,
      size: content.length,
      durationMs: Date.now() - startTime,
    });

    return content;
  }

  /**
   * Export multiple projects as a collection
   */
  async exportCollection(projects: ResearchProject[], options: Partial<ExportOptions> = {}): Promise<string> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    LOGGER.info('ResearchExport', 'Exporting collection', { count: projects.length });

    switch (opts.format) {
      case 'markdown':
        return projects.map(p => this.toMarkdown(p, opts)).join('\n\n---\n\n');
      case 'json':
        return JSON.stringify(projects, null, 2);
      case 'html':
        return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Research Collection</title>
<style>body{font-family:system-ui;max-width:900px;margin:0 auto;padding:2rem}
h1{color:#2563eb}h2{color:#475569}h3{color:#64748b}.meta{color:#94a3b8;font-size:.9em}
.hypothesis,.experiment,.finding{padding:1rem;margin:1rem 0;border-radius:8px}
.hypothesis{background:#eff6ff}.experiment{background:#f0fdf4}.finding{background:#fef3c7}
</style></head><body>
<h1>Research Collection</h1>
${projects.map(p => this.toHtml(p, opts)).join('<hr>')}
</body></html>`;
      default:
        throw new Error(`Collection export not supported for format: ${opts.format}`);
    }
  }

  /**
   * Export hypotheses only
   */
  async exportHypotheses(projects: ResearchProject[], options: Partial<ExportOptions> = {}): Promise<string> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const allHypotheses = projects.flatMap(p => p.hypotheses);

    LOGGER.info('ResearchExport', 'Exporting hypotheses', { count: allHypotheses.length });

    switch (opts.format) {
      case 'markdown':
        return `# Hypotheses Export\n\nExported: ${new Date().toISOString()}\n\n` +
          allHypotheses.map(h => `## ${h.title}\n\n${h.description}\n\n- **Status**: ${h.status}\n- **Confidence**: ${(h.confidence * 100).toFixed(0)}%\n- **Evidence**: ${h.evidence.length} items\n- **Created**: ${new Date(h.createdAt).toLocaleDateString()}`).join('\n\n---\n\n');
      case 'json':
        return JSON.stringify(allHypotheses, null, 2);
      default:
        return this.toJson({ 
          ...projects[0], 
          hypotheses: allHypotheses,
          experiments: [],
          findings: [],
        }, opts);
    }
  }

  /**
   * Export findings as a report
   */
  async exportFindingsReport(projects: ResearchProject[], options: Partial<ExportOptions> = {}): Promise<string> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const allFindings = projects.flatMap(p => p.findings).sort((a, b) => b.relevance - a.relevance);

    LOGGER.info('ResearchExport', 'Exporting findings report', { count: allFindings.length });

    const byTag = new Map<string, Finding[]>();
    for (const f of allFindings) {
      for (const tag of f.tags) {
        if (!byTag.has(tag)) byTag.set(tag, []);
        byTag.get(tag)!.push(f);
      }
    }

    switch (opts.format) {
      case 'markdown':
        return `# Findings Report\n\nExported: ${new Date().toISOString()}\n\n` +
          `Total Findings: ${allFindings.length}\n\n` +
          `## By Relevance\n\n` +
          allFindings.slice(0, 20).map(f => 
            `### ${f.title} (${(f.relevance * 100).toFixed(0)}%)\n\n${f.description}\n\n- **Source**: ${f.source}\n- **Tags**: ${f.tags.join(', ')}`
          ).join('\n\n---\n\n') +
          `\n\n## By Tag\n\n` +
          Array.from(byTag.entries()).map(([tag, findings]) => 
            `### ${tag} (${findings.length} findings)\n\n${findings.map(f => `- ${f.title}`).join('\n')}`
          ).join('\n\n');
      case 'json':
        return JSON.stringify({ findings: allFindings, byTag: Object.fromEntries(byTag) }, null, 2);
      default:
        return this.toJson({ 
          ...projects[0], 
          findings: allFindings,
          hypotheses: [],
          experiments: [],
        }, opts);
    }
  }

  /**
   * Get export history
   */
  getHistory(): typeof this.exportHistory {
    return [...this.exportHistory];
  }

  /**
   * Generate a summary document
   */
  generateSummary(project: ResearchProject): {
    totalHypotheses: number;
    confirmedHypotheses: number;
    totalExperiments: number;
    completedExperiments: number;
    totalFindings: number;
    avgConfidence: number;
    duration: number;
  } {
    const confirmed = project.hypotheses.filter(h => h.status === 'confirmed').length;
    const completed = project.experiments.filter(e => e.status === 'completed').length;
    const avgConf = project.hypotheses.length > 0
      ? project.hypotheses.reduce((sum, h) => sum + h.confidence, 0) / project.hypotheses.length
      : 0;

    return {
      totalHypotheses: project.hypotheses.length,
      confirmedHypotheses: confirmed,
      totalExperiments: project.experiments.length,
      completedExperiments: completed,
      totalFindings: project.findings.length,
      avgConfidence: avgConf,
      duration: project.updatedAt - project.createdAt,
    };
  }

  private toMarkdown(project: ResearchProject, opts: ExportOptions): string {
    const sections: string[] = [];

    if (opts.includeTimestamp) {
      sections.push(`_Exported: ${new Date().toISOString()}_\n`);
    }

    sections.push(`# ${project.title}\n\n${project.description}\n`);

    if (opts.includeMetadata) {
      sections.push(`## Metadata\n\n- **Status**: ${project.status}\n- **Created**: ${new Date(project.createdAt).toLocaleDateString()}\n- **Updated**: ${new Date(project.updatedAt).toLocaleDateString()}\n`);
    }

    if (project.hypotheses.length > 0) {
      sections.push(`## Hypotheses (${project.hypotheses.length})\n\n` +
        project.hypotheses.map(h => 
          `### ${h.title} [${h.status.toUpperCase()}]\n\n${h.description}\n\n` +
          `- Confidence: ${(h.confidence * 100).toFixed(0)}%\n` +
          `- Evidence: ${h.evidence.length} items\n`
        ).join('\n')
      );
    }

    if (project.experiments.length > 0 && opts.includeRawData) {
      sections.push(`## Experiments (${project.experiments.length})\n\n` +
        project.experiments.map(e => 
          `### ${e.title} [${e.status}]\n\n${e.methodology}\n\n` +
          `**Variables:** ${e.variables.map(v => `${v.name} (${v.type})`).join(', ')}\n\n` +
          `**Results:** ${e.results.conclusion}\n`
        ).join('\n')
      );
    }

    if (project.findings.length > 0) {
      sections.push(`## Findings (${project.findings.length})\n\n` +
        project.findings
          .sort((a, b) => b.relevance - a.relevance)
          .map(f => 
            `### ${f.title} (${(f.relevance * 100).toFixed(0)}% relevance)\n\n${f.description}\n\n` +
            `- Source: ${f.source}\n` +
            `- Tags: ${f.tags.join(', ')}\n`
          ).join('\n')
      );
    }

    return sections.join('\n');
  }

  private toJson(project: ResearchProject, opts: ExportOptions): string {
    const data: Record<string, unknown> = {
      title: project.title,
      description: project.description,
    };

    if (opts.includeTimestamp) {
      data.exportedAt = new Date().toISOString();
    }

    if (opts.includeMetadata) {
      data.metadata = {
        ...project.metadata,
        status: project.status,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      };
    }

    data.hypotheses = project.hypotheses;
    if (opts.includeRawData) {
      data.experiments = project.experiments;
    }
    data.findings = project.findings;

    return JSON.stringify(data, null, 2);
  }

  private toHtml(project: ResearchProject, opts: ExportOptions): string {
    const summary = this.generateSummary(project);

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
           line-height: 1.6; color: #1e293b; background: #f8fafc; }
    .container { max-width: 900px; margin: 0 auto; padding: 2rem; }
    h1 { color: #2563eb; font-size: 2rem; margin-bottom: 0.5rem; }
    h2 { color: #475569; font-size: 1.5rem; margin: 2rem 0 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #e2e8f0; }
    h3 { color: #64748b; font-size: 1.2rem; margin: 1.5rem 0 0.75rem; }
    .meta { color: #94a3b8; font-size: 0.9rem; margin-bottom: 1.5rem; }
    .card { background: white; border-radius: 8px; padding: 1.5rem; margin: 1rem 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .hypothesis { border-left: 4px solid #3b82f6; }
    .experiment { border-left: 4px solid #22c55e; }
    .finding { border-left: 4px solid #f59e0b; }
    .status { display: inline-block; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.8rem; font-weight: 600; }
    .status.confirmed { background: #dcfce7; color: #166534; }
    .status.pending { background: #fef3c7; color: #92400e; }
    .status.rejected { background: #fee2e2; color: #991b1b; }
    .status.testing { background: #dbeafe; color: #1e40af; }
    .status.completed { background: #dcfce7; color: #166534; }
    .status.running { background: #fef3c7; color: #92400e; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 1rem 0; }
    .stat { background: #eff6ff; padding: 1rem; border-radius: 8px; text-align: center; }
    .stat-value { font-size: 2rem; font-weight: 700; color: #2563eb; }
    .stat-label { color: #64748b; font-size: 0.9rem; }

    .tags { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.5rem; }
    .tag { background: #f1f5f9; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.8rem; color: #64748b; }
    .exported { text-align: center; color: #94a3b8; font-size: 0.8rem; margin-top: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${project.title}</h1>
    <p class="meta">${project.description}</p>

    <div class="grid">
      <div class="stat"><div class="stat-value">${summary.totalHypotheses}</div><div class="stat-label">Hypotheses</div></div>
      <div class="stat"><div class="stat-value">${summary.confirmedHypotheses}</div><div class="stat-label">Confirmed</div></div>
      <div class="stat"><div class="stat-value">${summary.totalExperiments}</div><div class="stat-label">Experiments</div></div>
      <div class="stat"><div class="stat-value">${summary.totalFindings}</div><div class="stat-label">Findings</div></div>
    </div>

    ${project.hypotheses.length > 0 ? `
    <h2>Hypotheses</h2>
    ${project.hypotheses.map(h => `
    <div class="card hypothesis">
      <h3>${h.title} <span class="status ${h.status}">${h.status}</span></h3>
      <p>${h.description}</p>
      <p><strong>Confidence:</strong> ${(h.confidence * 100).toFixed(0)}%</p>
      <p><strong>Evidence:</strong> ${h.evidence.length} items</p>
    </div>`).join('')}
    ` : ''}

    ${project.experiments.length > 0 && opts.includeRawData ? `
    <h2>Experiments</h2>
    ${project.experiments.map(e => `
    <div class="card experiment">
      <h3>${e.title} <span class="status ${e.status}">${e.status}</span></h3>
      <p><strong>Methodology:</strong> ${e.methodology}</p>
      <p><strong>Variables:</strong> ${e.variables.map(v => `${v.name} (${v.type})`).join(', ')}</p>
      <p><strong>Results:</strong> ${e.results.conclusion}</p>
    </div>`).join('')}
    ` : ''}

    ${project.findings.length > 0 ? `
    <h2>Findings</h2>
    ${project.findings
      .sort((a, b) => b.relevance - a.relevance)
      .map(f => `
    <div class="card finding">
      <h3>${f.title} <small>(${Math.round(f.relevance * 100)}% relevance)</small></h3>
      <p>${f.description}</p>
      <p><strong>Source:</strong> ${f.source}</p>
      <div class="tags">${f.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
    </div>`).join('')}
    ` : ''}

    <p class="exported">Exported: ${new Date().toISOString()}</p>
  </div>
</body>
</html>`;
  }

  private async save(): Promise<void> {
    await this.storage.set('history', { history: this.exportHistory.slice(-100) });
  }
}

// Singleton
export const researchExportService = new ResearchExportService();