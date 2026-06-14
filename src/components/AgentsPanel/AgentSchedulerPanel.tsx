import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Play, Loader2 } from 'lucide-react';
import { schedulerService } from '../../kernel/services/scheduler-service';
import { agentService } from '../../kernel/instances';
import type { Schedule } from '../../kernel/services/scheduler-service';

export const AgentSchedulerPanel: React.FC = () => {
  const agents = agentService.getAgents();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState(
    agents.length > 0 ? agents[0].id : ''
  );

  useEffect(() => {
    setSchedules(schedulerService.getAll());
  }, []);

  const handleCreate = async () => {
    const agentId = selectedAgentId || agents[0]?.id;
    if (!agentId) return;
    await schedulerService.create({
      name: 'Daily Task',
      agentId,
      frequency: 'daily',
      taskParams: { prompt: 'Do your daily check.' }
    });
    setSchedules(schedulerService.getAll());
  };

  const handleDelete = async (id: string) => {
    await schedulerService.delete(id);
    setSchedules(schedulerService.getAll());
  };

  const [triggeringId, setTriggeringId] = useState<string | null>(null);

  return (
    <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, color: '#f8fafc' }}>Agent Scheduler</h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            value={selectedAgentId}
            onChange={e => setSelectedAgentId(e.target.value)}
            style={{ padding: '0.4rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#f8fafc', fontSize: '0.8rem' }}
          >
            {agents.map(a => (
              <option key={a.id} value={a.id}>{a.name || a.id}</option>
            ))}
          </select>
          <button onClick={handleCreate} style={{ padding: '0.5rem', background: '#3b82f6', border: 'none', borderRadius: 6, color: 'white', cursor: 'pointer' }}>
            <Plus size={16} />
          </button>
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {schedules.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.85rem' }}>No schedules yet. Click + to create one.</div>
        ) : schedules.map(s => (
          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{s.name}</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{s.cronExpression ?? 'Scheduled'}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={async () => {
                  setTriggeringId(s.id);
                  try { await schedulerService.trigger(s.id); } catch { /* ignore */ }
                  setSchedules(schedulerService.getAll());
                  setTriggeringId(null);
                }}
                disabled={triggeringId === s.id}
                style={{ padding: '0.4rem', background: 'transparent', border: '1px solid #3b82f6', borderRadius: 6, color: '#3b82f6', cursor: 'pointer', opacity: triggeringId === s.id ? 0.5 : 1 }}
              >
                {triggeringId === s.id ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              </button>
              <button onClick={() => handleDelete(s.id)} style={{ padding: '0.4rem', background: 'transparent', border: '1px solid #ef4444', borderRadius: 6, color: '#ef4444', cursor: 'pointer' }}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
