import React, { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../../stores/useChatStore';
import { personaService } from '../../kernel/instances';

export const PersonaSelector: React.FC = () => {
  const { setSystemPrompt } = useChatStore();
  const [open, setOpen] = useState(false);
  const [activePersona, setActivePersona] = useState<{ id: string; name: string; systemPrompt: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey); };
  }, [open]);

  useEffect(() => {
    const tryLoad = () => {
      const ps = personaService as { getAll?: () => { id: string; name: string; systemPrompt: string }[]; getActive?: () => { id: string; name: string; systemPrompt: string } | null } | undefined;
      if (!ps) return false;
      const all = ps.getAll ? ps.getAll() : [];
      const personas = Array.isArray(all) ? all : [];
      const active = ps.getActive ? ps.getActive() : null;
      setActivePersona(active ?? (personas.length > 0 ? personas[0] : null));
      return true;
    };

    if (tryLoad()) return;

    // Service not ready yet — retry after a short delay
    const timeout = setTimeout(() => { tryLoad(); }, 500);
    return () => clearTimeout(timeout);
  }, []);

  const handlePersonaChange = (personaId: string) => {
    const ps = personaService as { setActive?: (id: string) => void; getActive?: () => { id: string; name: string; systemPrompt: string } | null } | undefined;
    ps?.setActive?.(personaId);
    const active = ps?.getActive?.();
    if (active) setSystemPrompt(active.systemPrompt);
    setOpen(false);
  };

  if (!activePersona) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: 8,
          border: '1px solid var(--border)',
          fontSize: '0.85rem',
          cursor: 'pointer',
          minWidth: 120,
          color: 'inherit',
        }}
      >
        <div style={{ fontWeight: 600 }}>{activePersona.name}</div>
        <svg
          width={12}
          height={12}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      
      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 1000,
            marginTop: '0.5rem',
            minWidth: 200,
            maxHeight: 300,
            overflowY: 'auto',
            background: 'rgba(0,0,0,0.8)',
            borderRadius: 8,
            border: '1px solid var(--border)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {(() => {
            const ps = personaService as { getAll?: () => { id: string; name: string; systemPrompt: string }[]; getActive?: () => { id: string; name: string; systemPrompt: string } | null } | undefined;
            const all = ps?.getAll ? ps.getAll() : [];
            const personas = Array.isArray(all) ? all : [];
            return personas.map((persona) => (
              <div
                key={persona.id}
                onClick={() => handlePersonaChange(persona.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  cursor: 'pointer',
                  background: persona.id === activePersona.id ? 'rgba(59,130,246,0.2)' : 'transparent',
                  borderRadius: 6,
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 600,
                    color: '#fff',
                    fontSize: '0.75rem',
                  }}
                >
                  P
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{persona.name}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {persona.systemPrompt ? persona.systemPrompt.slice(0, 40) + '...' : ''}
                  </div>
                </div>
                {persona.id === activePersona.id && (
                  <svg
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={2}
                  >
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                )}
              </div>
            ));
          })()}
        </div>
      )}
    </div>
  );
};