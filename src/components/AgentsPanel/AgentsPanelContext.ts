import React, { createContext, useContext } from 'react';
import type { Agent, UiAgentTemplate, TabId, ViewMode, StatusFilter } from './AgentsPanelView';

export interface AgentsPanelContextValue {
  agents: Agent[];
  agentStats: Record<string, { calls: number; tokens: number; latency: number; errors?: number; avgTokensPerCall?: number; lastActive?: number }>;
  viewMode: ViewMode;
  searchQuery: string;
  statusFilter: StatusFilter;
  selectedAgent: Agent | null;
  activeTab: TabId;
  isLoading: boolean;
  error: string | null;
  resetAllArmed: boolean;
  filteredAgents: Agent[];
  availableRoles: { id: string; name: string }[];
  availableTools: { id: string; name: string; description?: string }[];
  keys: { status: string; provider: string; availableModels?: string[] }[];
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  modalRef: React.RefObject<HTMLDivElement | null>;
  onSetViewMode: (mode: ViewMode) => void;
  onSetSearchQuery: (q: string) => void;
  onSetStatusFilter: (f: StatusFilter) => void;
  onSetSelectedAgentId: (id: string | null) => void;
  onSetActiveTab: (tab: TabId) => void;
  onSetError: (err: string | null) => void;
  onNavigateBuilder: () => void;
  onDeployNewAgent: (template?: UiAgentTemplate) => void;
  onToggleStatus: (id: string) => void;
  onUpdateAgent: (agentId: string, updates: Record<string, unknown>) => void;
  onApplyRoleToAgent: (agentId: string, roleId: string) => void;
  onPauseAll: () => void;
  onResumeAll: () => void;
  onDuplicateAgent: (agentId: string) => void;
  onDeleteAgent: (agentId: string) => void;
  onResetAgentStats: (agentId: string) => void;
  onResetAllStats: () => void;
  onExportAgents: () => void;
  onImportAgents: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const AgentsPanelContext = createContext<AgentsPanelContextValue | null>(null);

export function useAgentsPanel(): AgentsPanelContextValue {
  const ctx = useContext(AgentsPanelContext);
  if (!ctx) throw new Error('useAgentsPanel must be used within AgentsPanelProvider');
  return ctx;
}
