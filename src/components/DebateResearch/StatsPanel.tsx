import { formatSize } from './project-os-utils';

interface ProjectStats {
    byExt: [string, number][];
    total: number;
    totalSize: number;
    totalLines: number;
    codeFiles: number;
}

interface Props {
    stats: ProjectStats;
}

const StatsPanel: React.FC<Props> = ({ stats }) => (
    <div
        style={{
            padding: '0.5rem 1rem',
            borderBottom: '1px solid rgba(255,255,255,0.03)',
            background: 'rgba(0,0,0,0.15)',
            display: 'flex',
            gap: 14,
            flexWrap: 'wrap',
            fontSize: '0.68rem',
            alignItems: 'center',
        }}
    >
        <div>
            <span style={{ color: '#64748b' }}>Files:</span>{' '}
            <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{stats.total}</span>
        </div>
        <div>
            <span style={{ color: '#64748b' }}>Code:</span>{' '}
            <span style={{ color: '#60a5fa', fontWeight: 700 }}>{stats.codeFiles}</span>
        </div>
        <div>
            <span style={{ color: '#64748b' }}>Lines:</span>{' '}
            <span style={{ color: '#f8fafc', fontWeight: 700 }}>
                {stats.totalLines.toLocaleString()}
            </span>
        </div>
        <div>
            <span style={{ color: '#64748b' }}>Size:</span>{' '}
            <span style={{ color: '#f8fafc', fontWeight: 700 }}>{formatSize(stats.totalSize)}</span>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {stats.byExt.slice(0, 7).map(([ext, count]) => (
                <span
                    key={ext}
                    style={{
                        background: 'rgba(100,116,139,0.15)',
                        padding: '0.1rem 0.3rem',
                        borderRadius: 2,
                        color: '#94a3b8',
                    }}
                >
                    .{ext} {count}
                </span>
            ))}
        </div>
    </div>
);

export default StatsPanel;
