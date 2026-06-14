import type { Role } from '../types/role-types';

export interface RoleTestCase {
  id: string;
  roleId: string;
  roleName: string;
  prompt: string;
  response: string;
  model: string;
  provider: string;
  tokens: number;
  latency: number;
  cost: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

export interface RoleTestResult {
  testCase: RoleTestCase;
  role: Role;
}

interface RoleTestServiceDeps {
  sendMessage: (messages: Array<{ role: string; content: string }>, model: string, apiKey: string) => Promise<{ content: string; tokens: number; latency: number }>;
  getApiKey: (provider: string) => string | undefined;
}

export class RoleTestService {
  private testCases: RoleTestCase[] = [];
  private deps: RoleTestServiceDeps;

  constructor(deps: RoleTestServiceDeps) {
    this.deps = deps;
  }

  async testRole(role: Role, prompt: string): Promise<RoleTestResult> {
    const apiKey = this.deps.getApiKey('groq') || this.deps.getApiKey('gemini') || this.deps.getApiKey('openrouter') || '';
    if (!apiKey) throw new Error('No API key available');

    const provider = this.deps.getApiKey('groq') ? 'groq' : this.deps.getApiKey('gemini') ? 'gemini' : 'openrouter';
    const model = provider === 'groq' ? 'llama-3.1-8b-instant' : provider === 'gemini' ? 'gemini-3.1-flash-lite' : 'meta-llama/llama-3.1-8b-instruct';

    const messages = [
      { role: 'system', content: role.systemPrompt },
      { role: 'user', content: prompt },
    ];

    const start = Date.now();
    let response = '';
    let tokens = 0;
    let latency = 0;
    let success = true;
    let error: string | undefined;

    try {
      const res = await this.deps.sendMessage(messages, model, apiKey);
      response = res.content;
      tokens = res.tokens;
      latency = res.latency || Date.now() - start;
    } catch (e: unknown) {
      success = false;
      error = e instanceof Error ? e.message : 'Unknown error';
      response = `[Error: ${error}]`;
    }

    const testCase: RoleTestCase = {
      id: crypto.randomUUID(),
      roleId: role.id,
      roleName: role.name,
      prompt,
      response,
      model,
      provider,
      tokens,
      latency,
      cost: 0,
      timestamp: Date.now(),
      success,
      error,
    };

    this.testCases.push(testCase);
    if (this.testCases.length > 100) this.testCases.shift();
    return { testCase, role };
  }

  async compareRoles(roles: Role[], prompt: string): Promise<RoleTestResult[]> {
    const results: RoleTestResult[] = [];
    for (const role of roles) {
      try {
        const result = await this.testRole(role, prompt);
        results.push(result);
      } catch {
        results.push({
          testCase: {
            id: crypto.randomUUID(),
            roleId: role.id,
            roleName: role.name,
            prompt,
            response: '[Error: Test failed]',
            model: 'unknown',
            provider: 'unknown',
            tokens: 0,
            latency: 0,
            cost: 0,
            timestamp: Date.now(),
            success: false,
            error: 'Test failed',
          },
          role,
        });
      }
    }
    return results;
  }

  getTestCases(): RoleTestCase[] {
    return [...this.testCases];
  }

  getTestCasesForRole(roleId: string): RoleTestCase[] {
    return this.testCases.filter(tc => tc.roleId === roleId);
  }

  clearTestCases(): void {
    this.testCases = [];
  }
}
