import React, { useState, useEffect } from 'react';
import { 
  ListTodo, Clock, Play, Pause, X, CheckCircle2, 
  AlertCircle, ChevronRight, Loader2, Search,
  Filter, ArrowUp, ArrowDown, Settings2, Database,
  Cpu, Zap
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
  steps: { label: string; status: 'done' | 'active' | 'todo' }[];
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
      agentId: trace.steps[trace.steps.length - 1]?.label || 'System',
      steps: trace.steps.map(s => ({
        label: s.label,
        status: s.status === 'done' ? 'done' : s.status === 'active' ? 'active' : 'todo'
      }))
    };
  });
};

const TasksPanel: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(mapTracesToTasks());
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

  const [filter, setFilter] = useState<'all' | 'running' | 'completed'>('all');

  const filteredTasks = tasks.filter(t => {
    if (filter === 'running') return t.status === 'running' || t.status === 'pending';
    if (filter === 'completed') return t.status === 'completed';
    return true;
  });

  return (
    <div style={{ color: 'var(--text-main)' }}>
      {/* Task Overview Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
        {[
          { label: 'Active Tasks', value: stats.active, color: '#3b82f6' },
          { label: 'Pending', value: stats.pending, color: '#f59e0b' },
          { label: 'Completed', value: stats.completed, color: '#10b981' },
          { label: 'Failed', value: stats.failed, color: '#ef4444' }
        ].map(stat => (
          <div key={stat.label} className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{stat.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Control Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {['all', 'running', 'completed'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              style={{ padding: '0.5rem 1rem', background: filter === f ? 'rgba(59,130,246,0.1)' : 'transparent', color: filter === f ? '#3b82f6' : 'var(--text-muted)', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize' }}
            >
              {f}
            </button>
          ))}
        </div>
        <button className="btn-primary" style={{ padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={16} /> Force Kernel GC
        </button>
      </div>

      {/* Task List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filteredTasks.map(task => (
          <motion.div 
            key={task.id}
            layout
            className="glass-panel"
            style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem' }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 800 }}>{task.id}</span>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{task.label}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} /> Started {new Date(task.createdAt).toLocaleTimeString()}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Cpu size={12} /> Agent: {task.agentId || 'System'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn-secondary" style={{ padding: '0.4rem' }}>{task.status === 'paused' ? <Play size={16} /> : <Pause size={16} />}</button>
                  <button className="btn-secondary" style={{ padding: '0.4rem', color: '#ef4444' }}><X size={16} /></button>
                </div>
              </div>

              {/* Progress Bar */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 600 }}>Progress</span>
                  <span style={{ color: '#3b82f6' }}>{task.progress}%</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                  <motion.div animate={{ width: `${task.progress}%` }} style={{ height: '100%', background: '#3b82f6' }} />
                </div>
              </div>

              {/* Steps Visualizer */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {task.steps.map((step, i) => (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ height: 4, background: step.status === 'done' ? '#10b981' : step.status === 'active' ? '#3b82f6' : 'rgba(255,255,255,0.05)', borderRadius: 2 }} />
                    <span style={{ fontSize: '0.65rem', color: step.status === 'active' ? 'white' : 'var(--text-muted)', textAlign: 'center' }}>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Task Detail Sidebar (Mini) */}
            <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>EXECUTION NODE</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem' }}>
                  <Zap size={14} color="#f59e0b" />
                  <span>OpenRouter / gpt-4o</span>
                </div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: 12, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>PRIORITY</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: task.priority === 'high' ? '#ef4444' : '#3b82f6' }}>
                  {task.priority === 'high' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                  <span style={{ fontWeight: 700 }}>{task.priority.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default TasksPanel;
