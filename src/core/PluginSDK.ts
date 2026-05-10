import { eventBus } from './events';

/**
 * SuperAgents OS - Plugin SDK
 * 
 * Standardized interface for extending the system with new tools,
 * connectors, and cognitive nodes.
 */

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
}

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: unknown, context: PluginContext) => Promise<unknown>;
}

export interface PluginContext {
  logger: {
    info: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
  };
  emit: (event: string, data: unknown) => void;
  storage: {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown) => Promise<void>;
  };
}

export interface SuperAgentsPlugin {
  manifest: PluginManifest;
  tools?: ToolDefinition[];
  onLoad?: (context: PluginContext) => Promise<void>;
  onUnload?: () => Promise<void>;
}

class PluginRegistry {
  private plugins = new Map<string, SuperAgentsPlugin>();
  private tools = new Map<string, ToolDefinition>();

  async register(plugin: SuperAgentsPlugin) {
    console.log(`[PluginSDK] Registering plugin: ${plugin.manifest.name} v${plugin.manifest.version}`);
    
    const context: PluginContext = {
      logger: {
        info: (msg) => console.log(`[Plugin:${plugin.manifest.id}] ${msg}`),
        warn: (msg) => console.warn(`[Plugin:${plugin.manifest.id}] ${msg}`),
        error: (msg) => console.error(`[Plugin:${plugin.manifest.id}] ${msg}`),
      },
      emit: (event, data) => eventBus.emit(event as keyof import('./events').EventMap, data),
      storage: {
        get: async (key) => localStorage.getItem(`plugin:${plugin.manifest.id}:${key}`),
        set: async (key, value) => localStorage.setItem(`plugin:${plugin.manifest.id}:${key}`, String(value)),
      }
    };

    if (plugin.onLoad) {
      await plugin.onLoad(context);
    }

    if (plugin.tools) {
      for (const tool of plugin.tools) {
        this.tools.set(tool.id, tool);
        console.log(`[PluginSDK] Registered tool: ${tool.name} (${tool.id})`);
      }
    }

    this.plugins.set(plugin.manifest.id, plugin);
  }

  getTool(id: string) {
    return this.tools.get(id);
  }

  getAllTools() {
    return Array.from(this.tools.values());
  }
}

export const pluginRegistry = new PluginRegistry();
