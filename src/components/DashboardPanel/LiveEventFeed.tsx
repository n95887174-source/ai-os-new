import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal } from 'lucide-react';
import { eventBus, type EventMap } from '../../core/events';

interface SystemEvent {
  id: string;
  type: string;
  message: string;
  timestamp: number;
  level: 'info' | 'success' | 'warning' | 'error';
}

const LiveEventFeed: React.FC = () => {
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEvent = (type: string, data: Record<string, unknown>) => {
      const newEvent: SystemEvent = {
        id: crypto.randomUUID().slice(0, 8),
        type,
        message: formatMessage(type, data),
        timestamp: Date.now(),
        level: getLevel(type, data)
      };

      setEvents(prev => [newEvent, ...prev].slice(0, 50));
    };

    const formatMessage = (type: string, data: Record<string, unknown>) => {
      switch (type) {
        case 'chat:stream:start': return `Stream started: ${data.provider} (${data.model})`;
        case 'chat:stream:end': return `Stream ended: ${data.provider} [${data.latency}ms]`;
        case 'key:state-changed': return `Key state ${data.provider}: ${data.previousState} -> ${data.state}`;
        case 'key:latency-burst': return `Latency spike on ${data.provider}: ${data.latency}ms`;
        case 'key:quota-exceeded': return `QUOTA EXCEEDED: ${data.provider} (${data.quotaType})`;
        case 'router:signal': return `Router tuning: ${data.provider} [success=${data.success}]`;
        case 'tool:execution:start': return `Tool execution started: ${data.toolId || data.tool || 'unknown'}`;
        case 'tool:execution:success': return `Tool execution succeeded: ${data.toolId || data.tool || 'unknown'}`;
        case 'tool:execution:error': return `Tool execution failed: ${data.toolId || data.tool || 'unknown'} [${data.error || ''}]`;
        case 'policy:violation': return `POLICY VIOLATION: ${data.policyId || 'unknown'} on node ${data.nodeId || 'unknown'} [${data.severity || 'warning'}]`;
        case 'key:health-check-failed': return `Health check failed: ${data.provider || 'unknown'} [${data.error || ''}]`;
        default: return `System signal: ${type}`;
      }
    };

    const getLevel = (type: string, _data: unknown): 'info' | 'success' | 'warning' | 'error' => {
      if (type.includes('error') || type.includes('exceeded')) return 'error';
      if (type.includes('burst') || type.includes('failed')) return 'warning';
      if (type.includes('end') || type.includes('success')) return 'success';
      return 'info';
    };

    const eventsToWatch: (keyof EventMap)[] = [
      'chat:stream:start', 'chat:stream:end',
      'key:state-changed', 'key:latency-burst', 'key:quota-exceeded',
      'router:signal', 'tool:execution:start', 'tool:execution:success', 'tool:execution:error',
      'policy:violation', 'key:health-check-failed'
    ];

    const unsubs = eventsToWatch.map(evt =>
      eventBus.on(evt, (data) => handleEvent(evt, data as Record<string, unknown>))
    );

    return () => unsubs.forEach(u => u());
  }, []);

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', flexShrink: 0 }}>
        <Terminal size={16} color="#10b981" />
        <span style={{ fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Kernel Event Stream</span>
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column-reverse' }}>
        <AnimatePresence>
          {events.map((e) => (
            <motion.div
              key={e.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{
                display: 'flex', gap: '0.6rem', padding: '0.4rem 0',
                fontSize: '0.7rem', fontFamily: 'monospace',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                alignItems: 'flex-start'
              }}
            >
              <span style={{ color: 'var(--text-muted)', flexShrink: 0, width: '2.2rem', opacity: 0.5 }}>
                {new Date(e.timestamp).toLocaleTimeString()}
              </span>
              <span style={{
                color: e.level === 'error' ? '#ef4444' : e.level === 'warning' ? '#f59e0b' : e.level === 'success' ? '#10b981' : 'var(--text-muted)',
                flexShrink: 0,
              }}>
                [{e.level.toUpperCase().padEnd(7)}]
              </span>
              <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {e.message}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>

        {events.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            Waiting for kernel signals...
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveEventFeed;
