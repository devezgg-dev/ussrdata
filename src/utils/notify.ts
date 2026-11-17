export function notify(message: string, kind: 'info' | 'success' | 'error' = 'info') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('loki:toast', { detail: { message, kind } }));
}
