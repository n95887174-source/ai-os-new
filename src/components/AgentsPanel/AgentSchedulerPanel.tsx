import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, Play } from 'lucide-react';
import { schedulerService } from '../../kernel/services/scheduler-service';
import type { Schedule } from '../../kernel/services/scheduler-service';

export const AgentSchedulerPanel: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  useEffect(() => {
    setSchedules(schedulerService.getAll());
  }, []);

  const handleCreate = async () => {
    // Example: Create a new daily schedule for an agent
    await schedulerService.create({
      name: 'Daily Task',
      agentId: 'agent-123', // This should probably be passed as a prop
      frequency: 'daily',
      taskParams: { prompt: 'Do your daily check.' }
    });
    setSchedules(schedulerService.getAll());
  };

  const handleDelete = async (id: string) => {
    await schedulerService.delete(id);
    setSchedules(schedulerService.getAll());
  };

  return (
    <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, color: '#f8fafc' }}>Agent Scheduler</h3>
        <button onClick={handleCreate} style={{ padding: '0.5rem', background: '#3b82f6', border: 'none', borderRadius: 6, color: 'white', cursor: 'pointer' }}>
          <Plus size={16} />
        </button>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {schedules.map(s => (
          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{s.name}</div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{s.cronExpression}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => schedulerService.trigger(s.id)} style={{ padding: '0.4rem', background: 'transparent', border: '1px solid #3b82f6', borderRadius: 6, color: '#3b82f6', cursor: 'pointer' }}>
                <Play size={14} />
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
