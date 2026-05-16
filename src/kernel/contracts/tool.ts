import type { Result } from './results';
import type { ToolError } from './errors';

export interface ToolDescriptor {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: ToolCategory;
  readonly version: string;
  readonly schema: {
    readonly input: Record<string, unknown>;
    readonly output: Record<string, unknown>;
  };
  readonly enabled: boolean;
  readonly executionCount: number;
  readonly avgDurationMs: number;
}

export type ToolCategory =
  | 'code'
  | 'data'
  | 'search'
  | 'communication'
  | 'file'
  | 'system'
  | 'utility'
  | 'custom';

export interface ToolExecutionRequest {
  readonly toolId: string;
  readonly input: unknown;
  readonly timeout?: number;
  readonly retryOnFailure?: boolean;
  readonly maxRetries?: number;
  readonly context?: Record<string, unknown>;
}

export interface ToolExecutionResult {
  readonly toolId: string;
  readonly status: 'success' | 'error' | 'timeout';
  readonly data?: unknown;
  readonly error?: string;
  readonly timestamp: number;
  readonly duration: number;
  readonly retryCount: number;
}

export interface ToolCapabilityDescriptor {
  readonly supportsStreaming: boolean;
  readonly supportsCancellation: boolean;
  readonly supportsProgress: boolean;
  readonly maxExecutionTimeMs: number;
  readonly maxConcurrentExecutions: number;
  readonly requiresNetwork: boolean;
  readonly requiresFilesystem: boolean;
  readonly allowedCategories: ToolCategory[];
}

export interface IToolRegistry {
  register(tool: ToolDescriptor): Result<void, ToolError>;
  unregister(toolId: string): Result<void, ToolError>;
  getTool(toolId: string): Result<ToolDescriptor, ToolError>;
  getTools(category?: ToolCategory): ToolDescriptor[];
  execute(request: ToolExecutionRequest): Promise<Result<ToolExecutionResult, ToolError>>;
  getCapabilities(): ToolCapabilityDescriptor;
  isEnabled(toolId: string): boolean;
  setEnabled(toolId: string, enabled: boolean): Result<void, ToolError>;
}
