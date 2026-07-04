import { MessageSquare, Clock, Swords, Brain, ThumbsUp, Eye } from 'lucide-react';
import {
    debateTabBar,
    debateTabButton,
    debateHistoryCountBadge,
    debateReturnActiveBtn,
} from '../../styles/common';

interface Props {
    viewTab: string;
    setViewTab: (tab: string) => void;
    historyLength: number;
    sessionStatus: string | undefined;
    refreshHistory: () => void;
}

export const TabBarSection: React.FC<Props> = ({
    viewTab,
    setViewTab,
    historyLength,
    sessionStatus,
    refreshHistory,
}) => {
    const tabStyle = (tab: string, color: string): React.CSSProperties => ({
        ...debateTabButton,
        background: viewTab === tab ? `${color}26` : 'transparent',
        color: viewTab === tab ? color : '#64748b',
    });

    return (
        <div style={debateTabBar}>
            <button
                onClick={() => setViewTab('active')}
                className={`debate-tab ${viewTab === 'active' ? 'active' : ''}`}
                style={tabStyle('active', '#a855f7')}
            >
                <MessageSquare size={16} /> Active
            </button>
            <button
                onClick={() => {
                    setViewTab('history');
                    refreshHistory();
                }}
                className={`debate-tab ${viewTab === 'history' ? 'active' : ''}`}
                style={tabStyle('history', '#3b82f6')}
            >
                <Clock size={16} /> History{' '}
                {historyLength > 0 && <span style={debateHistoryCountBadge}>{historyLength}</span>}
            </button>
            <button
                onClick={() => setViewTab('tournament')}
                className={`debate-tab ${viewTab === 'tournament' ? 'active' : ''}`}
                style={tabStyle('tournament', '#ef4444')}
            >
                <Swords size={16} /> Tournament
            </button>
            <button
                onClick={() => setViewTab('memory')}
                className={`debate-tab ${viewTab === 'memory' ? 'active' : ''}`}
                style={tabStyle('memory', '#8b5cf6')}
            >
                <Brain size={16} /> Memory
            </button>
            {sessionStatus === 'completed' && (
                <button
                    onClick={() => setViewTab('verdict')}
                    className={`debate-tab ${viewTab === 'verdict' ? 'active' : ''}`}
                    style={tabStyle('verdict', '#10b981')}
                >
                    <ThumbsUp size={16} /> Verdict
                </button>
            )}
            {(viewTab === 'history' || viewTab === 'verdict' || viewTab === 'memory') && (
                <button onClick={() => setViewTab('active')} style={debateReturnActiveBtn}>
                    <Eye size={16} /> Return to Active
                </button>
            )}
        </div>
    );
};
