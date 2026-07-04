
export const ScoreRow: React.FC<{ label: string; value: number }> = ({ label, value }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem' }}>
        <span style={{ color: '#94a3b8', minWidth: 60 }}>{label}</span>
        <div
            style={{
                flex: 1,
                height: 4,
                background: 'rgba(255,255,255,0.1)',
                borderRadius: 2,
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    height: '100%',
                    width: `${value * 100}%`,
                    background: value > 0.7 ? '#10b981' : value > 0.4 ? '#f59e0b' : '#ef4444',
                }}
            />
        </div>
        <span style={{ color: '#cbd5e1', minWidth: 30, textAlign: 'right' }}>
            {(value * 100).toFixed(0)}%
        </span>
    </div>
);
