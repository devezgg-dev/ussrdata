interface Env { TURNSTILE_SECRET_KEY: string }
export const onRequestPost = async ({ request, env }: { request: Request; env: Env }) => {
  if (!env.TURNSTILE_SECRET_KEY) return Response.json({ success: false, error: 'Turnstile secret is not configured' }, { status: 503 });
  const body = await request.json().catch(() => null) as { token?: string } | null;
  if (!body?.token || body.token.length > 4096) return Response.json({ success: false }, { status: 400 });
  const form = new FormData(); form.set('secret', env.TURNSTILE_SECRET_KEY); form.set('response', body.token);
  const ip = request.headers.get('CF-Connecting-IP'); if (ip) form.set('remoteip', ip);
  const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
  const data = await result.json() as { success?: boolean };
  return Response.json({ success: data.success === true }, { status: data.success ? 200 : 400 });
};
