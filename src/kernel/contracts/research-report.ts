export type ReportFormat = 'markdown' | 'html' | 'pdf' | 'json';
export type ReportStatus = 'draft' | 'generating' | 'ready' | 'error';

export interface ResearchReport {
    id: string;
    title: string;
    topic: string;
    format: ReportFormat;
    content: string;
    status: ReportStatus;
    sections: ReportSection[];
    sources: number;
    tokens: number;
    createdAt: number;
    completedAt?: number;
}

export interface ReportSection {
    id: string;
    title: string;
    content: string;
    wordCount: number;
    status: 'pending' | 'written' | 'error';
}

export interface IResearchReportService {
    getReports(): ResearchReport[];
    getReport(id: string): ResearchReport | undefined;
    createReport(title: string, topic: string, format: ReportFormat): ResearchReport;
    generateReport(id: string): Promise<ResearchReport>;
    deleteReport(id: string): void;
}
