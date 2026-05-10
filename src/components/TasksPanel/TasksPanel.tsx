import React, { useState, useEffect } from 'react';
import { 
  Clock, Play, CheckCircle2, 
  AlertCircle, Loader2, Search,
  RotateCcw, 
  TerminalSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { cognitiveService } from '../../services/CognitiveService';
import type { CognitiveTrace } from '../../services/CognitiveService';
import { eventBus } from '../../core/events';

interface Task {
  id: string;
  label: string;
  type: 'autonomous' | 'scheduled' | 'on-demand';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
  agentId?: string;
  steps: { label: string; status: 'done' | 'active' | 'todo'; duration?: string }[];
}

const formatDuration = (ms?: number): string => {
  if (ms == null) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

const mapTraceToTask = (trace: CognitiveTrace): Task => {
  const doneSteps = trace.steps.filter(s => s.status === 'done' || s.status === 'error').length;
  const totalSteps = trace.steps.length || 1;
  const progress = trace.status === 'completed' ? 100 : Math.round((doneSteps / totalSteps) * 100);

  let taskStatus: Task['status'] = 'running';
  if (trace.status === 'completed') taskStatus = 'completed';
  else if (trace.status === 'failed') taskStatus = 'failed';
  else if (trace.steps.length === 0) taskStatus = 'pending';

  return {
    id: trace.traceId,
    label: trace.input || trace.traceId,
    type: 'autonomous',
    status: taskStatus,
    progress,
    priority: 'medium',
    createdAt: trace.startTime,
    steps: trace.steps.map(s => ({
      label: s.label || s.type,
      status: s.status === 'done' ? 'done' : s.status === 'active' ? 'active' : 'todo',
      duration: s.duration ? formatDuration(s.duration) : undefined
    }))
  };
};

const TasksPanel: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'running' | 'completed' | 'failed'>('all');

  const deriveStats = (ts: Task[]) => ({
    active: ts.filter(t => t.status === 'running').length,
    pending: ts.filter(t => t.status === 'pending').length,
    completed: ts.filter(t => t.status === 'completed').length,
    failed: ts.filter(t => t.status === 'failed').length
  });

  const [stats, setStats] = useState({ active: 0, pending: 0, completed: 0, failed: 0 });

  useEffect(() => {
    const update = () => {
      try {
        const traces = cognitiveService.getTraces();
        const mapped = traces.map(mapTraceToTask);
        setTasks(mapped);
        setStats(deriveStats(mapped));
        setError(null);
      } catch {
        setError('Failed to load task traces');
      }
      setLoading(false);
    };
    update();
    const unsub = eventBus.on('trace:updated', () => {
      const traces = cognitiveService.getTraces();
      const mapped = traces.map(mapTraceToTask);
      setTasks(mapped);
      setStats(deriveStats(mapped));
    });
    return () => unsub();
  }, []);

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.label.toLowerCase().includes(searchQuery.toLowerCase()) || t.id.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'running') return t.status === 'running' || t.status === 'pending';
    if (filter === 'completed') return t.status === 'completed';
    if (filter === 'failed') return t.status === 'failed';
    return true;
  });

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'running': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'failed': return '#ef4444';
      case 'paused': return '#f59e0b';
      default: return '#64748b';
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Loader2 size={20} className="spin" /> Loading task traces...
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12, color: '#f8fafc' }}>
            <Play size={28} color="#3b82f6" /> Task Orchestrator
          </h2>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.85rem' }}>Monitor, manage, and debug active execution pipelines and agent workflows.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.3rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
          {[
            { id: 'all', label: 'All Workflows' },
            { id: 'running', label: 'Active Pipeline' },
            { id: 'completed', label: 'Succeeded' },
            { id: 'failed', label: 'Failed' },
          ].map((f) => (
            <button 
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              style={{ 
                padding: '0.6rem 1rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                background: filter === f.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: filter === f.id ? 'white' : '#64748b'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, color: '#fca5a5', fontSize: '0.9rem' }}
          >
            <AlertCircle size={18} /> {error}
            <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>X</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats & Search */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr) 2fr', gap: '1.25rem' }}>
        {[
          { label: 'Active Runners', value: stats.active, color: '#3b82f6', icon: <Play size={16} /> },
          { label: 'Queued', value: stats.pending, color: '#f59e0b', icon: <Clock size={16} /> },
          { label: 'Completed', value: stats.completed, color: '#10b981', icon: <CheckCircle2 size={16} /> },
          { label: 'Exceptions', value: stats.failed, color: '#ef4444', icon: <AlertCircle size={16} /> }
        ].map(stat => (
          <div key={stat.label} className="glass-panel" style={{ padding: '1rem', borderRadius: 12, border: `1px solid ${stat.color}20`, background: `linear-gradient(145deg, ${stat.color}05 0%, rgba(0,0,0,0.2) 100%)` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800 }}>{stat.label}</div>
              <div style={{ color: stat.color, opacity: 0.8 }}>{stat.icon}</div>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc' }}>{stat.value}</div>
          </div>
        ))}
        
        {/* Search */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', borderRadius: 12 }}>
          <Search size={18} color="#64748b" />
          <input 
            type="text" 
            placeholder="Search by ID or instruction..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', padding: '1rem', color: 'white', outline: 'none', fontSize: '0.9rem' }}
          />
          <button className="btn-secondary" style={{ padding: '0.4rem', borderRadius: 8 }} title="Refresh tasks">
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Task List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem' }}>
        {filteredTasks.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', padding: '4rem' }}>
            <TerminalSquare size={48} opacity={0.2} style={{ marginBottom: '1rem' }} />
            <p style={{ fontSize: '1rem', fontWeight: 600 }}>{searchQuery ? 'No tasks match your search' : 'No tasks yet'}</p>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.5rem' }}>
              {searchQuery ? 'Try a different search term' : 'Execute a cognitive pipeline to see tasks appear here'}
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredTasks.map((task, i) => (
              <motion.div 
                key={task.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                className="glass-panel hover-bright"
                style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem', borderRadius: 16, borderLeft: `4px solid ${getStatusColor(task.status)}` }}
              >
                {/* Left: Task Info & Progress */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.65rem', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', padding: '0.2rem 0.5rem', borderRadius: 6, fontWeight: 800, fontFamily: 'monospace', border: '1px solid rgba(59,130,246,0.2)' }}>
                          ID: {task.id.split('-')[0]}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: getStatusColor(task.status), fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 4 }}>
                          {task.status === 'running' && <Loader2 size={10} className="spin" />}
                          {task.status}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>{task.label}</h3>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={14} /> {new Date(task.createdAt).toLocaleTimeString()}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={14} /> Priority: <span style={{ color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase' }}>{task.priority}</span></span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Loader2 size={14} /> Steps: <strong style={{ color: '#e2e8f0' }}>{task.steps.length}</strong></span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                      <motion.div animate={{ width: `${task.progress}%` }} style={{ height: '100%', background: getStatusColor(task.status), borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: getStatusColor(task.status), width: 30 }}>{Math.round(task.progress)}%</span>
                  </div>
                </div>

                {/* Right: Pipeline Steps */}
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.25rem', borderRadius: 12, border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Execution Pipeline</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {task.steps.map((step, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <div style={{ marginTop: 2 }}>
                          {step.status === 'done' ? <CheckCircle2 size={14} color="#10b981" /> : step.status === 'active' ? <Loader2 size={14} color="#3b82f6" className="spin" /> : <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)' }} />}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: step.status === 'active' ? 700 : 500, color: step.status === 'todo' ? '#64748b' : '#e2e8f0' }}>{step.label}</div>
                          {step.duration && <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 2 }}>{step.duration}</div>}
                        </div>
                      </div>
                    ))}
                    {task.steps.length === 0 && (
                      <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>Pipeline initializing...</div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default TasksPanel;
