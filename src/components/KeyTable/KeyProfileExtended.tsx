import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, Shield, Activity, Clock, Server, Info, AlertTriangle, 
  ChevronRight, TrendingUp, Cpu, Network, BarChart3, Settings,
  MessageSquare, StickyNote, Trash2, Plus, AlertCircle, Database, List
} from 'lucide-react';
import { keyService } from '../../services/KeyService';
import type { KeyNote, ApiKey } from '../../types/metrics';
import ProviderIcon from '../ProviderIcon/ProviderIcon';

interface KeyProfileExtendedProps {
  apiKey: ApiKey;
  onClose: () => void;
}

const KeyProfileExtended: React.FC<KeyProfileExtendedProps> = ({ apiKey: key, onClose }) => {
  const stats = key.stats?.extended;
  
  const [activeTab, setActiveTab] = useState<'overview' | 'traces' | 'quality' | 'notes'>('overview');
  const [newNote, setNewNote] = useState('');
  const [isAddingNote, setIsAddingNote] = useState(false);

  useEffect(() => {
    if (key.id) {
      keyService.loadNotes(key.id);
    }
  }, [key.id]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsAddingNote(true);
    await keyService.addNote(key.id, newNote, 'admin');
    setNewNote('');
    setIsAddingNote(false);
  };

  if (!stats) return null;

  const reputationColor = stats.reputationScore > 80 ? '#10b981' : stats.reputationScore > 50 ? '#f59e0b' : '#ef4444';
  const stabilityColor = stats.stabilityIndex > 0.8 ? '#10b981' : stats.stabilityIndex > 0.5 ? '#f59e0b' : '#ef4444';

  const formatMs = (ms: number) => `${Math.round(ms)}ms`;

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Tab Navigation */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '0.5rem' }}>
        {[
          { id: 'overview', label: 'Обзор', icon: Activity },
          { id: 'traces', label: 'Трассировка', icon: List },
          { id: 'quality', label: 'Качество', icon: BarChart3 },
          { id: 'notes', label: 'Заметки и логи', icon: StickyNote },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'overview' | 'traces' | 'quality' | 'notes')}
            style={{
              padding: '0.75rem 1.25rem',
              background: activeTab === tab.id ? 'rgba(59,130,246,0.1)' : 'transparent',
              border: 'none',
              borderBottom: `2px solid ${activeTab === tab.id ? '#3b82f6' : 'transparent'}`,
              color: activeTab === tab.id ? '#3b82f6' : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header Tags & SLA */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ 
                padding: '0.3rem 0.8rem', 
                background: stats.state === 'HEALTHY' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', 
                color: stats.state === 'HEALTHY' ? '#10b981' : '#ef4444', 
                borderRadius: 100, fontSize: '0.65rem', fontWeight: 800,
                border: `1px solid ${stats.state === 'HEALTHY' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`
              }}>
                {stats.state === 'HEALTHY' ? 'ЗДОРОВ' : stats.state}
              </span>
              <div style={{ display: 'flex', gap: '0.25rem', marginLeft: '1rem' }}>
                {[
                  { id: 'LOW_LATENCY', label: 'НИЗКАЯ ЗАДЕРЖКА' },
                  { id: 'HIGH_QUALITY', label: 'ВЫСОКОЕ КАЧЕСТВО' },
                  { id: 'BALANCED', label: 'БАЛАНС' }
                ].map(mode => (
                  <button 
                    key={mode.id} 
                    onClick={() => keyService.setSLA(key.id, mode.id)}
                    style={{ 
                      padding: '0.2rem 0.5rem', fontSize: '0.6rem', 
                      background: stats.activeSLA === mode.id ? 'rgba(96,165,250,0.2)' : 'transparent', 
                      color: stats.activeSLA === mode.id ? '#60a5fa' : 'var(--text-muted)',
                      border: `1px solid ${stats.activeSLA === mode.id ? 'rgba(96,165,250,0.3)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: 4, cursor: 'pointer'
                    }}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="metric-card" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>ИНДЕКС РЕПУТАЦИИ</span>
                  <Shield size={16} color={reputationColor} />
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 900, color: reputationColor }}>{Math.round(stats.reputationScore)}</span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>/ 100</span>
                </div>
              </div>

              <div className="metric-card" style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>КОНКУРЕНТНОСТЬ</span>
                  <Database size={16} color="#3b82f6" />
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 900 }}>{stats.currentConcurrentRequests}<span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}> / {stats.rules.maxConcurrentRequests}</span></div>
              </div>
            </div>

            {/* Latency Breakdown */}
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: '1.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <Clock size={14} color="#3b82f6" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Сегментация TTFT</span>
              </div>
              {stats.latencyBreakdown && (
                <div style={{ display: 'flex', height: 24, borderRadius: 6, overflow: 'hidden' }}>
                  <div style={{ width: `${(stats.latencyBreakdown.dns / stats.latencyBreakdown.total) * 100}%`, background: '#3b82f6' }} />
                  <div style={{ width: `${(stats.latencyBreakdown.tls / stats.latencyBreakdown.total) * 100}%`, background: '#a855f7' }} />
                  <div style={{ width: `${(stats.latencyBreakdown.connect / stats.latencyBreakdown.total) * 100}%`, background: '#ec4899' }} />
                  <div style={{ width: `${((stats.latencyBreakdown.ttft - (stats.latencyBreakdown.dns + stats.latencyBreakdown.tls + stats.latencyBreakdown.connect)) / stats.latencyBreakdown.total) * 100}%`, background: '#10b981' }} />
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'traces' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
             <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
               <thead>
                 <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                   <th style={{ padding: '0.75rem' }}>ID Трассировки</th>
                   <th style={{ padding: '0.75rem' }}>Задача</th>
                   <th style={{ padding: '0.75rem' }}>Регион</th>
                   <th style={{ padding: '0.75rem' }}>Статус</th>
                 </tr>
               </thead>
               <tbody>
                 {stats.traces.map(t => (
                   <tr key={t.traceId} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                     <td style={{ padding: '0.75rem', color: '#3b82f6', fontFamily: 'monospace' }}>{t.traceId}</td>
                     <td style={{ padding: '0.75rem' }}>{t.taskType}</td>
                     <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{t.region}</td>
                     <td style={{ padding: '0.75rem' }}>{t.status === 'ok' ? 'успешно' : t.status}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </motion.div>
        )}

        {activeTab === 'quality' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <h4 style={{ fontSize: '0.8rem', margin: 0, color: 'var(--text-muted)' }}>Консистентность структуры</h4>
               <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${stats.quality.structureConsistency * 100}%` }} style={{ height: '100%', background: '#10b981', borderRadius: 4 }} />
               </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               <h4 style={{ fontSize: '0.8rem', margin: 0, color: 'var(--text-muted)' }}>Следование инструкциям</h4>
               <div style={{ height: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${stats.quality.instructionFollowing * 100}%` }} style={{ height: '100%', background: '#3b82f6', borderRadius: 4 }} />
               </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'notes' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Добавить заметку оператора (SQL-backed)..." 
                style={{ flex: 1, padding: '0.75rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
              />
              <button onClick={handleAddNote} disabled={!newNote.trim()} className="btn-primary" style={{ padding: '0.5rem 1.5rem' }}>
                <Plus size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {(key.notes || []).slice().sort((a, b) => b.timestamp - a.timestamp).map(note => (
                <div key={note.id} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.7rem' }}>
                    <span style={{ fontWeight: 800, color: note.type === 'system' ? '#3b82f6' : '#a855f7' }}>
                      {note.type === 'system' ? 'СИСТЕМА' : 'ОПЕРАТОР'} • {note.author === 'Operator' ? 'Оператор' : note.author}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>{new Date(note.timestamp).toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>{note.text}</div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default KeyProfileExtended;
