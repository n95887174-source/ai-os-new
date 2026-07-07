import { readFileSync, writeFileSync } from 'fs';

const files = [
    'src/components/TasksPanel/TasksPanel.test.tsx',
    'src/components/RolesPanel/RolesPanel.test.tsx',
    'src/components/AgentsPanel/AgentsPanel.test.tsx',
    'src/components/SettingsPanel/SettingsPanel.test.tsx',
];

const eventBusEntry = `    eventBus: { emit: vi.fn(), on: vi.fn(() => vi.fn()), off: vi.fn() },`;

for (const filePath of files) {
    let content = readFileSync(filePath, 'utf-8');

    // Check if already has eventBus in instances mock
    const instancesMock = content.match(/vi\.mock\('.*instances'.*\(\)\s*=>\s*\(\{/);
    if (!instancesMock) {
        console.log('SKIP (no instances mock):', filePath);
        continue;
    }

    if (content.includes("eventBus'") || content.includes('eventBus,')) {
        console.log('OK (already has eventBus):', filePath);
        continue;
    }

    // Find the closing }) of the instances mock and add eventBus before it
    // Strategy: find the last key-value pair before `}),`
    const mockEnd = content.match(/},\s*\n\s*\)\s*\n\)/);
    if (mockEnd) {
        const pos = mockEnd.index;
        const before = content.substring(0, pos);
        const after = content.substring(pos);
        // Find the last non-empty line before the closing
        const newContent = before + ',\n' + eventBusEntry + after;
        writeFileSync(filePath, newContent, 'utf-8');
        console.log('FIXED:', filePath);
    } else {
        console.log('FAIL (cannot find mock end):', filePath);
    }
}

// Now fix SettingsPanel specifically for autoSaveInterval
const settingsPath = 'src/components/SettingsPanel/SettingsPanel.test.tsx';
let settingsContent = readFileSync(settingsPath, 'utf-8');

// Check the settings mock - need to add autoSaveInterval
// The settings mock currently has a basic mockSettings object
// Need to add dataManagement settings
const settingsMockEnd = settingsContent.match(/},\s*\n\s*\)\s*\n\)\s*\n\nvi\.mock\('.*security/);
if (settingsMockEnd) {
    // Find where the existing settingsService block ends and add dataManagement
    const dataManagementBlock = `    settingsService: {
        getSettings: vi.fn(() => ({
            ...mockSettings,
            dataManagement: {
                autoSaveInterval: 30000,
                maxHistoryEntries: 1000,
                maxTraceEntries: 500,
                pruneMemoriesAfterDays: 30,
                exportOnShutdown: false,
            },
            telemetryEnabled: true,
            autoUpdateCheck: true,
        })),
        updateSettings: vi.fn(),
        subscribe: vi.fn(() => vi.fn()),
        reset: vi.fn(),
    },`;

    // Replace the existing settingsService mock
    const oldSettingsService = settingsContent.match(
        /settingsService: \{[^}]*?\},\s*\n\s*keyService:/,
    );
    if (oldSettingsService) {
        settingsContent =
            settingsContent.substring(0, oldSettingsService.index) +
            'settingsService: {\n' +
            `        getSettings: vi.fn(() => ({\n` +
            `            ...mockSettings,\n` +
            `            dataManagement: {\n` +
            `                autoSaveInterval: 30000,\n` +
            `                maxHistoryEntries: 1000,\n` +
            `                maxTraceEntries: 500,\n` +
            `                pruneMemoriesAfterDays: 30,\n` +
            `                exportOnShutdown: false,\n` +
            `            },\n` +
            `            telemetryEnabled: true,\n` +
            `            autoUpdateCheck: true,\n` +
            `        })),\n` +
            `        updateSettings: vi.fn(),\n` +
            `        subscribe: vi.fn(() => vi.fn()),\n` +
            `        reset: vi.fn(),\n` +
            `    },\n    keyService:`;
        writeFileSync(settingsPath, settingsContent, 'utf-8');
        console.log('FIXED SettingsPanel with dataManagement config');
    } else {
        console.log('FAIL: could not find settingsService block in SettingsPanel');
    }
} else {
    console.log('FAIL: could not find mock end in SettingsPanel');
}
