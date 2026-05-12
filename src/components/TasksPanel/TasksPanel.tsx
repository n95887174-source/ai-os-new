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
        eventBus.emit('system:notification', { message: 'Failed to load task traces', type: 'error' });
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
      <div className="tasks-loading" role="status" aria-label="Loading tasks">
        <motion.div
          className="tasks-loading-inner"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Loader2 size={20} className="spin" aria-hidden="true" /> Loading task traces...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="tasks-wrapper">
      
      {/* Header */}
      <div className="tasks-header">
        <div className="tasks-header-left">
          <h2 className="tasks-heading">
            <Play size={28} color="#3b82f6" aria-hidden="true" /> Task Orchestrator
          </h2>
          <p className="tasks-subtitle">Monitor, manage, and debug active execution pipelines and agent workflows.</p>
        </div>
        <div className="tasks-controls" role="tablist" aria-label="Filter tasks by status">
          {[
            { id: 'all', label: 'All Workflows' },
            { id: 'running', label: 'Active Pipeline' },
            { id: 'completed', label: 'Succeeded' },
            { id: 'failed', label: 'Failed' },
          ].map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              aria-controls="tasks-panel"
              onClick={() => setFilter(f.id as 'all' | 'running' | 'completed' | 'failed')}
              className={`tasks-filter-btn${filter === f.id ? ' tasks-filter-btn--active' : ''}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="tasks-error"
            role="alert"
          >
            <AlertCircle size={18} aria-hidden="true" /> {error}
            <button
              onClick={() => setError(null)}
              className="tasks-error-close"
              aria-label="Dismiss error"
            >
              X
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats & Search */}
      <div className="tasks-stats-grid">
        {[
          { label: 'Active Runners', value: stats.active, color: '#3b82f6', icon: <Play size={16} /> },
          { label: 'Queued', value: stats.pending, color: '#f59e0b', icon: <Clock size={16} /> },
          { label: 'Completed', value: stats.completed, color: '#10b981', icon: <CheckCircle2 size={16} /> },
          { label: 'Exceptions', value: stats.failed, color: '#ef4444', icon: <AlertCircle size={16} /> }
        ].map(stat => (
          <div
            key={stat.label}
            className="glass-panel tasks-stat-card"
            style={{ borderColor: `${stat.color}20`, backgroundImage: `linear-gradient(145deg, ${stat.color}05 0%, rgba(0,0,0,0.2) 100%)` }}
          >
            <div className="tasks-stat-header">
              <div className="tasks-stat-label">{stat.label}</div>
              <div className="tasks-stat-icon" style={{ color: stat.color }}>{stat.icon}</div>
            </div>
            <div className="tasks-stat-value">{stat.value}</div>
          </div>
        ))}
        
        {/* Search */}
        <div className="glass-panel tasks-search-wrapper" role="search">
          <Search size={18} color="#64748b" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search by ID or instruction..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="tasks-search-input"
            aria-label="Search tasks by ID or instruction"
          />
          <button
            className="btn-secondary tasks-refresh-btn"
            title="Refresh tasks"
            aria-label="Refresh tasks"
            onClick={() => {
              try {
                const traces = cognitiveService.getTraces();
                const mapped = traces.map(mapTraceToTask);
                setTasks(mapped);
                setStats(deriveStats(mapped));
                setError(null);
              } catch {
                setError('Failed to refresh tasks');
                eventBus.emit('system:notification', { message: 'Failed to refresh tasks', type: 'error' });
              }
            }}
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="tasks-list" id="tasks-panel" role="tabpanel" aria-label="Task list">
        {filteredTasks.length === 0 ? (
          <div className="tasks-empty">
            <div className="tasks-empty-icon"><TerminalSquare size={48} opacity={0.2} /></div>
            <p className="tasks-empty-title">{searchQuery ? 'No tasks match your search' : 'No tasks yet'}</p>
            <p className="tasks-empty-desc">
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
                className="glass-panel hover-bright tasks-item"
                style={{ borderLeftColor: getStatusColor(task.status) }}
                role="article"
                aria-label={`Task: ${task.label}`}
              >
                {/* Left: Task Info & Progress */}
                <div className="tasks-item-left">
                  <div className="tasks-item-meta">
                    <div className="tasks-item-meta-left">
                      <div className="tasks-item-badges">
                        <span className="tasks-item-id">
                          ID: {task.id.split('-')[0]}
                        </span>
                        <span className="tasks-item-status" style={{ color: getStatusColor(task.status) }}>
                          {task.status === 'running' && <Loader2 size={10} className="spin" aria-hidden="true" />}
                          {task.status}
                        </span>
                      </div>
                      <h3 className="tasks-item-title">{task.label}</h3>
                    </div>
                  </div>

                  <div className="tasks-item-details">
                    <span className="tasks-item-detail"><Clock size={14} aria-hidden="true" /> {new Date(task.createdAt).toLocaleTimeString()}</span>
                    <span className="tasks-item-detail"><Clock size={14} aria-hidden="true" /> Priority: <span className="tasks-item-detail-highlight">{task.priority}</span></span>
                    <span className="tasks-item-detail"><Loader2 size={14} aria-hidden="true" /> Steps: <strong>{task.steps.length}</strong></span>
                  </div>

                  <div className="tasks-item-progress-row">
                    <div className="tasks-item-progress-track" role="progressbar" aria-valuenow={Math.round(task.progress)} aria-valuemin={0} aria-valuemax={100} aria-label={`${Math.round(task.progress)}% complete`}>
                      <motion.div
                        animate={{ width: `${task.progress}%` }}
                        className="tasks-item-progress-fill"
                        style={{ background: getStatusColor(task.status) }}
                      />
                    </div>
                    <span className="tasks-item-progress-text" style={{ color: getStatusColor(task.status) }}>{Math.round(task.progress)}%</span>
                  </div>
                </div>

                {/* Right: Pipeline Steps */}
                <div className="tasks-item-steps">
                  <div className="tasks-item-steps-title">Execution Pipeline</div>
                  <div className="tasks-item-steps-list">
                    {task.steps.map((step, idx) => (
                      <div key={idx} className="tasks-item-step">
                        <div className="tasks-item-step-icon">
                          {step.status === 'done' ? <CheckCircle2 size={14} color="#10b981" aria-hidden="true" /> : step.status === 'active' ? <Loader2 size={14} color="#3b82f6" className="spin" aria-hidden="true" /> : <div className="tasks-item-step-icon--dot" />}
                        </div>
                        <div className="tasks-item-step-content">
                          <div className={`tasks-item-step-label tasks-item-step-label--${step.status}`}>{step.label}</div>
                          {step.duration && <div className="tasks-item-step-duration">{step.duration}</div>}
                        </div>
                      </div>
                    ))}
                    {task.steps.length === 0 && (
                      <div className="tasks-item-steps-empty">Pipeline initializing...</div>
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
