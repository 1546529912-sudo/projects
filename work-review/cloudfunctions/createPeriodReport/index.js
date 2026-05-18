require('dotenv').config();
const cloud = require('wx-server-sdk');
const https = require('https');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const AI_PROVIDER = process.env.AI_PROVIDER || 'mock';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

exports.main = async (event) => {
  const { type = 'week', startDate, endDate } = event;
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!startDate || !endDate) {
    return { code: 4001, message: '参数错误：缺少日期范围', data: null };
  }

  try {
    // 云函数直接查 DB，无权限限制
    const res = await db.collection('daily_reports')
      .where({
        openid,
        reportDate: db.command.gte(startDate).and(db.command.lte(endDate)),
      })
      .orderBy('reportDate', 'asc')
      .limit(50)
      .get();

    const reports = res.data || [];
    if (reports.length === 0) {
      return { code: 4001, message: '该时间段内暂无已保存的日报，请先保存日报再生成', data: null };
    }

    const result = AI_PROVIDER === 'mock'
      ? mockPeriodReport(type, reports, startDate, endDate)
      : await generateWithAI(type, reports, startDate, endDate);

    return { code: 0, message: 'success', data: result };
  } catch (err) {
    console.error('createPeriodReport 失败', err);
    return { code: 5001, message: '报告生成失败：' + err.message, data: null };
  }
};

async function generateWithAI(type, reports, startDate, endDate) {
  const periodLabel = type === 'week' ? '周' : '月';
  const dateRange = `${startDate} 至 ${endDate}`;

  // 按项目聚合所有日报内容
  const projectMap = new Map();
  reports.forEach(r => {
    const projects = r.content?.projects || [];
    projects.forEach(p => {
      const name = (p.project_name || '日常工作').trim();
      if (!projectMap.has(name)) {
        projectMap.set(name, { project_name: name, actions: [], problems: [], next_steps: [] });
      }
      const existing = projectMap.get(name);
      existing.actions.push(...(p.actions || []));
      existing.problems.push(...(p.problems || []));
      existing.next_steps.push(...(p.next_steps || []));
    });
  });

  const projectText = Array.from(projectMap.values()).map(p => {
    let t = `【${p.project_name}】\n完成内容：${[...new Set(p.actions)].join('；')}`;
    if (p.problems.length) t += `\n遇到问题：${[...new Set(p.problems)].join('；')}`;
    if (p.next_steps.length) t += `\n下一步：${[...new Set(p.next_steps)].join('；')}`;
    return t;
  }).join('\n\n');

  const resp = await httpPost(DEEPSEEK_BASE_URL + '/chat/completions', {
    model: DEEPSEEK_MODEL,
    messages: [
      {
        role: 'system',
        content: `你是一名专业的工作报告撰写助手，擅长将多天的工作记录整理成简洁、专业的${periodLabel}报文本。`,
      },
      {
        role: 'user',
        content: `请根据以下 ${dateRange} 的工作数据生成${periodLabel}报，以 JSON 格式返回三个字段。

工作内容：
${projectText}

字段要求：

"summary"：3-5句话的${periodLabel}工作概述，突出重点成果，100字以内。

"personal_text"：个人版${periodLabel}报，严格使用以下格式：
【${dateRange} ${periodLabel}报】\n\n▌ {项目名}\n  • {完成事项}\n  ⚠ {主要问题，没有则省略}\n\n【下${periodLabel}计划】\n  • {计划}

"formal_text"：汇报版${periodLabel}报，严格使用以下格式：
${dateRange} 工作${periodLabel}报\n\n一、${periodLabel}度完成情况\n{序号}. {项目名}\n   - {完成事项}\n\n二、存在问题\n{描述，没有则写"本${periodLabel}工作推进顺利，无重大问题"}\n\n三、下${periodLabel}工作计划\n{序号}. {计划}

只返回 JSON：{"summary":"...","personal_text":"...","formal_text":"..."}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
  }, { Authorization: 'Bearer ' + DEEPSEEK_API_KEY });

  const parsed = JSON.parse(resp.choices[0].message.content);
  return {
    summary: parsed.summary,
    personal_text: parsed.personal_text,
    formal_text: parsed.formal_text,
  };
}

function mockPeriodReport(type, reports, startDate, endDate) {
  const periodLabel = type === 'week' ? '周' : '月';
  const dateRange = `${startDate} 至 ${endDate}`;
  const projectNames = [...new Set(
    reports.flatMap(r => (r.content?.projects || []).map(p => p.project_name))
  )].join('、');

  const summary = `本${periodLabel}共完成 ${reports.length} 天的工作记录，主要推进了 ${projectNames} 等项目，整体进展顺利。（Mock 数据）`;
  const personal_text = `【${dateRange} ${periodLabel}报】\n\n▌ 本${periodLabel}工作\n  • 完成了多项任务推进\n\n【下${periodLabel}计划】\n  • 继续推进各项目`;
  const formal_text = `${dateRange} 工作${periodLabel}报\n\n一、${periodLabel}度完成情况\n1. 各项目推进\n   - 完成多项工作任务\n\n二、存在问题\n本${periodLabel}工作推进顺利，无重大问题\n\n三、下${periodLabel}工作计划\n1. 继续推进各项目`;

  return { summary, personal_text, formal_text };
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
      timeout: 55000,
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
