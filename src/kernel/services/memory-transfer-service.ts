import type {
    IMemoryTransferService,
    MemoryExport,
    MemoryImport,
    ExportFormat,
} from '../contracts/memory-transfer';

const genId = () => crypto.randomUUID();

export class MemoryTransferService implements IMemoryTransferService {
    private exports: MemoryExport[] = [];
    private imports: MemoryImport[] = [];

    export(format: ExportFormat, sections: string[]): MemoryExport {
        const serialized = sections
            .map((s) => `## ${s}\n- (memory data for section: ${s})\n`)
            .join('\n');
        const header = `# Memory Export\nFormat: ${format}\nGenerated: ${new Date().toISOString()}\nSections: ${sections.join(', ')}\n\n`;
        const data = header + serialized;
        const exportEntry: MemoryExport = {
            format,
            sections,
            data,
            createdAt: Date.now(),
            size: new Blob([data]).size,
        };
        this.exports.push(exportEntry);
        return { ...exportEntry };
    }

    getExportHistory(): MemoryExport[] {
        return [...this.exports];
    }

    async import(data: string, format: ExportFormat): Promise<MemoryImport> {
        await new Promise((r) => setTimeout(r, 800));
        const entryCount = data.split('##').length - 1;
        const importEntry: MemoryImport = {
            id: genId(),
            source: 'import',
            format,
            entriesCount: Math.max(entryCount, 1),
            status: 'completed',
            createdAt: Date.now(),
        };
        this.imports.push(importEntry);
        return { ...importEntry };
    }

    getImportHistory(): MemoryImport[] {
        return [...this.imports];
    }

    previewImport(data: string, _format: ExportFormat): { sections: string[]; entries: number } {
        const sections = ['Episodic Memories', 'Semantic Memories', 'Procedural Memories'];
        return { sections, entries: data.split('##').length };
    }
}
