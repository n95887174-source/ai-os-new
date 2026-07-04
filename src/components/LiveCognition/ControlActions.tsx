import { Activity } from 'lucide-react';

interface Props {
    onInitializeRequest: () => void;
    onReloadRuntime: () => void;
    onManualRoute: () => void;
    onClearLogs: () => void;
    onCheckAllHealth: () => void;
}

const btnPrimary: React.CSSProperties = {
    padding: '0.75rem',
    fontSize: '0.8rem',
    borderRadius: 10,
    background: 'linear-gradient(90deg, #3b82f6, #2563eb)',
    border: 'none',
    color: 'white',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 0.2s',
};

const btnSecondary: React.CSSProperties = {
    padding: '0.75rem',
    fontSize: '0.8rem',
    borderRadius: 10,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#e2e8f0',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 0.2s',
};

const ControlActions: React.FC<Props> = ({
    onInitializeRequest,
    onReloadRuntime,
    onManualRoute,
    onClearLogs,
    onCheckAllHealth,
}) => (
    <div
        style={{
            padding: '1.5rem',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(255,255,255,0.02)',
            backdropFilter: 'blur(10px)',
        }}
    >
        <h3
            style={{
                fontSize: '1rem',
                fontWeight: 700,
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
            }}
        >
            <Activity size={18} color="#3b82f6" aria-hidden="true" /> Control Plane Actions
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <button
                onClick={onInitializeRequest}
                style={btnPrimary}
                aria-label="Initialize a test request"
            >
                Initialize Request
            </button>
            <button
                onClick={onReloadRuntime}
                style={btnSecondary}
                aria-label="Reload runtime configuration"
            >
                Reload Runtime
            </button>
            <button
                onClick={onManualRoute}
                style={btnSecondary}
                aria-label="Manually trigger routing"
            >
                Manual Routing
            </button>
            <button onClick={onClearLogs} style={btnSecondary} aria-label="Clear event logs">
                Clear Logs
            </button>
        </div>
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.75rem',
                marginTop: '0.75rem',
            }}
        >
            <button
                onClick={onCheckAllHealth}
                style={btnSecondary}
                aria-label="Check health of all providers"
            >
                Check All Providers
            </button>
        </div>
    </div>
);

export default ControlActions;
