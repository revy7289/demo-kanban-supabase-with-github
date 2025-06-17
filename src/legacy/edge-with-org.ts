import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient } from 'jsr:@supabase/supabase-js@2';
const supabase = createClient(
  Deno.env.get('PROJECT_URL'),
  Deno.env.get('SERVICE_ROLE_KEY')
);
function sanitizeTableName(name) {
  const sanitized = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  // 숫자로 시작하면 앞에 prefix 추가
  return /^[0-9]/.test(sanitized) ? `repo_${sanitized}` : sanitized;
}
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
    });
  }
  const payload = await req.json();
  const action = payload.action;
  if (action !== 'created') {
    return new Response(`Ignored action: ${action}`, {
      status: 200,
    });
  }
  const repoName = sanitizeTableName(payload.repository?.name);
  if (!repoName) {
    return new Response('Missing repository name', {
      status: 400,
    });
  }
  const { error } = await supabase.rpc('create_repo_table', {
    repo_name: repoName,
  });
  if (error) {
    console.error('Error creating table:', error);
    return new Response('Table creation failed', {
      status: 500,
    });
  }
  return new Response(`Table '${repoName}' created successfully.`, {
    status: 200,
  });
});
