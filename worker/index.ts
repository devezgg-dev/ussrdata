// Cloudflare Worker: 정적 파일(dist) 서빙 + /api/turnstile 서버 검증
interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  TURNSTILE_SECRET_KEY?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/turnstile') {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
      }
      if (!env.TURNSTILE_SECRET_KEY) {
        return Response.json({ success: false, error: 'Turnstile secret is not configured' }, { status: 503 });
      }
      const body = (await request.json().catch(() => null)) as { token?: string } | null;
      if (!body?.token || body.token.length > 4096) {
        return Response.json({ success: false }, { status: 400 });
      }
      const form = new FormData();
      form.set('secret', env.TURNSTILE_SECRET_KEY);
      form.set('response', body.token);
      const ip = request.headers.get('CF-Connecting-IP');
      if (ip) form.set('remoteip', ip);
      const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        body: form,
      });
      const data = (await result.json()) as { success?: boolean };
      return Response.json({ success: data.success === true }, { status: data.success ? 200 : 400 });
    }

    return env.ASSETS.fetch(request);
  },
};
