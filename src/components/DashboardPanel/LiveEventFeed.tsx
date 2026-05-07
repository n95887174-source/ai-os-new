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
    const handleEvent = (type: string, data: any) => {
      const newEvent: SystemEvent = {
        id: Math.random().toString(36).slice(2, 9),
        type,
        message: formatMessage(type, data),
        timestamp: Date.now(),
        level: getLevel(type, data)
      };

      setEvents(prev => [newEvent, ...prev].slice(0, 50));
    };

    const formatMessage = (type: string, data: any) => {
      switch (type) {
        case 'chat:stream:start': return `Запуск потока: ${data.provider} (${data.model})`;
        case 'chat:stream:end': return `Поток завершен: ${data.provider} [${data.latency}мс]`;
        case 'key:state-changed': return `Статус ключа ${data.provider}: ${data.previousState} -> ${data.state}`;
        case 'key:latency-burst': return `Всплеск задержки на ${data.provider}: ${data.latency}мс`;
        case 'key:quota-exceeded': return `КВОТА ИСЧЕРПАНА: ${data.provider} (${data.quotaType})`;
        case 'router:signal': return `Тюнинг роутера: ${data.provider} [успех=${data.success}]`;
        default: return `Сигнал системы: ${type}`;
      }
    };

    const getLevel = (type: string, _data: unknown): 'info' | 'success' | 'warning' | 'error' => {
      if (type.includes('error') || type.includes('exceeded')) return 'error';
      if (type.includes('burst') || type.includes('failed')) return 'warning';
      if (type.includes('end') || type.includes('success')) return 'success';
      return 'info';
    };

    const eventsToWatch: (keyof EventMap)[] = [
      'chat:stream:start', 'chat:stream:end', 'key:state-changed', 
      'key:latency-burst', 'key:quota-exceeded', 'router:signal'
    ];

    const unsubEvents = eventsToWatch.map(e => eventBus.on(e, (data) => handleEvent(e as string, data)));

    return () => unsubEvents.forEach(unsub => unsub());
  }, []);

  return (
    <div style={{ 
      background: 'rgba(10,10,10,0.4)', 
      borderRadius: '16px', 
      border: '1px solid rgba(255,255,255,0.05)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden'
    }}>
      <div style={{ 
        padding: '1rem', 
        borderBottom: '1px solid rgba(255,255,255,0.05)', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.5rem',
        background: 'rgba(255,255,255,0.02)'
      }}>
        <Terminal size={14} color="var(--text-muted)" />
        <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Поток событий ядра</span>
        <div style={{ flex: 1 }} />
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column-reverse', gap: '0.75rem' }}>
        <AnimatePresence initial={false}>
          {events.map((event) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, height: 0 }}
              style={{ 
                fontSize: '0.75rem', 
                padding: '0.5rem', 
                background: 'rgba(255,255,255,0.02)', 
                borderRadius: '8px',
                borderLeft: `3px solid ${
                  event.level === 'error' ? '#ef4444' : 
                  event.level === 'warning' ? '#f59e0b' : 
                  event.level === 'success' ? '#10b981' : '#3b82f6'
                }`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem', opacity: 0.6 }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>{event.type.toUpperCase()}</span>
                <span>{new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
              <div style={{ color: 'var(--text-main)', fontFamily: 'monospace', lineHeight: 1.4 }}>
                {event.message}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem', fontSize: '0.8rem' }}>
            Ожидание сигналов ядра...
          </div>
      </div>
    </div>
  );
};

export default LiveEventFeed;
