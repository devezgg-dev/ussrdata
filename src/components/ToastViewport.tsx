import React, { useEffect, useState } from 'react';

type Toast = { id: number; message: string; kind: 'info' | 'success' | 'error' };
export const ToastViewport: React.FC = () => {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      const item = { id: Date.now() + Math.random(), message: String(detail.message || ''), kind: detail.kind || 'info' };
      setItems((old) => [...old.slice(-2), item]);
      window.setTimeout(() => setItems((old) => old.filter((x) => x.id !== item.id)), 4200);
    };
    window.addEventListener('loki:toast', handler);
    return () => window.removeEventListener('loki:toast', handler);
  }, []);
  return <div aria-live="polite" aria-atomic="false" className="fixed z-[100] top-4 right-4 left-4 sm:left-auto sm:w-96 flex flex-col gap-2 pointer-events-none">
    {items.map((item) => <div key={item.id} role="status" className={`pointer-events-auto rounded-xl border px-4 py-3 text-sm shadow-2xl backdrop-blur ${item.kind === 'error' ? 'bg-rose-950/95 border-rose-700 text-rose-100' : item.kind === 'success' ? 'bg-emerald-950/95 border-emerald-700 text-emerald-100' : 'bg-slate-900/95 border-slate-700 text-slate-100'}`}>{item.message}</div>)}
  </div>;
};
