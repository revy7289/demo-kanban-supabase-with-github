// // Setup type definitions for built-in Supabase Runtime APIs
// import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
// import { createClient } from 'jsr:@supabase/supabase-js@2';
// import { Octokit } from 'npm:octokit';
// // create clients and sdk
// const supabase = createClient(Deno.env.get('PROJECT_URL'), Deno.env.get('SERVICE_ROLE_KEY'));
// const octokit = new Octokit({
//   auth: Deno.env.get('GITHUB_TOKEN')
// });
// // run the sync logic
// Deno.serve(async (req)=>{
//   if (req.method === 'OPTIONS') {
//     return new Response(null, {
//       status: 204,
//       headers: {
//         'Access-Control-Allow-Origin': '*',
//         'Access-Control-Allow-Methods': 'POST, OPTIONS',
//         'Access-Control-Allow-Headers': 'Content-Type, x-github-event'
//       }
//     });
//   }
//   if (req.method !== 'POST') return new Response('Method Not Allowed', {
//     status: 405
//   });
//   // coreParams for operationContext
//   const payload = await req.json();
//   const event = req.headers.get('x-github-event');
//   const action = payload.action;
//   // when user create new repo with github, then create table as same name
//   if (event === 'repository') {
//     const repoName = sanitizeTableName(payload.repository.name);
//     if (action !== 'created') {
//       return new Response(`Ignored action: ${action}`, {
//         status: 200
//       });
//     }
//     if (!repoName) {
//       return new Response('Missing repository name', {
//         status: 400
//       });
//     }
//     const { error } = await supabase.rpc('create_repo_table', {
//       repo_name: repoName
//     });
//     if (error) {
//       console.error('Error! creating table:', error);
//       return new Response('Table creation failed', {
//         status: 500
//       });
//     }
//     return new Response(`Table '${repoName}' created`, {
//       status: 200
//     });
//   }
//   // when user edit kanban, then sync with github issue
//   if (event === 'issues') {
//     if (action === 'create') {
//       const createIssue = await octokit.rest.issues.create({
//         owner: payload.owner,
//         repo: payload.repo,
//         title: payload.issue.title,
//         body: payload.issue.body,
//         assignees: payload.issue.assignees,
//         labels: payload.issue.labels
//       });
//       return new Response(JSON.stringify(createIssue), {
//         status: 200,
//         headers: {
//           'Content-Type': 'application/json',
//           'Access-Control-Allow-Origin': '*'
//         }
//       });
//     }
//     if (action === 'update') {
//       const updateIssue = await octokit.rest.issues.update({
//         owner: payload.owner,
//         repo: payload.repo,
//         issue_number: payload.issue_number,
//         title: payload.issue.title,
//         body: payload.issue.body,
//         assignees: payload.issue.assignees,
//         labels: payload.issue.labels
//       });
//       return new Response(JSON.stringify(updateIssue), {
//         status: 200,
//         headers: {
//           'Content-Type': 'application/json',
//           'Access-Control-Allow-Origin': '*'
//         }
//       });
//     }
//     // if there are no matched table, then create new one as same name
//     const repoName = sanitizeTableName(payload.repository.name);
//     console.log(repoName);
//     const { data: checkData, error: checkError } = await supabase.rpc('check_repo_table', {
//       repo_name: payload.repo || repoName
//     });
//     if (checkError) {
//       console.error('Error! checking table:', checkError);
//       return new Response('Internal Server Error', {
//         status: 500
//       });
//     }
//     if (!checkData) {
//       const { error: createError } = await supabase.rpc('create_repo_table', {
//         repo_name: payload.repo || repoName
//       });
//       if (createError) {
//         console.error('Error! creating table:', createError);
//         return new Response('Table creation failed', {
//           status: 500
//         });
//       }
//     }
//     // when user edit issue with github, then sync with supabase db
//     const { data, error } = await supabase.from(repoName).upsert([
//       {
//         html_url: payload.issue.html_url,
//         id: payload.issue.id,
//         number: payload.issue.number,
//         state: payload.issue.state,
//         title: payload.issue.title,
//         body: payload.issue.body,
//         created_at: payload.issue.created_at,
//         updated_at: payload.issue.updated_at,
//         progress: payload.issue.progress,
//         sta_dt: payload.issue.sta_dt,
//         end_dt: payload.issue.end_dt,
//         assignees: payload.issue.assignees.map((a)=>a.login),
//         labels: payload.issue.labels.map((l)=>l.name),
//         parent: payload.issue.parent
//       }
//     ], {
//       onConflict: 'id'
//     });
//     if (error) {
//       console.error('Error! upserting table:', error);
//       return new Response(JSON.stringify({
//         error
//       }), {
//         status: 500
//       });
//     }
//     return new Response(JSON.stringify({
//       success: true,
//       data
//     }), {
//       headers: {
//         'Content-Type': 'application/json',
//         'Access-Control-Allow-Origin': '*'
//       }
//     });
//   }
//   // if req not include any of logic
//   return new Response('Invalid request', {
//     status: 400
//   });
// });
// function sanitizeTableName(name) {
//   // 소문자로 내리고 `대쉬 -`를 `언더바 _`로 대치
//   const sanitized = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
//   // 숫자로 시작하면 앞에 prefix 추가
//   return /^[0-9]/.test(sanitized) ? `repo_${sanitized}` : sanitized;
// }
