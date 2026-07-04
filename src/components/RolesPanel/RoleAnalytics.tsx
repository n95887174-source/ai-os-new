import {
    BarChart3,
    Activity,
    Zap,
    AlertTriangle,
    TrendingUp,
    TrendingDown,
    Clock,
    Calendar,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { RoleUsageStats } from '../../kernel/instances';

interface RoleAnalyticsProps {
    stats: Record<string, RoleUsageStats>;
    roles: Array<{ id: string; name: string; metadata: { category: string } }>;
}

const MiniBar: React.FC<{ value: number; max: number; color: string; height?: number }> = ({
    value,
    max,
    color,
    height = 4,
}) => {
    const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
    return (
        <div
            style={{
                height,
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 2,
                overflow: 'hidden',
                width: '100%',
            }}
        >
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6 }}
                style={{ height: '100%', background: color, borderRadius: 2 }}
            />
        </div>
    );
};

const DonutChart: React.FC<{
    segments: Array<{ label: string; value: number; color: string }>;
    size?: number;
}> = ({ segments, size = 90 }) => {
    const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
    const r = size / 2 - 8;
    const cx = size / 2;
    const cy = size / 2;
    const circumference = 2 * Math.PI * r;
    let offset = 0;
    return (
        <svg width={size} height={size} style={{ display: 'block' }}>
            {segments.map((seg) => {
                const pct = seg.value / total;
                const dash = pct * circumference;
                const dashOffset = -offset;
                offset += dash;
                return (
                    <circle
                        key={seg.color}
                        cx={cx}
                        cy={cy}
                        r={r}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth="6"
                        strokeDasharray={`${dash} ${circumference - dash}`}
                        strokeDashoffset={dashOffset}
                        strokeLinecap="round"
                    />
                );
            })}
            <text
                x={cx}
                y={cy - 4}
                textAnchor="middle"
                fill="#e2e8f0"
                fontSize="16"
                fontWeight="700"
            >
                {total}
            </text>
            <text x={cx} y={cy + 12} textAnchor="middle" fill="#64748b" fontSize="9">
                roles
            </text>
        </svg>
    );
};

export const RoleAnalytics: React.FC<RoleAnalyticsProps> = ({ stats, roles }) => {
    const totalInvocations = Object.values(stats).reduce((s, r) => s + (r.invocations || 0), 0);
    const totalErrors = Object.values(stats).reduce((s, r) => s + (r.errors || 0), 0);
    const avgLatency =
        roles.length > 0
            ? Math.round(
                  Object.values(stats).reduce((s, r) => s + (r.avgLatency || 0), 0) /
                      Math.max(1, Object.keys(stats).length),
              )
            : 0;
    const successRate =
        totalInvocations > 0
            ? Math.round(((totalInvocations - totalErrors) / totalInvocations) * 100)
            : 100;

    const maxInvocations = Math.max(...Object.values(stats).map((r) => r.invocations || 0), 1);

    const categorySegments = (() => {
        const counts: Record<string, number> = {};
        roles.forEach((r) => {
            counts[r.metadata.category] = (counts[r.metadata.category] || 0) + 1;
        });
        const colors: Record<string, string> = {
            technical: '#3b82f6',
            creative: '#a855f7',
            analytical: '#10b981',
            management: '#f59e0b',
            custom: '#64748b',
        };
        return Object.entries(counts).map(([label, value]) => ({
            label,
            value,
            color: colors[label] || '#64748b',
        }));
    })();

    const topRoles = roles
        .slice()
        .sort((a, b) => (stats[b.id]?.invocations || 0) - (stats[a.id]?.invocations || 0))
        .slice(0, 8);

    // Time-series: daily invocations for last 14 days
    const timeSeriesData = (() => {
        const days: string[] = [];
        for (let i = 13; i >= 0; i--) {
            const d = new Date(Date.now() - i * 86400000);
            days.push(d.toISOString().slice(0, 10));
        }
        return days.map((day) => {
            let inv = 0,
                errs = 0;
            for (const s of Object.values(stats)) {
                if (s.dailyStats?.[day]) {
                    inv += s.dailyStats[day].invocations;
                    errs += s.dailyStats[day].errors;
                }
            }
            return { day, invocations: inv, errors: errs };
        });
    })();
    const maxDaily = Math.max(...timeSeriesData.map((d) => d.invocations), 1);

    // Per-tool breakdown
    const toolUsageAgg = (() => {
        const agg: Record<string, number> = {};
        for (const s of Object.values(stats)) {
            if (s.toolUsage) {
                for (const [tool, count] of Object.entries(s.toolUsage)) {
                    agg[tool] = (agg[tool] || 0) + count;
                }
            }
        }
        return Object.entries(agg)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
    })();
    const maxToolUsage = Math.max(...toolUsageAgg.map(([, c]) => c), 1);

    // Temperature-vs-success
    const tempCorrelation = (() => {
        const buckets: Record<string, { success: number; total: number }> = {};
        for (const s of Object.values(stats)) {
            if (s.temperatureLog) {
                for (const entry of s.temperatureLog) {
                    const key = entry.temp < 0.3 ? 'low' : entry.temp < 0.7 ? 'medium' : 'high';
                    const b = buckets[key] || { success: 0, total: 0 };
                    b.total++;
                    if (entry.success) b.success++;
                    buckets[key] = b;
                }
            }
        }
        return Object.entries(buckets).map(([label, b]) => ({
            label,
            rate: b.total > 0 ? Math.round((b.success / b.total) * 100) : 0,
            total: b.total,
        }));
    })();

    // Heatmap: hour × top 5 roles
    const heatmapData = (() => {
        const top5Ids = topRoles.slice(0, 5).map((r) => r.id);
        return top5Ids.map((id) => {
            const s = stats[id];
            const hours: number[] = [];
            let maxH = 1;
            for (let h = 0; h < 24; h++) {
                const val = s?.hourlyDistribution?.[h] || 0;
                hours.push(val);
                if (val > maxH) maxH = val;
            }
            return {
                roleId: id,
                roleName: roles.find((r) => r.id === id)?.name || '',
                hours,
                max: maxH,
            };
        });
    })();

    // Fatigue
    const fatigueAlerts = (() => {
        const alerts: Array<{
            id: string;
            name: string;
            status: string;
            recentRate: number;
            overallRate: number;
        }> = [];
        for (const r of roles) {
            const s = stats[r.id];
            if (!s || s.invocations < 10) continue;
            const overall = s.invocations > 0 ? (s.invocations - s.errors) / s.invocations : 0;
            const recentDays = Object.entries(s.dailyStats || {})
                .filter(([day]) => (Date.now() - new Date(day).getTime()) / 86400000 <= 7)
                .reduce((acc, [, d]) => ({ i: acc.i + d.invocations, e: acc.e + d.errors }), {
                    i: 0,
                    e: 0,
                });
            const recent =
                recentDays.i > 0 ? (recentDays.i - recentDays.e) / recentDays.i : overall;
            const decline = overall - recent;
            if (decline > 0.1) {
                alerts.push({
                    id: r.id,
                    name: r.name,
                    status: decline > 0.2 ? 'critical' : 'fatigued',
                    recentRate: Math.round(recent * 100),
                    overallRate: Math.round(overall * 100),
                });
            }
        }
        return alerts.sort((a, b) => a.recentRate - a.overallRate - (b.recentRate - b.overallRate));
    })();

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                padding: '1rem',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.06)',
            }}
        >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart3 size={18} color="#3b82f6" />
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#e2e8f0' }}>
                    Role Usage Analytics
                </span>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                {[
                    {
                        label: 'Total Invocations',
                        value: totalInvocations.toLocaleString(),
                        icon: <Zap size={14} />,
                        color: '#3b82f6',
                    },
                    {
                        label: 'Success Rate',
                        value: `${successRate}%`,
                        icon: <Activity size={14} />,
                        color: successRate > 90 ? '#10b981' : '#f59e0b',
                    },
                    {
                        label: 'Avg Latency',
                        value: `${avgLatency}ms`,
                        icon: <BarChart3 size={14} />,
                        color: avgLatency < 500 ? '#10b981' : '#f59e0b',
                    },
                    {
                        label: 'Total Errors',
                        value: totalErrors.toString(),
                        icon: <AlertTriangle size={14} />,
                        color: totalErrors > 0 ? '#ef4444' : '#10b981',
                    },
                ].map((card) => (
                    <div
                        key={card.label}
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: 10,
                            padding: '0.6rem 0.75rem',
                            border: `1px solid ${card.color}22`,
                        }}
                    >
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 5,
                                marginBottom: 4,
                                color: card.color,
                            }}
                        >
                            {card.icon}
                            <span
                                style={{
                                    fontSize: '0.6rem',
                                    fontWeight: 600,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                {card.label}
                            </span>
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#e2e8f0' }}>
                            {card.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                {/* Usage per Role */}
                <div
                    style={{
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 10,
                        padding: '0.75rem',
                        border: '1px solid rgba(255,255,255,0.06)',
                    }}
                >
                    <div
                        style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: '#94a3b8',
                            marginBottom: '0.5rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}
                    >
                        Invocations per Role
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {topRoles.map((r) => {
                            const inv = stats[r.id]?.invocations || 0;
                            return (
                                <div
                                    key={r.id}
                                    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                                >
                                    <span
                                        style={{
                                            fontSize: '0.7rem',
                                            color: '#94a3b8',
                                            width: 90,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {r.name}
                                    </span>
                                    <div style={{ flex: 1 }}>
                                        <MiniBar value={inv} max={maxInvocations} color="#3b82f6" />
                                    </div>
                                    <span
                                        style={{
                                            fontSize: '0.65rem',
                                            color: '#64748b',
                                            width: 36,
                                            textAlign: 'right',
                                        }}
                                    >
                                        {inv}
                                    </span>
                                </div>
                            );
                        })}
                        {topRoles.length === 0 && (
                            <div
                                style={{
                                    fontSize: '0.75rem',
                                    color: '#64748b',
                                    textAlign: 'center',
                                    padding: '1rem',
                                }}
                            >
                                No role usage data yet
                            </div>
                        )}
                    </div>
                </div>

                {/* Category Distribution */}
                <div
                    style={{
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 10,
                        padding: '0.75rem',
                        border: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    <div
                        style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: '#94a3b8',
                            marginBottom: '0.5rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}
                    >
                        By Category
                    </div>
                    <DonutChart segments={categorySegments} size={80} />
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 8,
                            marginTop: 8,
                            justifyContent: 'center',
                        }}
                    >
                        {categorySegments.map((seg) => (
                            <div
                                key={seg.label}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    fontSize: '0.6rem',
                                    color: '#94a3b8',
                                }}
                            >
                                <div
                                    style={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: 2,
                                        background: seg.color,
                                    }}
                                />
                                {seg.label}: {seg.value}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* === ANALYTICS V2 SECTION === */}

            {/* Time-series Chart */}
            <div
                style={{
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: 10,
                    padding: '0.75rem',
                    border: '1px solid rgba(255,255,255,0.06)',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: '0.5rem',
                    }}
                >
                    <Calendar size={14} color="#3b82f6" />
                    <span
                        style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: '#94a3b8',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}
                    >
                        Daily Activity (14 days)
                    </span>
                </div>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'flex-end',
                        gap: 3,
                        height: 48,
                        padding: '0.25rem 0',
                    }}
                >
                    {timeSeriesData.map((d) => (
                        <div
                            key={d.day}
                            style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: 2,
                            }}
                        >
                            <div
                                style={{
                                    flex: 1,
                                    display: 'flex',
                                    alignItems: 'flex-end',
                                    width: '100%',
                                    gap: 1,
                                }}
                            >
                                <div
                                    style={{
                                        width: '50%',
                                        height: `${(d.invocations / maxDaily) * 100}%`,
                                        background: '#3b82f6',
                                        borderRadius: '2px 2px 0 0',
                                        minHeight: d.invocations > 0 ? 4 : 0,
                                        transition: 'height 0.3s',
                                    }}
                                />
                                <div
                                    style={{
                                        width: '50%',
                                        height: `${(d.errors / Math.max(maxDaily, 1)) * 100}%`,
                                        background: '#ef4444',
                                        borderRadius: '2px 2px 0 0',
                                        minHeight: d.errors > 0 ? 4 : 0,
                                        transition: 'height 0.3s',
                                    }}
                                />
                            </div>
                            <span
                                style={{
                                    fontSize: '0.5rem',
                                    color: '#64748b',
                                    writingMode: 'vertical-lr',
                                    textOrientation: 'mixed',
                                    height: 14,
                                    overflow: 'hidden',
                                }}
                            >
                                {d.day.slice(5)}
                            </span>
                        </div>
                    ))}
                </div>
                <div
                    style={{
                        display: 'flex',
                        gap: 12,
                        fontSize: '0.6rem',
                        color: '#64748b',
                        marginTop: 4,
                    }}
                >
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span
                            style={{ width: 8, height: 8, borderRadius: 2, background: '#3b82f6' }}
                        />{' '}
                        Invocations
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span
                            style={{ width: 8, height: 8, borderRadius: 2, background: '#ef4444' }}
                        />{' '}
                        Errors
                    </span>
                </div>
            </div>

            {/* Second row: Per-tool + Temperature */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {/* Per-tool usage */}
                <div
                    style={{
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 10,
                        padding: '0.75rem',
                        border: '1px solid rgba(255,255,255,0.06)',
                    }}
                >
                    <div
                        style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: '#94a3b8',
                            marginBottom: '0.5rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}
                    >
                        Tool Usage
                    </div>
                    {toolUsageAgg.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {toolUsageAgg.map(([tool, count]) => (
                                <div
                                    key={tool}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                >
                                    <span
                                        style={{
                                            fontSize: '0.65rem',
                                            color: '#94a3b8',
                                            width: 80,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {tool}
                                    </span>
                                    <div style={{ flex: 1 }}>
                                        <MiniBar value={count} max={maxToolUsage} color="#a855f7" />
                                    </div>
                                    <span
                                        style={{
                                            fontSize: '0.6rem',
                                            color: '#64748b',
                                            width: 30,
                                            textAlign: 'right',
                                        }}
                                    >
                                        {count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div
                            style={{
                                fontSize: '0.75rem',
                                color: '#64748b',
                                textAlign: 'center',
                                padding: '1rem',
                            }}
                        >
                            No tool usage data yet
                        </div>
                    )}
                </div>

                {/* Temperature-vs-success */}
                <div
                    style={{
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 10,
                        padding: '0.75rem',
                        border: '1px solid rgba(255,255,255,0.06)',
                    }}
                >
                    <div
                        style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: '#94a3b8',
                            marginBottom: '0.5rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}
                    >
                        Temp vs Success Rate
                    </div>
                    {tempCorrelation.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {tempCorrelation.map((t) => (
                                <div key={t.label}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            fontSize: '0.65rem',
                                            color: '#94a3b8',
                                            marginBottom: 3,
                                        }}
                                    >
                                        <span style={{ textTransform: 'capitalize' }}>
                                            {t.label} ({t.total}x)
                                        </span>
                                        <span
                                            style={{
                                                color:
                                                    t.rate > 80
                                                        ? '#10b981'
                                                        : t.rate > 60
                                                          ? '#f59e0b'
                                                          : '#ef4444',
                                                fontWeight: 700,
                                            }}
                                        >
                                            {t.rate}%
                                        </span>
                                    </div>
                                    <MiniBar
                                        value={t.rate}
                                        max={100}
                                        color={
                                            t.rate > 80
                                                ? '#10b981'
                                                : t.rate > 60
                                                  ? '#f59e0b'
                                                  : '#ef4444'
                                        }
                                        height={6}
                                    />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div
                            style={{
                                fontSize: '0.75rem',
                                color: '#64748b',
                                textAlign: 'center',
                                padding: '1rem',
                            }}
                        >
                            No temperature data yet
                        </div>
                    )}
                </div>
            </div>

            {/* Third row: Heatmap + ELO */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {/* Hourly Heatmap */}
                <div
                    style={{
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 10,
                        padding: '0.75rem',
                        border: '1px solid rgba(255,255,255,0.06)',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            marginBottom: '0.5rem',
                        }}
                    >
                        <Clock size={14} color="#f59e0b" />
                        <span
                            style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                color: '#94a3b8',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}
                        >
                            Hourly Activity (top 5)
                        </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {heatmapData.map((row) => (
                            <div
                                key={row.roleId}
                                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                            >
                                <span
                                    style={{
                                        fontSize: '0.55rem',
                                        color: '#94a3b8',
                                        width: 70,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {row.roleName}
                                </span>
                                <div style={{ display: 'flex', gap: 1, flex: 1 }}>
                                    {row.hours.map((val, h) => {
                                        const intensity = val / row.max;
                                        return (
                                            <div
                                                key={h}
                                                style={{
                                                    flex: 1,
                                                    height: 10,
                                                    borderRadius: 1,
                                                    background:
                                                        val > 0
                                                            ? `rgba(245,158,11,${0.2 + intensity * 0.8})`
                                                            : 'rgba(255,255,255,0.03)',
                                                    transition: 'background 0.2s',
                                                }}
                                                title={`${row.roleName} at ${h}:00 — ${val} calls`}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div
                        style={{
                            fontSize: '0.55rem',
                            color: '#64748b',
                            marginTop: 4,
                            textAlign: 'center',
                        }}
                    >
                        {Array.from({ length: 6 }, (_, i) => (
                            <span key={i} style={{ display: 'inline-block', width: `${100 / 6}%` }}>
                                {i * 4}:00
                            </span>
                        ))}
                    </div>
                </div>

                {/* ELO Leaderboard */}
                <div
                    style={{
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 10,
                        padding: '0.75rem',
                        border: '1px solid rgba(255,255,255,0.06)',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            marginBottom: '0.5rem',
                        }}
                    >
                        <TrendingUp size={14} color="#10b981" />
                        <span
                            style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                color: '#94a3b8',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}
                        >
                            ELO Leaderboard
                        </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {topRoles.slice(0, 8).map((r, i) => {
                            const s = stats[r.id];
                            if (!s || s.invocations === 0) return null;
                            const score =
                                s.invocations > 0
                                    ? Math.round(
                                          ((s.invocations - s.errors) / s.invocations) * 400 +
                                              Math.max(0, 1 - (s.avgLatency || 0) / 10000) * 200 +
                                              200,
                                      )
                                    : 0;
                            return (
                                <div
                                    key={r.id}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                >
                                    <span
                                        style={{
                                            fontSize: '0.6rem',
                                            color: i < 3 ? '#f59e0b' : '#64748b',
                                            fontWeight: 800,
                                            width: 16,
                                        }}
                                    >
                                        #{i + 1}
                                    </span>
                                    <span
                                        style={{
                                            fontSize: '0.65rem',
                                            color: '#94a3b8',
                                            width: 80,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {r.name}
                                    </span>
                                    <div style={{ flex: 1 }}>
                                        <MiniBar
                                            value={score}
                                            max={1000}
                                            color={i < 3 ? '#f59e0b' : '#3b82f6'}
                                        />
                                    </div>
                                    <span
                                        style={{
                                            fontSize: '0.6rem',
                                            color: '#e2e8f0',
                                            fontWeight: 700,
                                            width: 32,
                                            textAlign: 'right',
                                        }}
                                    >
                                        {score}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Fatigue Alerts */}
            {fatigueAlerts.length > 0 && (
                <div
                    style={{
                        background: 'rgba(239,68,68,0.05)',
                        borderRadius: 10,
                        padding: '0.75rem',
                        border: '1px solid rgba(239,68,68,0.15)',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            marginBottom: '0.5rem',
                        }}
                    >
                        <TrendingDown size={14} color="#ef4444" />
                        <span
                            style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                color: '#ef4444',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                            }}
                        >
                            Role Fatigue Detected ({fatigueAlerts.length})
                        </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {fatigueAlerts.slice(0, 5).map((f) => (
                            <div
                                key={f.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '0.4rem 0.5rem',
                                    background: 'rgba(0,0,0,0.2)',
                                    borderRadius: 8,
                                }}
                            >
                                <AlertTriangle
                                    size={12}
                                    color={f.status === 'critical' ? '#ef4444' : '#f59e0b'}
                                />
                                <span style={{ fontSize: '0.7rem', color: '#e2e8f0', flex: 1 }}>
                                    {f.name}
                                </span>
                                <span style={{ fontSize: '0.6rem', color: '#64748b' }}>
                                    {f.overallRate}% → {f.recentRate}%
                                </span>
                                <span
                                    style={{
                                        fontSize: '0.6rem',
                                        fontWeight: 700,
                                        color: f.status === 'critical' ? '#ef4444' : '#f59e0b',
                                        background:
                                            f.status === 'critical'
                                                ? 'rgba(239,68,68,0.2)'
                                                : 'rgba(245,158,11,0.2)',
                                        padding: '0.15rem 0.4rem',
                                        borderRadius: 4,
                                    }}
                                >
                                    {f.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoleAnalytics;
