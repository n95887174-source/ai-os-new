import { useEffect, useRef } from 'react';

type Combo = string;

function normalize(combo: Combo): { key: string; ctrl: boolean; shift: boolean; alt: boolean; meta: boolean } {
  const parts = combo.toLowerCase().split('+').map(p => p.trim());
  return {
    key: parts[parts.length - 1],
    ctrl: parts.includes('ctrl') || parts.includes('control'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt') || parts.includes('option'),
    meta: parts.includes('meta') || parts.includes('cmd') || parts.includes('command'),
  };
}

export function useKeyboardShortcut(combo: Combo, handler: (e: KeyboardEvent) => void, enabled = true): void {
  const handlerRef = useRef(handler);
  // eslint-disable-next-line react-hooks/refs
  handlerRef.current = handler;
  useEffect(() => {
    if (!enabled) return;
    const expected = normalize(combo);
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== expected.key) return;
      if (e.ctrlKey !== expected.ctrl) return;
      if (e.shiftKey !== expected.shift) return;
      if (e.altKey !== expected.alt) return;
      if (e.metaKey !== expected.meta) return;
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA' || tgt.isContentEditable)) {
        if (!combo.toLowerCase().includes('shift')) return;
      }
      e.preventDefault();
      handlerRef.current(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [combo, enabled]);
}
