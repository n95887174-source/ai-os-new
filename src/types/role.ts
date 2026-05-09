export interface Role {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  baseTemperature: number;
  icon?: string;
  capabilities: string[]; // List of tool IDs
  metadata: {
    category: 'creative' | 'technical' | 'analytical' | 'management';
    created: number;
    updated: number;
  };
}
