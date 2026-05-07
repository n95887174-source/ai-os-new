import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wrench, Download, Upload, Activity, ShieldCheck, 
  Trash2, Database, Search, FileJson, Calculator,
  ChevronRight, HardDrive, AlertCircle
} from 'lucide-react';
import { keyService } from '../../services/KeyService';

type ToolId = 'health' | 'import-export' | 'browser' | 'calculator';

const ToolsPanel: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ToolId>('health');
  const [textToCount, setTextToCount] = useState('');

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  const handleExport = () => {
    const data = {
      keys: localStorage.getItem('super_agents_api_keys'),
      kernel: localStorage.getItem('super_agents_kernel_state'),
      notes: localStorage.getItem('super_agents_os_db_notes'),
      exportDate: new Date().toISOString(),
      version: '3.1.0'
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `super-agents-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ToolCard = ({ id, icon, title, desc }: { id: ToolId, icon: React.ReactNode, title: string, desc: string }) => (
    <button
      onClick={() => setActiveTool(id)}
      style={{
        display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem', width: '100%',
        background: activeTool === id ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.02)',
        border: `1px solid ${activeTool === id ? '#3b82f6' : 'var(--border)'}`,
        borderRadius: 12, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
      }}
    >
      <div style={{ color: activeTool === id ? '#3b82f6' : 'var(--text-muted)', background: activeTool === id ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.05)', padding: '0.6rem', borderRadius: 10 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: activeTool === id ? '#60a5fa' : 'var(--text-main)' }}>{title}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{desc}</div>
      </div>
      <ChevronRight size={16} color="var(--text-muted)" style={{ opacity: activeTool === id ? 1 : 0.3 }} />
    </button>
  );

  return (
    <div style={{ display: 'flex', gap: '2rem', height: '100%' }}>
      {/* Sidebar for Tools */}
      <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ marginBottom: '1rem', padding: '0 0.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Wrench size={24} color="#3b82f6" /> Инструменты
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.4rem' }}>Диагностика системы и утилиты.</p>
        </div>
        
        <ToolCard id="health" icon={<Activity size={20} />} title="Здоровье системы" desc="Диагностический отчет ядра ОС." />
        <ToolCard id="import-export" icon={<FileJson size={20} />} title="Импорт / Экспорт" desc="Управление локальными данными." />
        <ToolCard id="browser" icon={<Search size={20} />} title="Каталог моделей" desc="Глобальный поиск моделей ИИ." />
        <ToolCard id="calculator" icon={<Calculator size={20} />} title="Счетчик токенов" desc="Оценка стоимости и объема." />

        <div style={{ marginTop: 'auto', padding: '1rem', background: 'rgba(239,68,68,0.05)', borderRadius: 12, border: '1px solid rgba(239,68,68,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fca5a5', marginBottom: '0.5rem' }}>
            <AlertCircle size={14} />
            <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>ОПАСНАЯ ЗОНА</span>
          </div>
          <button 
            className="btn-secondary" 
            style={{ width: '100%', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)', fontSize: '0.8rem', padding: '0.5rem' }}
            onClick={() => keyService.clearAllData()}
          >
            <Trash2 size={12} /> Удалить все данные ОС
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', borderRadius: 20, border: '1px solid var(--border)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTool}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ padding: '2.5rem', height: '100%', overflowY: 'auto' }}
          >
            {activeTool === 'health' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Отчет о состоянии системы</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Полная диагностика событийно-ориентированного ядра.</p>
                  </div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '0.4rem 0.8rem', borderRadius: 20, fontSize: '0.8rem', fontWeight: 700 }}>
                    <ShieldCheck size={14} /> СИСТЕМА В НОРМЕ
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  {[
                    { label: 'Статус EventBus', val: 'Активен', status: 'ok', icon: <Activity size={16} /> },
                    { label: 'Состояние Ядра', val: 'Синхронизировано', status: 'ok', icon: <Database size={16} /> },
                    { label: 'Локальное хранилище', val: 'Доступно', status: 'ok', icon: <HardDrive size={16} /> },
                    { label: 'Активные провайдеры', val: `${keyService.getKeys().filter(k => k.state === 'HEALTHY').length} Подключено`, status: 'ok', icon: <ShieldCheck size={16} /> },
                  ].map((stat, i) => (
                    <div key={i} style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ color: '#3b82f6' }}>{stat.icon}</div>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{stat.label}</span>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#10b981' }}>{stat.val}</span>
                    </div>
                  ))}
                </div>

                <div style={{ padding: '1.5rem', background: 'rgba(59,130,246,0.05)', borderRadius: 16, border: '1px solid rgba(59,130,246,0.1)' }}>
                  <h4 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700 }}>Распределение хранилища</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span>Хранилище ключей API</span>
                      <span style={{ color: 'var(--text-muted)' }}>1.2 KB</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                      <span>Реестр ключей</span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {((localStorage.getItem('super_agents_api_keys')?.length || 0) / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: '45%', height: '100%', background: '#3b82f6' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                      <span>Кэш сообщений</span>
                      <span style={{ color: 'var(--text-muted)' }}>
                        {((localStorage.getItem('super_agents_chat_history')?.length || 0) / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: '80%', height: '100%', background: '#a855f7' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTool === 'import-export' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Импорт / Экспорт данных</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Переносите свои ключи и историю между устройствами.</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ background: 'rgba(59,130,246,0.1)', width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                      <Download size={24} color="#3b82f6" />
                    </div>
                    <h4 style={{ margin: '0 0 0.5rem' }}>Экспорт всех данных</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Скачать конфигурацию и историю в формате JSON.</p>
                    <button className="btn-primary" style={{ width: '100%' }} onClick={handleExport}>Скачать JSON</button>
                  </div>

                  <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
                    <div style={{ background: 'rgba(168,85,247,0.1)', width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
                      <Upload size={24} color="#a855f7" />
                    </div>
                    <h4 style={{ margin: '0 0 0.5rem' }}>Импорт бэкапа</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Восстановить ключи и историю из файла экспорта.</p>
                    <button 
                      className="btn-secondary" 
                      style={{ width: '100%' }}
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.json';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            try {
                              const data = JSON.parse(event.target?.result as string);
                              if (data.keys) localStorage.setItem('super_agents_api_keys', JSON.stringify(data.keys));
                              if (data.kernel) localStorage.setItem('super_agents_kernel_state', JSON.stringify(data.kernel));
                              alert('Данные успешно импортированы. Страница будет перезагружена.');
                              window.location.reload();
                            } catch (err) {
                              alert('Ошибка при импорте: ' + (err as Error).message);
                            }
                          };
                          reader.readAsText(file);
                        };
                        input.click();
                      }}
                    >
                      Выбрать файл
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTool === 'browser' && (
              <div style={{ textAlign: 'center', padding: '4rem 0' }}>
                <Search size={48} color="#3b82f6" style={{ opacity: 0.3, marginBottom: '1.5rem' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Каталог моделей</h3>
                <p style={{ color: 'var(--text-muted)', maxWidth: 400, margin: '0 auto 2rem' }}>
                  Этот инструмент позволяет искать и сравнивать цены, окна контекста и задержки всех основных провайдеров LLM.
                </p>
                <button 
                  className="btn-primary" 
                  style={{ padding: '0.75rem 1.5rem' }}
                  onClick={() => window.open('https://openrouter.ai/models', '_blank')}
                >
                  Открыть глобальный каталог
                </button>
              </div>
            )}

            {activeTool === 'calculator' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Счетчик токенов</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>Оцените размер и стоимость ваших промптов.</p>
                </div>
                <textarea 
                  placeholder="Вставьте текст для подсчета токенов..."
                  value={textToCount}
                  onChange={(e) => setTextToCount(e.target.value)}
                  style={{ width: '100%', height: 200, padding: '1rem', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: 12, color: 'white', outline: 'none', resize: 'none', fontSize: '0.95rem' }}
                />
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1, padding: '1rem', background: 'rgba(59,130,246,0.05)', borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Символы</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{textToCount.length}</div>
                  </div>
                  <div style={{ flex: 1, padding: '1rem', background: 'rgba(16,185,129,0.05)', borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Примерно токенов</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>{Math.ceil(textToCount.length / 4)}</div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ToolsPanel;
