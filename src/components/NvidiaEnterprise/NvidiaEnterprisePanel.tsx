import { useState } from 'react';
import {
    Shield,
    CheckCircle2,
    XCircle,
    Clock,
    DollarSign,
    Globe,
    Server,
    Activity,
    Cpu,
    Settings,
} from 'lucide-react';
import { nvidiaEnterpriseService, providerAchievementService } from '../../kernel/instances';
import { AchievementList } from '../ProviderManager/AchievementList';
import type {
    NvidiaEnterpriseConfig,
    ComplianceStatus,
    SLARecord,
    RegionStatus,
    EnterpriseFeature,
} from '../../kernel/contracts/nvidia-enterprise';

const COMPLIANCE_COLORS: Record<string, string> = {
    SOC2: '#3b82f6',
    HIPAA: '#ef4444',
    GDPR: '#10b981',
    ISO27001: '#f59e0b',
    PCI_DSS: '#8b5cf6',
};

const CATEGORY_COLORS: Record<string, string> = {
    security: '#3b82f6',
    compliance: '#10b981',
    performance: '#f59e0b',
    management: '#8b5cf6',
};

function ComplianceCard({ c }: { c: ComplianceStatus }) {
    return (
        <div
            style={{
                background: 'rgba(0,0,0,0.02)',
                borderRadius: 8,
                padding: 12,
                border: `1px solid ${c.certified ? 'rgba(16,185,129,0.2)' : 'rgba(0,0,0,0.06)'}`,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span
                    style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: `${COMPLIANCE_COLORS[c.standard] ?? '#666'}22`,
                        color: COMPLIANCE_COLORS[c.standard] ?? '#666',
                    }}
                >
                    {c.standard}
                </span>
                {c.certified ? (
                    <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                ) : (
                    <XCircle size={16} style={{ color: '#ef4444', opacity: 0.5 }} />
                )}
            </div>
            <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                {c.certified
                    ? `Certified · Expires ${new Date(c.expiresAt ?? 0).toLocaleDateString()}`
                    : 'Not certified'}
            </div>
        </div>
    );
}

function SLATable({ records }: { records: SLARecord[] }) {
    return (
        <div style={{ overflowX: 'auto', fontSize: '0.8rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ opacity: 0.5 }}>
                        <th style={thStyle}>Period</th>
                        <th style={thStyle}>Uptime</th>
                        <th style={thStyle}>p50</th>
                        <th style={thStyle}>p95</th>
                        <th style={thStyle}>p99</th>
                        <th style={thStyle}>Requests</th>
                        <th style={thStyle}>Errors</th>
                    </tr>
                </thead>
                <tbody>
                    {[...records].reverse().map((r) => (
                        <tr key={r.period} style={{ borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                            <td style={tdStyle}>{r.period}</td>
                            <td style={tdStyle}>
                                <span
                                    style={{
                                        color:
                                            r.uptime >= 99.99
                                                ? '#10b981'
                                                : r.uptime >= 99.95
                                                  ? '#f59e0b'
                                                  : '#ef4444',
                                    }}
                                >
                                    {r.uptime}%
                                </span>
                            </td>
                            <td style={tdStyle}>{r.p50Latency}ms</td>
                            <td style={tdStyle}>{r.p95Latency}ms</td>
                            <td style={tdStyle}>{r.p99Latency}ms</td>
                            <td style={tdStyle}>{(r.totalRequests / 1000).toFixed(1)}k</td>
                            <td style={tdStyle}>
                                <span style={{ color: r.errorRate > 0.03 ? '#ef4444' : '#10b981' }}>
                                    {r.errorRate}%
                                </span>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function RegionCard({ r }: { r: RegionStatus }) {
    return (
        <div
            style={{
                background: 'rgba(0,0,0,0.02)',
                borderRadius: 8,
                padding: 12,
                opacity: r.available ? 1 : 0.4,
                border: `1px solid ${r.available ? 'rgba(16,185,129,0.15)' : 'rgba(0,0,0,0.06)'}`,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Globe size={16} style={{ color: '#3b82f6' }} />
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{r.name}</span>
                {r.available ? (
                    <span
                        style={{
                            fontSize: '0.7rem',
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: 'rgba(16,185,129,0.12)',
                            color: '#10b981',
                        }}
                    >
                        Active
                    </span>
                ) : (
                    <span
                        style={{
                            fontSize: '0.7rem',
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: 'rgba(239,68,68,0.12)',
                            color: '#ef4444',
                        }}
                    >
                        Down
                    </span>
                )}
            </div>
            {r.available && (
                <>
                    <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>Latency: {r.latency}ms</div>
                    <div style={{ fontSize: '0.75rem', opacity: 0.5, marginTop: 4 }}>
                        {r.models.join(', ')}
                    </div>
                </>
            )}
        </div>
    );
}

function FeatureRow({
    f,
    onToggle,
}: {
    f: EnterpriseFeature;
    onToggle: (id: string, enabled: boolean) => void;
}) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 12px',
                borderRadius: 8,
                background: 'rgba(0,0,0,0.02)',
            }}
        >
            <span
                style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: CATEGORY_COLORS[f.category] ?? '#666',
                    flexShrink: 0,
                }}
            />
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{f.name}</div>
                <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>{f.description}</div>
            </div>
            <span
                style={{ fontSize: '0.7rem', opacity: 0.5, textTransform: 'uppercase', width: 80 }}
            >
                {f.category}
            </span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8rem' }}>
                <input
                    type="checkbox"
                    checked={f.enabled}
                    onChange={(e) => onToggle(f.id, e.target.checked)}
                />
                {f.enabled ? 'On' : 'Off'}
            </label>
        </div>
    );
}

const thStyle: React.CSSProperties = {
    textAlign: 'left',
    padding: '8px 12px',
    fontWeight: 600,
    fontSize: '0.75rem',
    whiteSpace: 'nowrap',
};
const tdStyle: React.CSSProperties = {
    padding: '8px 12px',
    whiteSpace: 'nowrap',
};

const DEMO_BANNER: React.CSSProperties = {
    background: 'linear-gradient(135deg, #fef3cd, #fbbf24)',
    color: '#78350f',
    padding: '12px 16px',
    borderRadius: 8,
    marginBottom: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontWeight: 600,
    fontSize: 14,
};

export default function NvidiaEnterprisePanel() {
    const [config, setConfig] = useState<NvidiaEnterpriseConfig>(() =>
        nvidiaEnterpriseService.getConfig(),
    );
    const [compliance, setCompliance] = useState<ComplianceStatus[]>(() =>
        nvidiaEnterpriseService.getCompliance(),
    );
    const [slaRecords, setSlaRecords] = useState<SLARecord[]>(() =>
        nvidiaEnterpriseService.getSLAHistory(),
    );
    const [regions, setRegions] = useState<RegionStatus[]>(() =>
        nvidiaEnterpriseService.getRegions(),
    );
    const [features, setFeatures] = useState<EnterpriseFeature[]>(() =>
        nvidiaEnterpriseService.getFeatures(),
    );
    const [costs, setCosts] = useState<
        { model: string; costPer1k: number; usage: number; total: number }[]
    >(() => nvidiaEnterpriseService.getEstimatedCosts());
    const [tab, setTab] = useState<
        'overview' | 'compliance' | 'sla' | 'regions' | 'features' | 'costs' | 'achievements'
    >('overview');

    const refresh = () => {
        setConfig(nvidiaEnterpriseService.getConfig());
        setCompliance(nvidiaEnterpriseService.getCompliance());
        setSlaRecords(nvidiaEnterpriseService.getSLAHistory());
        setRegions(nvidiaEnterpriseService.getRegions());
        setFeatures(nvidiaEnterpriseService.getFeatures());
        setCosts(nvidiaEnterpriseService.getEstimatedCosts());
    };

    const handleToggleFeature = (id: string, enabled: boolean) => {
        nvidiaEnterpriseService.toggleFeature(id, enabled);
        refresh();
    };

    const handleConfigChange = (updates: Partial<NvidiaEnterpriseConfig>) => {
        nvidiaEnterpriseService.updateConfig(updates);
        refresh();
    };

    const tabs = [
        { key: 'overview', label: 'Overview', icon: <Cpu size={16} /> },
        { key: 'compliance', label: 'Compliance', icon: <Shield size={16} /> },
        { key: 'sla', label: 'SLA History', icon: <Activity size={16} /> },
        { key: 'regions', label: 'Regions', icon: <Globe size={16} /> },
        { key: 'features', label: 'Features', icon: <Settings size={16} /> },
        { key: 'costs', label: 'Cost Analytics', icon: <DollarSign size={16} /> },
        { key: 'achievements', label: 'Achievements', icon: <Cpu size={16} /> },
    ] as const;

    const lastSla = slaRecords[slaRecords.length - 1];
    const avgLatency = slaRecords.reduce((s, r) => s + r.p50Latency, 0) / slaRecords.length;

    return (
        <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
            <div style={DEMO_BANNER}>
                ⚠️ DEMO DATA — Not connected to NVIDIA Enterprise API. Real data requires an NGC API
                key and separate auth flow.
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <Cpu size={24} style={{ color: '#76b900' }} />
                <div>
                    <h2 style={{ margin: 0 }}>NVIDIA Enterprise Dashboard</h2>
                    <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>
                        Compliance · SLA · Regions · Features · Costs
                    </div>
                </div>
            </div>

            {/* Stat Cards */}
            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 12,
                    marginBottom: 20,
                }}
            >
                <StatCard
                    icon={<Shield size={18} />}
                    label="Compliance"
                    value={`${compliance.filter((c) => c.certified).length}/${compliance.length}`}
                    color="#10b981"
                />
                <StatCard
                    icon={<Activity size={18} />}
                    label="Uptime (7d avg)"
                    value={`${lastSla ? slaRecords.reduce((s, r) => s + r.uptime, 0) / slaRecords.length : 0}%`}
                    color="#3b82f6"
                />
                <StatCard
                    icon={<Clock size={18} />}
                    label="Avg Latency"
                    value={`${Math.round(avgLatency)}ms`}
                    color="#f59e0b"
                />
                <StatCard
                    icon={<Globe size={18} />}
                    label="Active Regions"
                    value={`${regions.filter((r) => r.available).length}/${regions.length}`}
                    color="#8b5cf6"
                />
                <StatCard
                    icon={<DollarSign size={18} />}
                    label="Est. Monthly"
                    value={`$${costs.reduce((s, c) => s + c.total, 0).toFixed(2)}`}
                    color="#ef4444"
                />
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
                {tabs.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 14px',
                            borderRadius: 8,
                            border: 'none',
                            background: tab === t.key ? 'rgba(118,185,0,0.12)' : 'transparent',
                            color: tab === t.key ? '#76b900' : 'inherit',
                            fontWeight: tab === t.key ? 600 : 400,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                        }}
                    >
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {tab === 'overview' && (
                <div style={{ display: 'grid', gap: 16 }}>
                    <div
                        style={{
                            background: 'rgba(118,185,0,0.04)',
                            border: '1px solid rgba(118,185,0,0.12)',
                            borderRadius: 12,
                            padding: 16,
                        }}
                    >
                        <h3 style={{ margin: '0 0 8px', fontSize: '0.95rem' }}>
                            Enterprise Config
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <label style={{ fontSize: '0.85rem' }}>
                                Default Region
                                <select
                                    value={config.defaultRegion}
                                    onChange={(e) =>
                                        handleConfigChange({ defaultRegion: e.target.value })
                                    }
                                    style={inputStyle}
                                >
                                    {regions.map((r) => (
                                        <option
                                            key={r.region}
                                            value={r.region}
                                            disabled={!r.available}
                                        >
                                            {r.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label style={{ fontSize: '0.85rem' }}>
                                SLA Target (%)
                                <input
                                    type="number"
                                    value={config.slaTarget}
                                    onChange={(e) =>
                                        handleConfigChange({ slaTarget: Number(e.target.value) })
                                    }
                                    style={inputStyle}
                                    step={0.1}
                                />
                            </label>
                            <label style={{ fontSize: '0.85rem' }}>
                                Budget Alert ($)
                                <input
                                    type="number"
                                    value={config.budgetAlert}
                                    onChange={(e) =>
                                        handleConfigChange({ budgetAlert: Number(e.target.value) })
                                    }
                                    style={inputStyle}
                                />
                            </label>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-end',
                                    gap: 16,
                                    paddingBottom: 6,
                                }}
                            >
                                <label
                                    style={{
                                        fontSize: '0.85rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={config.enableCompliance}
                                        onChange={(e) =>
                                            handleConfigChange({
                                                enableCompliance: e.target.checked,
                                            })
                                        }
                                    />
                                    Compliance
                                </label>
                                <label
                                    style={{
                                        fontSize: '0.85rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={config.costOptimization}
                                        onChange={(e) =>
                                            handleConfigChange({
                                                costOptimization: e.target.checked,
                                            })
                                        }
                                    />
                                    Cost Opt.
                                </label>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div
                            style={{
                                background: 'rgba(16,185,129,0.04)',
                                border: '1px solid rgba(16,185,129,0.12)',
                                borderRadius: 12,
                                padding: 16,
                            }}
                        >
                            <h3
                                style={{
                                    margin: '0 0 12px',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                }}
                            >
                                <Shield size={16} /> Compliance Summary
                            </h3>
                            <div
                                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}
                            >
                                {compliance.map((c) => (
                                    <ComplianceCard key={c.standard} c={c} />
                                ))}
                            </div>
                        </div>

                        <div
                            style={{
                                background: 'rgba(245,158,11,0.04)',
                                border: '1px solid rgba(245,158,11,0.12)',
                                borderRadius: 12,
                                padding: 16,
                            }}
                        >
                            <h3
                                style={{
                                    margin: '0 0 12px',
                                    fontSize: '0.9rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                }}
                            >
                                <Server size={16} /> Active Regions
                            </h3>
                            {regions
                                .filter((r) => r.available)
                                .slice(0, 3)
                                .map((r) => (
                                    <RegionCard key={r.region} r={r} />
                                ))}
                            <div
                                style={{
                                    marginTop: 8,
                                    fontSize: '0.8rem',
                                    opacity: 0.5,
                                    textAlign: 'center',
                                }}
                            >
                                {regions.filter((r) => r.available).length} of {regions.length}{' '}
                                regions active
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {tab === 'compliance' && (
                <div
                    style={{
                        background: 'rgba(16,185,129,0.04)',
                        border: '1px solid rgba(16,185,129,0.12)',
                        borderRadius: 12,
                        padding: 16,
                    }}
                >
                    <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem' }}>
                        Compliance Certifications
                    </h3>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                            gap: 12,
                        }}
                    >
                        {compliance.map((c) => (
                            <ComplianceCard key={c.standard} c={c} />
                        ))}
                    </div>
                </div>
            )}

            {tab === 'sla' && (
                <div
                    style={{
                        background: 'rgba(59,130,246,0.04)',
                        border: '1px solid rgba(59,130,246,0.12)',
                        borderRadius: 12,
                        padding: 16,
                    }}
                >
                    <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem' }}>
                        SLA History (7 days)
                    </h3>
                    <SLATable records={slaRecords} />
                </div>
            )}

            {tab === 'regions' && (
                <div
                    style={{
                        background: 'rgba(139,92,246,0.04)',
                        border: '1px solid rgba(139,92,246,0.12)',
                        borderRadius: 12,
                        padding: 16,
                    }}
                >
                    <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem' }}>Global Regions</h3>
                    <div
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                            gap: 12,
                        }}
                    >
                        {regions.map((r) => (
                            <RegionCard key={r.region} r={r} />
                        ))}
                    </div>
                </div>
            )}

            {tab === 'features' && (
                <div
                    style={{
                        background: 'rgba(139,92,246,0.04)',
                        border: '1px solid rgba(139,92,246,0.12)',
                        borderRadius: 12,
                        padding: 16,
                    }}
                >
                    <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem' }}>Enterprise Features</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {features.map((f) => (
                            <FeatureRow key={f.id} f={f} onToggle={handleToggleFeature} />
                        ))}
                    </div>
                </div>
            )}

            {tab === 'costs' && (
                <div
                    style={{
                        background: 'rgba(239,68,68,0.04)',
                        border: '1px solid rgba(239,68,68,0.12)',
                        borderRadius: 12,
                        padding: 16,
                    }}
                >
                    <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem' }}>
                        Cost Analytics — Last 30 Days
                    </h3>
                    <div style={{ display: 'grid', gap: 8 }}>
                        {costs.map((c) => {
                            const maxTotal = Math.max(...costs.map((x) => x.total));
                            return (
                                <div key={c.model}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: '0.85rem',
                                            marginBottom: 4,
                                        }}
                                    >
                                        <span style={{ fontWeight: 600 }}>{c.model}</span>
                                        <span>${c.total.toFixed(2)}</span>
                                    </div>
                                    <div
                                        style={{
                                            height: 8,
                                            background: 'rgba(0,0,0,0.04)',
                                            borderRadius: 4,
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <div
                                            style={{
                                                height: '100%',
                                                width: `${(c.total / maxTotal) * 100}%`,
                                                background: '#76b900',
                                                borderRadius: 4,
                                                transition: 'width 0.3s',
                                            }}
                                        />
                                    </div>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: 2 }}>
                                        ${c.costPer1k}/1k tokens · {(c.usage / 1000000).toFixed(1)}M
                                        tokens used
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div
                        style={{
                            marginTop: 16,
                            fontSize: '0.85rem',
                            opacity: 0.6,
                            textAlign: 'right',
                        }}
                    >
                        Total: ${costs.reduce((s, c) => s + c.total, 0).toFixed(2)}
                    </div>
                </div>
            )}

            {tab === 'costs' && (
                <div
                    style={{
                        background: 'rgba(239,68,68,0.04)',
                        border: '1px solid rgba(239,68,68,0.12)',
                        borderRadius: 12,
                        padding: 16,
                    }}
                >
                    <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem' }}>
                        Cost Analytics — Last 30 Days
                    </h3>
                    <div style={{ display: 'grid', gap: 8 }}>
                        {costs.map((c) => {
                            const maxTotal = Math.max(...costs.map((x) => x.total));
                            return (
                                <div key={c.model}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: '0.85rem',
                                            marginBottom: 4,
                                        }}
                                    >
                                        <span style={{ fontWeight: 600 }}>{c.model}</span>
                                        <span style={{ fontWeight: 700 }}>
                                            ${c.total.toFixed(2)}
                                        </span>
                                    </div>
                                    <div
                                        style={{
                                            height: 6,
                                            background: 'rgba(0,0,0,0.05)',
                                            borderRadius: 3,
                                            overflow: 'hidden',
                                        }}
                                    >
                                        <div
                                            style={{
                                                height: '100%',
                                                width: `${(c.total / maxTotal) * 100}%`,
                                                background:
                                                    c.total > 0.5
                                                        ? '#ef4444'
                                                        : c.total > 0.1
                                                          ? '#f59e0b'
                                                          : '#22c55e',
                                                borderRadius: 3,
                                            }}
                                        />
                                    </div>
                                    <div style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: 2 }}>
                                        ${c.costPer1k}/1k tokens · {(c.usage / 1000000).toFixed(1)}M
                                        tokens used
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div
                        style={{
                            marginTop: 16,
                            fontSize: '0.85rem',
                            opacity: 0.6,
                            textAlign: 'right',
                        }}
                    >
                        Total: ${costs.reduce((s, c) => s + c.total, 0).toFixed(2)}
                    </div>
                </div>
            )}

            {tab === 'achievements' && (
                <AchievementList
                    achievements={providerAchievementService.getAchievements('nvidia')}
                    progress={providerAchievementService.getProgress('nvidia', {
                        requests: features.filter((f) => f.enabled).length * 10 + slaRecords.length,
                        largePrompts: slaRecords.filter((r) => r.p95Latency > 2000).length,
                        enterpriseFeatures: features.filter((f) => f.enabled).length,
                        compliancePassed: compliance.filter((c) => c.certified).length,
                        regionsUsed: regions.length,
                        uptimePct: lastSla ? lastSla.uptime : 0,
                        costEntries: costs.length,
                        modelsUsed: costs.length,
                        nvidiaAchievements: providerAchievementService
                            .getAwardedIds()
                            .filter((id) => id.startsWith('pa-') && parseInt(id.split('-')[1]) > 30)
                            .length,
                    })}
                />
            )}
        </div>
    );
}

function StatCard({
    icon,
    label,
    value,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: string;
}) {
    return (
        <div
            style={{
                background: `${color}08`,
                border: `1px solid ${color}22`,
                borderRadius: 12,
                padding: 14,
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ color }}>{icon}</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>{label}</span>
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color }}>{value}</div>
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: '0.85rem',
    background: 'rgba(0,0,0,0.02)',
    color: 'inherit',
    width: '100%',
    marginTop: 4,
    outline: 'none',
    boxSizing: 'border-box',
};
