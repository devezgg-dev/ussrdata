import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: cors });

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authorization = req.headers.get('Authorization');
  if (!authorization) return Response.json({ error: '인증이 필요합니다.' }, { status: 401, headers: cors });

  const callerClient = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !caller) return Response.json({ error: '유효하지 않은 세션입니다.' }, { status: 401, headers: cors });

  const adminClient = createClient(url, serviceKey);
  const { data: adminRole } = await adminClient.from('admin_roles').select('user_id').eq('user_id', caller.id).maybeSingle();
  if (!adminRole) return Response.json({ error: '관리자 권한이 필요합니다.' }, { status: 403, headers: cors });

  const { targetUserId } = await req.json();
  if (!targetUserId || targetUserId === caller.id) return Response.json({ error: '자기 자신은 삭제할 수 없습니다.' }, { status: 400, headers: cors });
  const { data: targetAdmin } = await adminClient.from('admin_roles').select('user_id').eq('user_id', targetUserId).maybeSingle();
  if (targetAdmin) return Response.json({ error: '다른 관리자는 이 기능으로 삭제할 수 없습니다.' }, { status: 403, headers: cors });

  const { error } = await adminClient.auth.admin.deleteUser(targetUserId);
  if (error) return Response.json({ error: error.message }, { status: 400, headers: cors });
  await adminClient.from('admin_audit_logs').insert({ actor_id: caller.id, action: 'USER_ACCOUNT_DELETED', target_type: 'user', target_id: targetUserId });
  return Response.json({ success: true }, { headers: cors });
});
