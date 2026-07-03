import type {
    IResearchReportService,
    ResearchReport,
    ReportSection,
    ReportFormat,
} from '../contracts/research-report';

const genId = () => crypto.randomUUID();

const SAMPLE_SECTIONS: Record<string, { title: string; content: string }[]> = {
    'AI Safety': [
        {
            title: 'Executive Summary',
            content:
                'This report examines the current state of AI safety research, focusing on alignment, robustness, and governance frameworks.',
        },
        {
            title: 'Introduction',
            content:
                'AI safety has emerged as one of the most critical research areas in artificial intelligence. As AI systems become more capable, ensuring they behave as intended becomes paramount.',
        },
        {
            title: 'Alignment Research',
            content:
                'Current alignment techniques include RLHF, constitutional AI, and debate-based training. Each approach has trade-offs between effectiveness and scalability.',
        },
        {
            title: 'Robustness',
            content:
                'Robustness research focuses on ensuring AI systems perform reliably across distribution shifts, adversarial inputs, and novel scenarios.',
        },
        {
            title: 'Governance',
            content:
                'International cooperation on AI safety standards is growing, with major frameworks proposed by the EU, US, and UN.',
        },
        {
            title: 'Conclusions',
            content:
                'While significant progress has been made, substantial gaps remain in our understanding of how to build reliably safe AI systems.',
        },
    ],
    'Multi-Agent Systems': [
        {
            title: 'Executive Summary',
            content:
                'Multi-agent systems represent a paradigm shift in AI architecture, enabling complex problem-solving through specialized agent collaboration.',
        },
        {
            title: 'Architecture Overview',
            content:
                'Modern multi-agent systems employ specialized agents with distinct roles, communication protocols, and coordination mechanisms.',
        },
        {
            title: 'Communication Patterns',
            content:
                'Agents communicate through structured protocols including broadcast, targeted messaging, and shared memory spaces.',
        },
        {
            title: 'Coordination Strategies',
            content:
                'Strategies range from hierarchical control to fully decentralized consensus mechanisms.',
        },
        {
            title: 'Case Studies',
            content:
                'Real-world deployments show 40-60% improvement in complex task completion over single-agent approaches.',
        },
        {
            title: 'Future Directions',
            content:
                'Emerging research focuses on emergent behavior, self-organizing agent societies, and human-AI teams.',
        },
    ],
};

const DEFAULT_CONTENT =
    'This report section contains analysis and findings related to the research topic.';

export class ResearchReportService implements IResearchReportService {
    private reports: ResearchReport[] = [
        {
            id: genId(),
            title: 'AI Safety Landscape 2026',
            topic: 'AI Safety',
            format: 'markdown',
            content:
                '# AI Safety Landscape 2026\n\nComprehensive analysis of current AI safety research.',
            status: 'ready',
            sections: (SAMPLE_SECTIONS['AI Safety'] || []).map((s) => ({
                id: genId(),
                title: s.title,
                content: s.content,
                wordCount: s.content.split(' ').length,
                status: 'written' as const,
            })),
            sources: 24,
            tokens: 12400,
            createdAt: Date.now() - 86400000 * 5,
            completedAt: Date.now() - 86400000 * 4,
        },
        {
            id: genId(),
            title: 'Multi-Agent Systems Review',
            topic: 'Multi-Agent Systems',
            format: 'markdown',
            content:
                '# Multi-Agent Systems Review\n\nAnalysis of agent coordination architectures.',
            status: 'ready',
            sections: (SAMPLE_SECTIONS['Multi-Agent Systems'] || []).map((s) => ({
                id: genId(),
                title: s.title,
                content: s.content,
                wordCount: s.content.split(' ').length,
                status: 'written' as const,
            })),
            sources: 18,
            tokens: 9800,
            createdAt: Date.now() - 86400000 * 2,
            completedAt: Date.now() - 86400000,
        },
    ];

    getReports(): ResearchReport[] {
        return [...this.reports];
    }

    getReport(id: string): ResearchReport | undefined {
        return this.reports.find((r) => r.id === id);
    }

    createReport(title: string, topic: string, format: ReportFormat): ResearchReport {
        const sections = SAMPLE_SECTIONS[topic] || [
            { title: 'Executive Summary', content: DEFAULT_CONTENT },
            { title: 'Introduction', content: DEFAULT_CONTENT },
            { title: 'Analysis', content: DEFAULT_CONTENT },
        ];
        const report: ResearchReport = {
            id: genId(),
            title,
            topic,
            format,
            content: `# ${title}\n\n_Generated research report._`,
            status: 'draft',
            sections: sections.map((s) => ({
                id: genId(),
                title: s.title,
                content: '',
                wordCount: 0,
                status: 'pending' as const,
            })),
            sources: 0,
            tokens: 0,
            createdAt: Date.now(),
        };
        this.reports.push(report);
        return report;
    }

    async generateReport(id: string): Promise<ResearchReport> {
        const report = this.reports.find((r) => r.id === id);
        if (!report) throw new Error(`Report ${id} not found`);
        report.status = 'generating';
        for (const section of report.sections) {
            await new Promise((r) => setTimeout(r, 500));
            const sample = SAMPLE_SECTIONS[report.topic]?.find((s) => s.title === section.title);
            section.content =
                sample?.content || `${section.title}: Analysis and findings for "${report.topic}".`;
            section.wordCount = section.content.split(' ').length;
            section.status = 'written';
        }
        report.content = report.sections.map((s) => `## ${s.title}\n\n${s.content}`).join('\n\n');
        report.status = 'ready';
        report.sources = Math.floor(Math.random() * 20) + 5;
        report.tokens = report.content.split(' ').length * 1.3;
        report.completedAt = Date.now();
        return { ...report };
    }

    deleteReport(id: string): void {
        this.reports = this.reports.filter((r) => r.id !== id);
    }
}
