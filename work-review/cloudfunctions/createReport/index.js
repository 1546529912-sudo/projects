require('dotenv').config();
const cloud = require('wx-server-sdk');
const https = require('https');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const AI_PROVIDER = process.env.AI_PROVIDER || 'mock';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

exports.main = async (event) => {
  const { date, records } = event;

  if (!date || !Array.isArray(records) || records.length === 0) {
    return { code: 4001, message: '参数错误：缺少 date 或 records', data: null };
  }

  try {
    const result = AI_PROVIDER === 'mock'
      ? mockReport(date, records)
      : await generateWithAI(date, records);

    return { code: 0, message: 'success', data: result };
  } catch (err) {
    console.error('createReport 失败', err);
    return { code: 5001, message: '日报生成失败：' + err.message, data: null };
  }
};

async function generateWithAI(date, projects) {
  const projectText = projects.map(p => {
    let t = `【${p.project_name}】\n完成内容：${(p.actions || []).join('；')}`;
    if (p.problems?.length) t += `\n问题障碍：${p.problems.join('；')}`;
    if (p.next_steps?.length) t += `\n下一步：${p.next_steps.join('；')}`;
    return t;
  }).join('\n\n');

  const prompt = `你是一位工作汇报助手，请根据以下今日工作数据生成工作日报。

日期：${date}
工作内容：
${projectText}

请以 JSON 格式返回：
{
  "summary": "执行摘要（2-3句话，温暖自然，概括今日核心成果，100字以内）",
  "personal_text": "个人版日报（温暖详细，包含完整项目进展、问题和明日计划，适合个人回顾）",
  "formal_text": "汇报版日报（正式简洁，聚焦完成情况和成果，适合向上级汇报）"
}

只返回 JSON，不要其他文字。`;

  const resp = await httpPost(DEEPSEEK_BASE_URL + '/chat/completions', {
    model: DEEPSEEK_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  }, { Authorization: 'Bearer ' + DEEPSEEK_API_KEY });

  const parsed = JSON.parse(resp.choices[0].message.content);
  const tomorrow_focus = extractTomorrowFocus(projects);

  return {
    content: { date, summary: parsed.summary, projects, tomorrow_focus },
    summary: parsed.summary,
    personal_text: parsed.personal_text,
    formal_text: parsed.formal_text,
  };
}

function mockReport(date, projects) {
  const tomorrow_focus = extractTomorrowFocus(projects);
  const summary = `今日完成了 ${projects.length} 个项目的推进工作：${projects.map(p => p.project_name).join('、')}，整体进展顺利。`;
  return {
    content: { date, summary, projects, tomorrow_focus },
    summary,
    personal_text: renderPersonal(date, projects, tomorrow_focus),
    formal_text: renderFormal(date, projects, tomorrow_focus),
  };
}

function extractTomorrowFocus(projects) {
  const steps = [];
  for (const p of projects) {
    if (p.next_steps) steps.push(...p.next_steps);
  }
  return steps.slice(0, 3);
}

function renderPersonal(date, projects, tomorrow_focus) {
  const lines = [`【${date} 日报】`, ''];
  for (const p of projects) {
    lines.push(`▌ ${p.project_name}`);
    for (const a of p.actions) lines.push(`  • ${a}`);
    if (p.problems?.length) lines.push(`  ⚠ ${p.problems.join('；')}`);
    lines.push('');
  }
  if (tomorrow_focus.length) {
    lines.push('【明日计划】');
    for (const f of tomorrow_focus) lines.push(`  • ${f}`);
  }
  return lines.join('\n');
}

function renderFormal(date, projects, tomorrow_focus) {
  const lines = [`${date} 工作汇报`, '', '一、今日工作完成情况'];
  projects.forEach((p, i) => {
    lines.push(`${i + 1}. ${p.project_name}`);
    for (const a of p.actions) lines.push(`   - ${a}`);
  });
  if (tomorrow_focus.length) {
    lines.push('', '二、明日工作计划');
    tomorrow_focus.forEach((f, i) => lines.push(`${i + 1}. ${f}`));
  }
  return lines.join('\n');
}

function httpPost(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const urlObj = new URL(url);
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers,
      },
      timeout: 50000,
    }, (res) => {
      let raw = '';
      res.on('data', c => { raw += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch (e) { reject(new Error('响应 JSON 解析失败')); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('AI 请求超时')); });
    req.write(data);
    req.end();
  });
}
