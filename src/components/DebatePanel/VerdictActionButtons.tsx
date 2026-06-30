import React from 'react';
import { BarChart3, Play, Download } from 'lucide-react';
import type { DebateSession } from '../../kernel/contracts/debate-types';

interface ExportData {
    topic: string;
    strategy: string;
    status: string;
    maxRounds: number;
    currentRound: number;
    participants: Array<{ id: string; name: string; role: string; model: string | undefined }>;
    arguments: Array<{
        id: string;
        agentId: string;
        content: string;
        round: number;
        timestamp: number;
        confidence: number | undefined;
    }>;
    graphMetrics: Record<string, unknown>;
    interpretation: Record<string, unknown>;
}

interface Props {
    session: DebateSession | null;
    t: (k: string) => string;
    onViewAnalysis: () => void;
    onReplay?: () => void;
}

const VerdictActionButtons: React.FC<Props> = ({ session, t, onViewAnalysis, onReplay }) => {
    if (!session || session.status !== 'completed') return null;

    const handleExport = () => {
        const exportData: ExportData = {
            topic: session.topic,
            strategy: session.strategy,
            status: session.status,
            maxRounds: session.maxRounds,
            currentRound: session.currentRound,
            participants: (session.participants ?? []).map((p) => ({
                id: p.id,
                name: p.name,
                role: p.role,
                model: p.modelId,
            })),
            arguments: (session.arguments ?? []).map((a) => ({
                id: a.id,
                agentId: a.agentId,
                content: a.content,
                round: a.round,
                timestamp: a.timestamp,
                confidence: a.confidence,
            })),
            graphMetrics: (session as unknown as Record<string, unknown>).graphMetrics as Record<
                string,
                unknown
            >,
            interpretation: (session as unknown as Record<string, unknown>)
                .interpretation as Record<string, unknown>,
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `debate-${(session.topic ?? '').slice(0, 50).replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const btnBase: React.CSSProperties = {
        padding: '10px 20px',
        borderRadius: 10,
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
    };

    return (
        <div style={{ display: 'flex', gap: 10, marginTop: '1rem', justifyContent: 'center' }}>
            <button
                onClick={onViewAnalysis}
                style={{
                    ...btnBase,
                    border: '1px solid rgba(59,130,246,0.3)',
                    background: 'rgba(59,130,246,0.1)',
                    color: '#60a5fa',
                }}
            >
                <BarChart3 size={16} /> {t('debate.verdict.view_analysis')}
            </button>
            {onReplay && (
                <button
                    onClick={onReplay}
                    style={{
                        ...btnBase,
                        border: '1px solid rgba(16,185,129,0.3)',
                        background: 'rgba(16,185,129,0.1)',
                        color: '#34d399',
                    }}
                >
                    <Play size={16} /> {t('debate.verdict.replay')}
                </button>
            )}
            <button
                onClick={handleExport}
                style={{
                    ...btnBase,
                    border: '1px solid rgba(139,92,246,0.3)',
                    background: 'rgba(139,92,246,0.1)',
                    color: '#a78bfa',
                }}
            >
                <Download size={16} /> {t('debate.verdict.export')}
            </button>
        </div>
    );
};

export default VerdictActionButtons;
