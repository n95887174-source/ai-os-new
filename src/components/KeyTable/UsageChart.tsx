import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { motion } from 'framer-motion';

interface UsageChartProps {
  hourlyUsage: number[];
  usageToday: { tokens: number; requests: number; estimatedCost: number };
  usageMonthly: { tokens: number; requests: number; estimatedCost: number };
  fourSignals: { latency: number; throughput: number; errorRate?: number; saturation: number };
}

const UsageChart: React.FC<UsageChartProps> = ({ hourlyUsage, usageToday, usageMonthly, fourSignals }) => {
  const hourlyData = hourlyUsage.map((v, i) => ({ hour: `${i}:00`, requests: v }));
  const totalHourlyRequests = hourlyUsage.reduce((s, v) => s + v, 0);

  const signalData = [
    { signal: 'Latency', value: Math.min(1, fourSignals.latency / 5000) },
    { signal: 'Throughput', value: Math.min(1, fourSignals.throughput / 100) },
    { signal: 'Saturation', value: Math.min(1, fourSignals.saturation) },
    { signal: 'Error Rate', value: Math.min(1, fourSignals.errorRate ?? 0) },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {totalHourlyRequests > 0 && (
        <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', padding: '1rem', background: 'rgba(0,0,0,0.2)' }}>
          <h4 style={{ fontSize: '0.75rem', margin: '0 0 0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
            Hourly Requests (today)
          </h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hourlyData}>
              <XAxis dataKey="hour" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: '0.8rem' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Bar dataKey="requests" fill="#3b82f6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', padding: '1rem', background: 'rgba(0,0,0,0.2)' }}>
          <h4 style={{ fontSize: '0.75rem', margin: '0 0 0.5rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Today</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Requests</span>
              <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{usageToday.requests}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Tokens</span>
              <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{usageToday.tokens.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Cost</span>
              <span style={{ color: '#e2e8f0', fontWeight: 700 }}>${usageToday.estimatedCost.toFixed(4)}</span>
            </div>
          </div>
        </div>

        <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', padding: '1rem', background: 'rgba(0,0,0,0.2)' }}>
          <h4 style={{ fontSize: '0.75rem', margin: '0 0 0.5rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Monthly</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Requests</span>
              <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{usageMonthly.requests}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Tokens</span>
              <span style={{ color: '#e2e8f0', fontWeight: 700 }}>{usageMonthly.tokens.toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Cost</span>
              <span style={{ color: '#e2e8f0', fontWeight: 700 }}>${usageMonthly.estimatedCost.toFixed(4)}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', padding: '1rem', background: 'rgba(0,0,0,0.2)' }}>
        <h4 style={{ fontSize: '0.75rem', margin: '0 0 0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
          Four Signals
        </h4>
        <ResponsiveContainer width="100%" height={200}>
          <RadarChart data={signalData}>
            <PolarGrid stroke="rgba(255,255,255,0.1)" />
            <PolarAngleAxis dataKey="signal" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <PolarRadiusAxis angle={30} domain={[0, 1]} tick={{ fill: '#64748b', fontSize: 10 }} />
            <Radar dataKey="value" stroke="#a855f7" fill="#a855f7" fillOpacity={0.2} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

export default UsageChart;
