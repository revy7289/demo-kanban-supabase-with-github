import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { Octokit } from 'npm:octokit';
const supabase = createClient(
  Deno.env.get('PROJECT_URL'),
  Deno.env.get('SERVICE_ROLE_KEY')
);
const octokit = new Octokit({
  auth: Deno.env.get('GITHUB_TOKEN'),
});
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
  if (req.method !== 'POST')
    return new Response('Method Not Allowed', {
      status: 405,
    });
  const { action, issue, owner, repo, idx } = await req.json();
  const event = req.headers.get('x-github-event');
  // GitHub Webhook으로 들어온 경우
  if (event === 'issues') {
    const { data, error } = await supabase.from('demo-kanban').upsert(
      [
        {
          html_url: issue.html_url,
          id: issue.id,
          number: issue.number,
          state: issue.state,
          title: issue.title,
          body: issue.body,
          created_at: issue.created_at,
          updated_at: issue.updated_at,
          progress: null,
          sta_dt: null,
          end_dt: null,
          assignees: issue.assignees?.map((a) => a.login).join(','),
          labels: issue.labels?.map((l) => l.name).join(','),
        },
      ],
      {
        onConflict: 'id',
      }
    );
    if (error) {
      console.error(error);
      return new Response(
        JSON.stringify({
          error,
        }),
        {
          status: 500,
        }
      );
    }
    return new Response(
      JSON.stringify({
        success: true,
        data,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
  // 클라이언트에서 직접 요청한 경우
  if (action === 'create') {
    const response = await octokit.rest.issues.create({
      owner: owner,
      repo: repo,
      title: issue.title,
      body: issue.body,
      assignees: issue.assignees,
      labels: issue.labels,
    });
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
  if (action === 'update') {
    const response = await octokit.rest.issues.update({
      owner: owner,
      repo: repo,
      issue_number: idx,
      title: issue.title,
      body: issue.body,
      assignees: issue.assignees,
      labels: issue.labels,
    });
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
  return new Response('Invalid request', {
    status: 400,
  });
});
