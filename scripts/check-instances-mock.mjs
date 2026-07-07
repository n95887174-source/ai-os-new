import { readFileSync } from 'fs';

const files = [
    'src/components/SettingsPanel/SettingsPanel.test.tsx',
    'src/components/DebatePanel/DebatePanel.test.tsx',
    'src/components/AlertLayer/AlertLayer.test.tsx',
    'src/components/TracesPanel/TracesPanel.test.tsx',
    'src/components/ToolsPanel/ToolsPanel.test.tsx',
    'src/components/TasksPanel/TasksPanel.test.tsx',
    'src/components/SkillsPanel/SkillsPanel.test.tsx',
    'src/components/RoutingIntelligence/RoutingIntelligence.test.tsx',
    'src/components/RolesPanel/RolesPanel.test.tsx',
    'src/components/ProviderManager/ProviderManager.test.tsx',
    'src/components/KnowledgePanel/KnowledgePanel.test.tsx',
    'src/components/HealthPanel/HealthPanel.test.tsx',
    'src/components/DashboardPanel/DashboardPanel.test.tsx',
    'src/components/ChatPanel/ChatPanel.test.tsx',
    'src/components/BuilderPanel/CognitiveBuilder.test.tsx',
    'src/components/AgentsPanel/AgentsPanel.test.tsx',
    'src/components/MemoryPanel/MemoryPanel.test.tsx',
    'src/components/PoolStatusPanel/PoolStatusPanel.test.tsx',
];

for (const f of files) {
    const content = readFileSync(f, 'utf-8');
    // Find the instances mock block
    const mockMatch = content.match(
        /vi\.mock\('.*instances.*,\s*\(\)\s*=>\s*\(\{([\s\S]*?)\}\),\s*\n\)/,
    );
    if (mockMatch) {
        const mockBody = mockMatch[1];
        const hasEventBus = mockBody.includes('eventBus') || mockBody.includes('event_bus');
        if (hasEventBus) {
            console.log('OK    -', f);
        } else {
            console.log('MISS  -', f);
        }
    } else {
        console.log('SKIP  -', f + ' (cannot parse instances mock)');
    }
}
