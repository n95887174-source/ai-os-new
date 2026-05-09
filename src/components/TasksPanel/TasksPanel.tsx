import React, { useState, useEffect } from 'react';
import { 
  ListTodo, Clock, Play, Pause, X, CheckCircle2, 
  AlertCircle, ChevronRight, Loader2, Search,
  Filter, ArrowUp, ArrowDown, Settings2, Database,
  Cpu, Zap, Workflow, GitPullRequest, RotateCcw, 
  TerminalSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { cognitiveService } from '../../services/CognitiveService';
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

const mapTracesToTasks = (): Task[] => {
  return cognitiveService.getTraces().map(trace => {
    return {
      id: trace.traceId,
      label: trace.input,
      type: 'autonomous',
      status: trace.status === 'completed' ? 'completed' : trace.status === 'failed' ? 'failed' : 'running',
      progress: trace.status === 'completed' ? 100 : Math.min(90, (trace.steps.length / 5) * 100),
      priority: 'medium',
      createdAt: trace.startTime,
      agentId: trace.steps[trace.steps.length - 1]?.label || 'Cognitive Core',
      steps: trace.steps.map(s => ({
        label: s.label,
        status: s.status === 'done' ? 'done' : s.status === 'active' ? 'active' : 'todo',
        duration: s.status === 'done' ? `${Math.floor(Math.random() * 800 + 200)}ms` : undefined
      }))
    };
  });
};

const TasksPanel: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(mapTracesToTasks());
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    active: 0,
    pending: 0,
    completed: 0,
    failed: 0
  });

  useEffect(() => {
    const update = () => {
      const currentTasks = mapTracesToTasks();
      setTasks(currentTasks);
      setStats({
        active: currentTasks.filter(t => t.status === 'running').length,
        pending: currentTasks.filter(t => t.status === 'pending').length,
        completed: currentTasks.filter(t => t.status === 'completed').length,
        failed: currentTasks.filter(t => t.status === 'failed').length
      });
    };
    update();
    const unsub = eventBus.on('trace:updated', update);
    return () => unsub();
  }, []);

  const [filter, setFilter] = useState<'all' | 'running' | 'completed' | 'failed'>('all');

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

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Workflow size={28} color="#3b82f6" /> Task Orchestrator
          </h2>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.85rem' }}>Monitor, manage, and debug active execution pipelines and agent workflows.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.3rem', borderRadius: 12, border: '1px solid var(--border)' }}>
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
                color: filter === f.id ? 'white' : 'var(--text-muted)'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

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
        
        {/* Search Bar */}
        <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', padding: '0 1rem', borderRadius: 12 }}>
          <Search size={18} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Search by ID or instruction..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', padding: '1rem', color: 'white', outline: 'none', fontSize: '0.9rem' }}
          />
          <button className="btn-secondary" style={{ padding: '0.4rem', borderRadius: 8 }} title="Clear Kernel Memory">
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Task List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '0.5rem' }}>
        <AnimatePresence>
          {filteredTasks.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '5rem', color: '#64748b' }}>
              <TerminalSquare size={48} opacity={0.2} style={{ marginBottom: '1rem' }} />
              <p>No workflows found matching current criteria.</p>
            </motion.div>
          ) : (
            filteredTasks.map((task, i) => (
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
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Cpu size={14} /> Assigned: <strong style={{ color: '#e2e8f0' }}>{task.agentId}</strong></span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><GitPullRequest size={14} /> Priority: <span style={{ color: task.priority === 'high' ? '#ef4444' : '#3b82f6', fontWeight: 700, textTransform: 'uppercase' }}>{task.priority}</span></span>
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
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TasksPanel;
