import React, { useEffect, useRef } from 'react';

declare global {
  interface Window { turnstile?: { render: (el: HTMLElement, options: Record<string, unknown>) => string; remove: (id: string) => void } }
}

let scriptPromise: Promise<void> | null = null;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile]');
    if (existing) { existing.addEventListener('load', () => resolve(), { once: true }); return; }
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true; script.defer = true; script.dataset.turnstile = 'true';
    script.onload = () => resolve(); script.onerror = () => reject(new Error('Turnstile 스크립트를 불러오지 못했습니다.'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export async function verifyTurnstile(token: string) {
  const response = await fetch('/api/turnstile', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
  });
  const result = await response.json().catch(() => ({}));
  return response.ok && result.success === true;
}

export const TurnstileWidget: React.FC<{ onToken: (token: string) => void }> = ({ onToken }) => {
  const host = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onToken);
  callbackRef.current = onToken;
  const widgetId = useRef<string | null>(null);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
  useEffect(() => {
    let cancelled = false;
    if (!siteKey || !host.current) return;
    loadTurnstile().then(() => {
      if (cancelled || !host.current || !window.turnstile) return;
      widgetId.current = window.turnstile.render(host.current, {
        sitekey: siteKey, theme: 'dark', callback: (token: string) => callbackRef.current(token),
        'expired-callback': () => callbackRef.current(''), 'error-callback': () => callbackRef.current(''),
      });
    }).catch(() => callbackRef.current(''));
    return () => { cancelled = true; if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current); };
  }, [siteKey]);
  if (!siteKey) return <p className="text-xs text-red-300">Turnstile 사이트 키가 설정되지 않았습니다.</p>;
  return <div ref={host} className="min-h-[66px]" />;
};
