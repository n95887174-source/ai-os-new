import { readFileSync, writeFileSync, existsSync } from 'fs';

const FILES = [
    // === KERNEL ===
    'src/kernel/bootstrap.ts',
    'src/kernel/kernel.ts',
    'src/kernel/services/memory-engine.ts',
    'src/kernel/services/database-service.ts',
    'src/kernel/services/prompt-store.ts',
    'src/kernel/services/orchestration-service.ts',
    'src/kernel/services/storage-adapter.ts',
    'src/kernel/services/config-history.ts',
    'src/kernel/services/cross-tab-state.ts',
    'src/kernel/services/role-service.ts',
    'src/kernel/services/agent-service.ts',
    'src/kernel/services/tool-executor.ts',
    'src/kernel/services/sandbox-service.ts',
    'src/kernel/services/settings-service.ts',
    'src/kernel/services/message-index-service.ts',
    'src/kernel/services/snapshot-service.ts',
    'src/kernel/services/skill-service.ts',
    'src/kernel/services/role-version-service.ts',
    'src/kernel/services/research-scheduler.ts',
    'src/kernel/services/key-intelligence-pipeline.ts',
    'src/kernel/services/debate-runtime/debate-session-persistence.ts',
    'src/kernel/services/debate-runtime/debate-engine.ts',
    'src/kernel/services/debate-runtime/debate-conclusion-engine.ts',
    'src/kernel/services/debate-runtime/debate-strategy-registry.ts',
    'src/kernel/services/debate-runtime/debate-mode-manager.ts',
    'src/kernel/services/debate-runtime/debate-policy-engine.ts',
    'src/kernel/services/debate-runtime/debate-mode-system.ts',
    'src/kernel/services/agent-wizard-service.ts',
    'src/kernel/services/agent-generator.ts',
    'src/kernel/services/advisor/insight-engine.ts',
    'src/kernel/services/event-sourcing/event-recorder.ts',
    'src/kernel/services/event-sourcing/checkpoint-store.ts',
    'src/kernel/services/elo/elo-service.ts',
    'src/kernel/services/key-management/key-registry.ts',
    'src/kernel/services/storage/dexie-storage.ts',
    // === COMPONENTS ===
    'src/components/DecisionLogPanel.tsx',
    'src/components/DebatePanel/DebateStrategyBuilder.tsx',
    'src/components/ChatAdminPanel/ChatAdminPanel.tsx',
    'src/components/AddKeyModal/AddKeyModal.tsx',
    'src/components/Sidebar.tsx',
    'src/components/CommandPalette/CommandPalette.tsx',
    'src/components/EventsTimeline/EventsTimeline.tsx',
    'src/components/ConnectorsPanel/ConnectorsPanel.tsx',
    'src/components/BookmarksPanel.tsx',
    'src/components/AgentJournalPanel.tsx',
    'src/components/ProviderManager/ProviderManagerContainer.tsx',
    'src/components/ProviderManager/commands.ts',
    'src/components/ChatExportPanel.tsx',
    'src/components/ToolsPanel/ToolsPanel.tsx',
    // === STORES ===
    'src/stores/useKeyStore.ts',
    'src/stores/chat/hydration.ts',
    'src/stores/debateLiveStore.ts',
    'src/stores/debate-session-store/index.ts',
    // === HOOKS ===
    'src/hooks/useBookmarkShortcut.ts',
    // === LLM ===
    'src/llm/gemini/gemini-request-builder.ts',
    'src/llm/http/sse-parser.ts',
];

const IMPORT_PATH = '../utils/safe-json';
const IMPORT_LINE = `import { safeJsonParse } from '${IMPORT_PATH}';`;

function getImportPath(filePath) {
    const dir =
        filePath.lastIndexOf('/') >= 0 ? filePath.substring(0, filePath.lastIndexOf('/')) : '';
    const parts = dir.split('/');
    const srcIndex = parts.indexOf('src');
    const afterSrc = parts.slice(srcIndex + 1);
    const upLevels = afterSrc.length;
    const prefix = upLevels === 0 ? './' : '../'.repeat(upLevels);
    return `${prefix}kernel/utils/safe-json`;
}

function processFile(filePath) {
    if (!existsSync(filePath)) {
        console.log(`SKIP (not found): ${filePath}`);
        return;
    }

    let content = readFileSync(filePath, 'utf-8');
    let modified = false;

    // Skip JSON.parse(JSON.stringify(...)) patterns
    // These are safe deep-clone operations
    const deepCloneRegex = /JSON\.parse\(JSON\.stringify\(/;
    if (deepCloneRegex.test(content)) {
        // Check if the only JSON.parse calls are deep clones
        const allParses = content.match(/JSON\.parse\(/g) || [];
        const deepClones = content.match(/JSON\.parse\(JSON\.stringify\(/g) || [];
        if (allParses.length === deepClones.length) {
            console.log(`SKIP (all deep-clone): ${filePath}`);
            return;
        }
    }

    // Add import if not present and file has JSON.parse calls
    if (content.includes('JSON.parse(') && !content.includes('safeJsonParse')) {
        // Find the last import line
        const importMatch = content.match(/^import .+ from .+;$/gm);
        if (importMatch) {
            const lastImport = importMatch[importMatch.length - 1];
            const importPath = getImportPath(filePath);
            const newImport = `import { safeJsonParse } from '${importPath}';`;
            content = content.replace(lastImport, lastImport + '\n' + newImport);
        } else {
            // No imports found, add at top
            const importPath = getImportPath(filePath);
            content = `import { safeJsonParse } from '${importPath}';\n` + content;
        }
        modified = true;
    }

    // Replace JSON.parse(JSON.stringify(...)) - leave as is (deep clone)
    // Replace other JSON.parse( calls
    const lines = content.split('\n');
    const newLines = [];
    let replaced = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Skip lines that are part of safe-json.ts itself
        if (filePath.includes('safe-json.ts') && line.includes('export function safeJsonParse')) {
            newLines.push(line);
            continue;
        }
        if (
            filePath.includes('safe-json.ts') &&
            line.includes('return JSON.parse(json, REVIVER)')
        ) {
            newLines.push(line);
            continue;
        }

        // Replace JSON.parse(JSON.stringify(...)) - leave as is
        if (line.includes('JSON.parse(JSON.stringify(')) {
            newLines.push(line);
            continue;
        }

        // Replace simple JSON.parse( with safeJsonParse(
        if (line.includes('JSON.parse(')) {
            // Check if already in safeJsonParse
            if (line.includes('safeJsonParse')) {
                newLines.push(line);
                continue;
            }
            const newLine = line.replace(/JSON\.parse\(/g, 'safeJsonParse(');
            if (newLine !== line) {
                console.log(`  L${i + 1}: ${line.trim()} -> ${newLine.trim()}`);
                replaced = true;
            }
            newLines.push(newLine);
        } else {
            newLines.push(line);
        }
    }

    if (replaced || modified) {
        writeFileSync(filePath, newLines.join('\n'), 'utf-8');
        console.log(`OK: ${filePath}`);
    } else {
        console.log(`UNCHANGED: ${filePath}`);
    }
}

for (const f of FILES) {
    processFile(f);
}
