import { eventBus } from './events';
import { db } from './DatabaseService';

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
  capabilities?: {
    events?: string[];
    storage?: boolean;
    network?: boolean;
  };
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
  private toolToPlugin = new Map<string, string>();

  getContext(pluginId: string): PluginContext {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) throw new Error(`Plugin ${pluginId} not found`);
    const caps = plugin.manifest.capabilities || {};

    return {
      logger: {
        info: (msg) => console.log(`[Plugin:${plugin.manifest.id}] ${msg}`),
        warn: (msg) => console.warn(`[Plugin:${plugin.manifest.id}] ${msg}`),
        error: (msg) => console.error(`[Plugin:${plugin.manifest.id}] ${msg}`),
      },
      emit: (event, data) => {
        if (!caps.events) {
          throw new Error(`Plugin ${pluginId} has no event capabilities declared`);
        }
        const allowed = caps.events.some(pat => pat === '*' || pat === event || (pat.endsWith('*') && event.startsWith(pat.slice(0, -1))));
        if (!allowed) {
          throw new Error(`Plugin ${pluginId} is not allowed to emit event ${event}`);
        }
        eventBus.emit(event as keyof import('./events').EventMap, data);
      },
      storage: {
        get: async (key) => {
          if (!caps.storage) throw new Error(`Plugin ${pluginId} is not allowed to access storage`);
          const v = await db.getKv(`plugin:${plugin.manifest.id}:${key}`);
          return v;
        },
        set: async (key, value) => {
          if (!caps.storage) throw new Error(`Plugin ${pluginId} is not allowed to access storage`);
          await db.setKv(`plugin:${plugin.manifest.id}:${key}`, value);
        },
      }
    };
  }

  async register(plugin: SuperAgentsPlugin) {
    console.log(`[PluginSDK] Registering plugin: ${plugin.manifest.name} v${plugin.manifest.version}`);
    
    this.plugins.set(plugin.manifest.id, plugin);
    const context = this.getContext(plugin.manifest.id);

    if (plugin.onLoad) {
      await plugin.onLoad(context);
    }

    if (plugin.tools) {
      for (const tool of plugin.tools) {
        this.tools.set(tool.id, tool);
        this.toolToPlugin.set(tool.id, plugin.manifest.id);
        console.log(`[PluginSDK] Registered tool: ${tool.name} (${tool.id})`);
      }
    }

  }

  getTool(id: string) {
    return this.tools.get(id);
  }

  getAllTools() {
    return Array.from(this.tools.values());
  }

  getToolContext(toolId: string): PluginContext | undefined {
    const pluginId = this.toolToPlugin.get(toolId);
    if (!pluginId) return undefined;
    return this.getContext(pluginId);
  }
}

export const pluginRegistry = new PluginRegistry();
