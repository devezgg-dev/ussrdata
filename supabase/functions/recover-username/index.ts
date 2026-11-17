import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });
  const { email } = await req.json().catch(() => ({}));
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: '이메일 형식을 확인해 주세요.' }, { status: 400, headers: cors });
  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const resendKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('RECOVERY_FROM_EMAIL');
  if (!resendKey || !from) return Response.json({ error: '메일 발송 설정이 완료되지 않았습니다.' }, { status: 503, headers: cors });
  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  let foundUser: { id: string; email?: string } | null = null;
  for (let page = 1; page <= 20 && !foundUser; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 500 });
    if (error || !data.users.length) break;
    foundUser = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) || null;
    if (data.users.length < 500) break;
  }
  if (foundUser) {
    const { data: profile } = await admin.from('profiles').select('nickname').eq('id', foundUser.id).maybeSingle();
    if (profile?.nickname) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [email], subject: '인민정보국 계정 식별자 안내', text: `요청하신 계정의 사용자 이름은 다음과 같습니다.\n\n${profile.nickname}\n\n본인이 요청하지 않았다면 이 메일을 무시하세요.` }),
      });
    }
  }
  // Do not disclose whether an email exists in the system.
  return Response.json({ success: true, message: '등록된 주소라면 계정 안내 메일을 보냈습니다.' }, { headers: cors });
});
