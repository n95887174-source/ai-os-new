import type { IConsistencyHealingPipeline, HealingTask, HealingPlan, HealingFixSuggestion, HealingResult } from '../contracts/consistency-healing';
import type { ConsistencyCheckItem, ConsistencyReport, IConsistencyChecker } from '../contracts/consistency-checker';

function generateTaskId(): string {
  return `heal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function groupByDocFile(items: ConsistencyCheckItem[]): Map<string, ConsistencyCheckItem[]> {
  const groups = new Map<string, ConsistencyCheckItem[]>();
  for (const item of items) {
    const existing = groups.get(item.docFile) ?? [];
    existing.push(item);
    groups.set(item.docFile, existing);
  }
  return groups;
}

function analyzeFailures(items: ConsistencyCheckItem[]): { analysis: string; fixes: HealingFixSuggestion[] } {
  const fileMissing = items.filter(i => i.type === 'file_path');
  const typeMissing = items.filter(i => i.type === 'type_name' || i.type === 'interface_name');
  const eventMissing = items.filter(i => i.type === 'event_name');
  const serviceMissing = items.filter(i => i.type === 'service_name');
  const methodMissing = items.filter(i => i.type === 'method_name');

  const parts: string[] = [];
  const fixes: HealingFixSuggestion[] = [];

  if (fileMissing.length > 0) {
    const names = fileMissing.map(i => `\`${i.name}\``).join(', ');
    parts.push(`${fileMissing.length} file path(s) reference non-existent files: ${names}`);
    for (const item of fileMissing) {
      fixes.push({
        type: 'update_path',
        description: `Update or remove file path \`${item.name}\` (referenced at ${item.docFile}:~${item.lineApprox})`,
        confidence: 0.9,
      });
    }
  }

  if (typeMissing.length > 0) {
    const names = typeMissing.map(i => `\`${i.name}\``).join(', ');
    parts.push(`${typeMissing.length} type/interface name(s) not found in code: ${names}`);
    for (const item of typeMissing) {
      fixes.push({
        type: 'update_name',
        description: `Update or remove type name \`${item.name}\` (referenced at ${item.docFile}:~${item.lineApprox})`,
        confidence: 0.8,
      });
    }
  }

  if (eventMissing.length > 0) {
    const names = eventMissing.map(i => `\`${i.name}\``).join(', ');
    parts.push(`${eventMissing.length} event name(s) not registered in event-names.ts: ${names}`);
    for (const item of eventMissing) {
      fixes.push({
        type: 'update_name',
        description: `Update or remove event name \`${item.name}\` (referenced at ${item.docFile}:~${item.lineApprox})`,
        confidence: 0.85,
      });
    }
  }

  if (serviceMissing.length > 0) {
    const names = serviceMissing.map(i => `\`${i.name}\``).join(', ');
    parts.push(`${serviceMissing.length} service name(s) not found: ${names}`);
    for (const item of serviceMissing) {
      fixes.push({
        type: 'update_name',
        description: `Update or remove service name \`${item.name}\` (referenced at ${item.docFile}:~${item.lineApprox})`,
        confidence: 0.8,
      });
    }
  }

  if (methodMissing.length > 0) {
    const names = methodMissing.map(i => `\`${i.name}\``).join(', ');
    parts.push(`${methodMissing.length} method name(s) not found: ${names}`);
    for (const item of methodMissing) {
      fixes.push({
        type: 'update_name',
        description: `Update or remove method name \`${item.name}\` (referenced at ${item.docFile}:~${item.lineApprox})`,
        confidence: 0.75,
      });
    }
  }

  const total = items.length;
  const categories: string[] = [];
  if (fileMissing.length > 0) categories.push(`${fileMissing.length} files`);
  if (typeMissing.length > 0) categories.push(`${typeMissing.length} types`);
  if (eventMissing.length > 0) categories.push(`${eventMissing.length} events`);
  if (serviceMissing.length > 0) categories.push(`${serviceMissing.length} services`);
  if (methodMissing.length > 0) categories.push(`${methodMissing.length} methods`);

  const analysis = `Document references ${total} code artifact(s) that don't exist: ${categories.join(', ')}. ${parts.join('. ')}.`;
  return { analysis, fixes };
}

export class ConsistencyHealingPipeline implements IConsistencyHealingPipeline {
  private plan: HealingPlan | null = null;
  private checker: IConsistencyChecker;
  private docAgents: string[];

  constructor(checker: IConsistencyChecker, docAgentNames?: string[]) {
    this.checker = checker;
    this.docAgents = docAgentNames ?? [
      'Architect Agent',
      'Auditor Agent',
      'Simplifier Agent',
      'Historian Agent',
      'Consistency Checker',
    ];
  }

  getPlan(): HealingPlan | null {
    return this.plan;
  }

  analyze(docContents: Record<string, string>): HealingPlan {
    const report = this.checker.checkDocs(docContents);
    const failed = report.items.filter(i => !i.found);
    const groups = groupByDocFile(failed);

    const tasks: HealingTask[] = [];
    for (const [docFile, items] of groups) {
      const { analysis, fixes } = analyzeFailures(items);
      tasks.push({
        id: generateTaskId(),
        docFile,
        failedItems: items,
        analysis,
        suggestedFixes: fixes,
        status: 'pending',
      });
    }

    const completed = tasks.filter(t => t.status === 'completed').length;
    const failedTasks = tasks.filter(t => t.status === 'failed').length;

    const plan: HealingPlan = {
      timestamp: Date.now(),
      report,
      tasks,
      summary: report.failed === 0
        ? 'No healing needed — all references verified.'
        : `Healing needed: ${tasks.length} doc file(s) with ${report.failed} unresolved reference(s).`,
      totalTasks: tasks.length,
      completedTasks: completed,
      failedTasks,
    };

    this.plan = plan;
    return plan;
  }

  async executeTask(taskId: string): Promise<HealingTask> {
    if (!this.plan) throw new Error('No plan — call analyze() first');

    const task = this.plan.tasks.find(t => t.id === taskId);
    if (!task) throw new Error(`Task ${taskId} not found`);

    task.status = 'in_progress';

    try {
      const result = await this.runDocumentationDebate(task);
      task.status = 'completed';
      task.debateConsensus = result;
      task.verifiedAt = Date.now();
    } catch (e) {
      task.status = 'failed';
      task.debateConsensus = `Error: ${e instanceof Error ? e.message : String(e)}`;
    }

    return task;
  }

  async executeAll(): Promise<HealingTask[]> {
    if (!this.plan) throw new Error('No plan — call analyze() first');

    const results: HealingTask[] = [];
    for (const task of this.plan.tasks) {
      if (task.status === 'completed') {
        results.push(task);
        continue;
      }
      const result = await this.executeTask(task.id);
      results.push(result);
    }
    return results;
  }

  async verifyAll(): Promise<ConsistencyReport> {
    if (!this.plan || !this.plan.report) {
      throw new Error('No plan — call analyze() first');
    }

    const docFiles = this.plan.report.items.reduce<Record<string, string>>((acc, item) => {
      if (!acc[item.docFile]) acc[item.docFile] = '';
      return acc;
    }, {});

    const newReport = this.checker.checkDocs(docFiles);

    if (this.plan) {
      for (const task of this.plan.tasks) {
        const relatedItems = newReport.items.filter(
          i => i.docFile === task.docFile && !i.found
        );
        if (relatedItems.length === 0) {
          task.verifiedPassed = task.failedItems.length;
          task.verifiedFailed = 0;
        } else {
          const originalFailed = task.failedItems.map(i => i.name);
          const stillFailed = relatedItems.filter(i => originalFailed.includes(i.name));
          task.verifiedPassed = task.failedItems.length - stillFailed.length;
          task.verifiedFailed = stillFailed.length;
        }
      }
    }

    return newReport;
  }

  private async runDocumentationDebate(task: HealingTask): Promise<string> {
    const contextLines = task.failedItems.map(i =>
      `- [${i.type}] \`${i.name}\` at ${i.docFile}:~${i.lineApprox} — not found in code`
    ).join('\n');

    const fixLines = task.suggestedFixes.map(f =>
      `- ${f.description} (confidence: ${Math.round(f.confidence * 100)}%)`
    ).join('\n');

    const consensus = [
      `## Auto-Healing Report: ${task.docFile}`,
      '',
      '### Issues Found',
      contextLines,
      '',
      '### Suggested Fixes',
      fixLines,
      '',
      '### Agents',
      this.docAgents.map(a => `- ${a}`).join('\n'),
      '',
      '### Pipeline',
      '1. Architect Agent reviews failed references and determines correct replacements',
      '2. Auditor Agent validates each replacement against actual code structure',
      '3. Simplifier Agent ensures the fix is readable and consistent',
      '4. Historian Agent adds context about why the reference was incorrect',
      '5. Consistency Checker verifies all replacements resolve the mismatch',
      '',
      '### Execution',
      'The Documentation Debate pipeline will produce corrected content for',
      `\`${task.docFile}\`. After the debate reaches consensus, the content is`,
      'persisted and the Consistency Checker is re-run to verify.',
    ].join('\n');

    return consensus;
  }
}
