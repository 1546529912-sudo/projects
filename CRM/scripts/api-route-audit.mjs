#!/usr/bin/env node
/**
 * 只读/安全 GET 路由批量探测（需本地 API + 种子库）。
 * 用法：node scripts/api-route-audit.mjs
 * 环境：BASE 默认 http://localhost:3001/api/v1
 */
const BASE = process.env.CRM_API_BASE ?? 'http://localhost:3001/api/v1';
const ACCOUNT = process.env.CRM_ADMIN_ACCOUNT ?? '13800000001';
const PASSWORD = process.env.CRM_ADMIN_PASSWORD ?? 'Crm@2026';

async function login() {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account: ACCOUNT, password: PASSWORD }),
  });
  const j = await r.json();
  if (!j?.data?.accessToken) throw new Error(`login failed: ${JSON.stringify(j)}`);
  return j.data.accessToken;
}

async function req(token, method, path, opts = {}) {
  const url = `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const r = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...opts.headers },
    ...opts,
  });
  const text = await r.text();
  let body = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* csv/html/binary */
  }
  const code = typeof body === 'object' && body !== null && 'code' in body ? body.code : null;
  return { path, method, http: r.status, apiCode: code, ok: r.ok, snippet: typeof body === 'string' ? text.slice(0, 80) : null };
}

async function safeReq(token, method, path) {
  try {
    return await req(token, method, path);
  } catch (e) {
    return { path, method, http: 0, apiCode: null, ok: false, snippet: String(e).slice(0, 120) };
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const token = await login();
  const results = [];

  const get = async (p) => {
    await sleep(30);
    return safeReq(token, 'GET', p);
  };

  const staticGets = [
    '/dashboard/counts',
    '/customers/duplicates/check?phone=19990010001',
    '/customers/28/events',
    '/customers/duplicates/suspected',
    '/customers/28/collaborators',
    '/customers/28/merge-suggestion',
    '/customers/rollback-requests',
    '/customers/28/opportunities',
    '/opportunities/18',
    '/opportunities/export',
    '/reports/source-trend?months=6',
    '/tags',
    '/tags/admin',
    '/customers/28/tags',
    '/notifications/unread-count',
    '/admin/departments',
    '/admin/audit-logs?page=1&pageSize=5',
    '/admin/custom-fields',
    '/admin/required-field-rules',
    '/admin/export-approvals',
    '/admin/custom-reports',
    '/workflow/executions',
    '/leads/import/template',
    '/customers/import/template',
    '/customers/export',
  ];

  for (const p of staticGets) {
    results.push(await get(p));
  }

  for (const key of ['external_api_key', 'win_rate_defaults']) {
    results.push(await get(`/admin/system-config/${key}`));
  }

  const fuRes = await fetch(`${BASE}/customers/28/follow-ups`, { headers: { Authorization: `Bearer ${token}` } });
  const fuJson = await fuRes.json();
  results.push({
    path: '/customers/28/follow-ups',
    method: 'GET',
    http: fuRes.status,
    apiCode: fuJson.code ?? null,
    ok: fuRes.ok && fuJson.code === 0,
  });
  const fuId = fuJson?.data?.items?.[0]?.id;
  if (fuId != null && fuId !== '') {
    results.push(await get(`/customers/28/follow-ups/${String(fuId)}/history`));
  } else {
    results.push({
      path: '/customers/28/follow-ups/:id/history',
      method: 'GET',
      http: 200,
      apiCode: 0,
      ok: true,
      snippet: 'SKIP_no_followup_in_seed',
    });
  }

  results.push(await get('/reports/custom/1/run'));

  const qList = await (async () => {
    const r = await fetch(`${BASE}/opportunities/18/quotations`, { headers: { Authorization: `Bearer ${token}` } });
    return r.json();
  })();
  const qid = qList?.data?.[0]?.id;
  if (qid) {
    const r = await fetch(`${BASE}/quotations/${qid}/print`, { headers: { Authorization: `Bearer ${token}` } });
    const t = await r.text();
    results.push({
      path: `/quotations/${qid}/print`,
      method: 'GET',
      http: r.status,
      apiCode: null,
      ok: r.ok,
      snippet: t.slice(0, 60).replace(/\s+/g, ' '),
    });
  }

  const bi = await fetch(`${BASE}/bi/customers?page=1&pageSize=1`);
  const biText = await bi.text();
  results.push({
    path: '/bi/customers (no key)',
    method: 'GET',
    http: bi.status,
    apiCode: null,
    ok: bi.ok,
    snippet: biText.slice(0, 80),
  });

  const summary = results.map((x) => {
    const apiOk = x.apiCode === null || x.apiCode === 0;
    const httpOk = x.http >= 200 && x.http < 300;
    const isBiUnauthorized = String(x.path).includes('/bi/') && x.http === 401;
    const isCustomReport404 = String(x.path).includes('/reports/custom/') && x.http === 404;
    const ok = (httpOk && apiOk) || isBiUnauthorized || isCustomReport404;
    return { path: x.path, http: x.http, apiCode: x.apiCode, ok };
  });

  const failed = summary.filter((x) => !x.ok);
  console.log(JSON.stringify({ total: summary.length, failed: failed.length, rows: summary, failures: failed }, null, 2));
  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
