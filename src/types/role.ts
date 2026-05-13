export type RoleCategory = 'creative' | 'technical' | 'analytical' | 'management' | 'custom';

export type RolePermission = 
  | 'chat:send'
  | 'chat:read'
  | 'memory:write'
  | 'memory:read'
  | 'memory:delete'
  | 'tools:execute'
  | 'tools:manage'
  | 'agents:spawn'
  | 'agents:manage'
  | 'roles:manage'
  | 'connectors:use'
  | 'connectors:manage'
  | 'skills:use'
  | 'skills:manage'
  | 'settings:read'
  | 'settings:write'
  | 'system:admin'
  | 'system:monitor'
  | 'debate:participate'
  | 'orchestration:design';

export type CapabilityLevel = 'none' | 'read' | 'write' | 'admin';

export interface PermissionOverride {
  permission: RolePermission;
  level: CapabilityLevel;
  reason?: string;
}

export interface RoleCapability {
  toolId: string;
  level: CapabilityLevel;
  config?: Record<string, unknown>;
}

export interface RoleInheritance {
  parentRoleId: string | null;
  inheritedPermissions: RolePermission[];
  depth: number;
}

export interface RolePromptTemplate {
  system: string;
  userPrefix?: string;
  assistantPrefix?: string;
  stopSequences?: string[];
}

export interface RoleConstraints {
  maxTokensPerRequest?: number;
  maxConcurrentCalls?: number;
  allowedModels?: string[];
  bannedProviders?: string[];
  temperatureRange?: { min: number; max: number };
  rateLimitPerMinute?: number;
}

export interface RoleMetadata {
  category: RoleCategory;
  created: number;
  updated: number;
  version?: string;
  author?: string;
  tags?: string[];
  avatar?: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  baseTemperature: number;
  icon?: string;
  capabilities: string[];
  permissions: RolePermission[];
  capabilityDetails?: RoleCapability[];
  inheritance?: RoleInheritance;
  promptTemplate?: RolePromptTemplate;
  constraints?: RoleConstraints;
  metadata: RoleMetadata;
  isBuiltin?: boolean;
  priority?: number;
}

export type RoleCreateInput = Omit<Role, 'id' | 'metadata'> & {
  metadata?: Partial<RoleMetadata>;
};

export type RoleUpdateInput = Partial<Omit<Role, 'id'>>;

export interface RoleWithStats extends Role {
  usageStats: {
    totalCalls: number;
    totalTokens: number;
    avgLatency: number;
    lastUsed: number | null;
    assignedNodes: string[];
  };
}

export const DEFAULT_ROLE_PERMISSIONS: Record<RoleCategory, RolePermission[]> = {
  creative: ['chat:send', 'memory:read', 'memory:write', 'tools:execute'],
  technical: ['chat:send', 'memory:read', 'memory:write', 'tools:execute', 'tools:manage', 'skills:use'],
  analytical: ['chat:send', 'memory:read', 'memory:write', 'tools:execute', 'system:monitor'],
  management: ['chat:send', 'memory:read', 'agents:spawn', 'agents:manage', 'roles:manage', 'system:monitor', 'settings:read'],
  custom: ['chat:send', 'memory:read'],
};

export const BUILTIN_ROLES: Role[] = [
  {
    id: 'role-general',
    name: 'General Assistant',
    description: 'Default versatile AI assistant for general-purpose tasks',
    systemPrompt: 'You are a helpful AI assistant.',
    baseTemperature: 0.7,
    capabilities: ['code_interpreter', 'web_search'],
    permissions: DEFAULT_ROLE_PERMISSIONS.creative,
    metadata: { category: 'creative', created: Date.now(), updated: Date.now(), tags: ['builtin', 'general'] },
    isBuiltin: true,
    priority: 0,
  },
  {
    id: 'role-coder',
    name: 'Code Specialist',
    description: 'Expert software engineer with deep technical capabilities',
    systemPrompt: 'You are an expert software engineer. Write clean, well-documented, efficient code.',
    baseTemperature: 0.3,
    capabilities: ['code_interpreter', 'code_review', 'debugger'],
    permissions: DEFAULT_ROLE_PERMISSIONS.technical,
    metadata: { category: 'technical', created: Date.now(), updated: Date.now(), tags: ['builtin', 'coding'] },
    isBuiltin: true,
    priority: 1,
  },
  {
    id: 'role-analyst',
    name: 'Data Analyst',
    description: 'Analytical reasoning specialist for data interpretation and insights',
    systemPrompt: 'You are a data analysis expert. Think step by step and provide evidence-based conclusions.',
    baseTemperature: 0.2,
    capabilities: ['data_analysis', 'visualization'],
    permissions: DEFAULT_ROLE_PERMISSIONS.analytical,
    metadata: { category: 'analytical', created: Date.now(), updated: Date.now(), tags: ['builtin', 'analytics'] },
    isBuiltin: true,
    priority: 2,
  },
  {
    id: 'role-debater',
    name: 'Debate Champion',
    description: 'Constructive dialectic agent for multi-perspective reasoning',
    systemPrompt: 'You are a debate specialist. Present balanced arguments and challenge assumptions constructively.',
    baseTemperature: 0.8,
    capabilities: ['debate', 'reasoning'],
    permissions: ['chat:send', 'memory:read', 'debate:participate'],
    metadata: { category: 'management', created: Date.now(), updated: Date.now(), tags: ['builtin', 'debate'] },
    isBuiltin: true,
    priority: 3,
  },
];
