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
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  const { text, userContext = '' } = event;

  if (!text || text.trim().length < 3) {
    return { code: 4001, message: '参数错误：文字内容不能为空', data: null };
  }

  const today = new Date().toISOString().slice(0, 10);
  const existingProjects = await getTodayProjectNames(openid, today);

  const startTime = Date.now();

  try {
    let result;
    if (AI_PROVIDER === 'mock') {
      result = mockExtract(text);
    } else {
      result = await callDeepSeek(text, userContext, existingProjects);
    }

    const duration = Date.now() - startTime;
    await logAI(openid, 'extract', result, duration, db);

    return { code: 0, message: 'success', data: result };
  } catch (err) {
    console.error('aiExtract 失败', err);
    return { code: 5021, message: 'AI 服务异常：' + err.message, data: null };
  }
};

async function getTodayProjectNames(openid, date) {
  try {
    const res = await db.collection('work_records')
      .where({ _openid: openid, date })
      .field({ projects: true })
      .get();
    const names = new Set();
    (res.data || []).forEach(r => {
      (r.projects || []).forEach(p => {
        if (p.project_name) names.add(p.project_name);
      });
    });
    return Array.from(names);
  } catch (_) {
    return [];
  }
}

async function callDeepSeek(text, userContext, existingProjects = []) {
  const response = await httpPost(DEEPSEEK_BASE_URL + '/chat/completions', {
    model: DEEPSEEK_MODEL,
    messages: buildExtractMessages(text, userContext, existingProjects),
    temperature: 0.1,
    response_format: { type: 'json_object' },
  }, { Authorization: 'Bearer ' + DEEPSEEK_API_KEY });

  const content = response.choices[0].message.content;
  return parseAndValidate(content);
}

function buildExtractMessages(text, userContext, existingProjects = []) {
  const sysBase = '你是一名工作记录整理助手，帮助用户将口述或文字工作内容整理为结构化数据，以便生成日报。输入来自语音转文字，经常存在识别错误（如字词被替换、语气词混入），请大胆推断原意，不要因为局部字词奇怪就放弃提取。例如"忙了吗系统"应理解为"忙了某系统"，"吗"是识别错误，仍应提取项目名。';
  const existingHint = existingProjects.length > 0
    ? `\n\n今天已有的项目名称：${existingProjects.join('、')}。命名新项目时，若内容明显属于上述某个项目，请直接复用该名称，保持一致。`
    : '';
  return [
    {
      role: 'system',
      content: (userContext ? `${sysBase}\n\n用户背景：${userContext}` : sysBase) + existingHint,
    },
    {
      role: 'user',
      content: `请从以下工作描述中提取结构化信息，以 JSON 格式返回。

工作描述：
${text}

返回结构：
{
  "projects": [
    {
      "project_name": "项目或工作模块名称，简短，5字以内",
      "actions": ["具体完成了什么，每条一件事，10-20字，不要把多件事合并"],
      "problems": ["遇到的问题或阻塞，没有则返回空数组"],
      "next_steps": ["后续计划，没有则返回空数组"]
    }
  ],
  "summary": "今日工作一句话摘要，50字以内",
  "tomorrow_focus": ["明日重点事项，最多3条，没有则返回空数组"]
}

规则：
1. project_name 和 actions 必填，不能为空
2. 识别项目名时按以下优先级：
   - 高置信度词（项目、系统、平台、产品、小程序、应用、网站、服务、工程）：包含这类词的名称直接作为独立项目
   - 低置信度词（模块、功能、需求、版本、迭代、方案、业务线、专题）：结合上下文判断——若明确归属于某个高置信度项目则合并进去，否则单独列项
   - 项目名应尽量提取完整词组（如"报表系统""支付平台"），若上下文中确实只提到裸关键词（如只说了"系统"），则保留该词作为项目名，不要丢弃
3. 无明确项目名时归入"日常工作"
4. 只返回 JSON，不要其他文字`,
    },
  ];
}

function parseAndValidate(content) {
  const data = JSON.parse(content);
  if (!Array.isArray(data.projects) || data.projects.length === 0) {
    throw new Error('AI 输出 Schema 校验失败：缺少 projects');
  }
  for (const p of data.projects) {
    if (!p.project_name || !Array.isArray(p.actions) || p.actions.length === 0) {
      throw new Error('AI 输出 Schema 校验失败：project 缺少必填字段');
    }
  }
  return data;
}

function mockExtract(_text) {
  return {
    projects: [{
      project_name: '示例项目（Mock）',
      actions: ['完成了工作记录功能开发', '调试了云函数'],
      outputs: ['可运行的云函数骨架'],
      problems: [],
      next_steps: ['接入真实 AI 服务'],
    }],
    summary: '今日主要进行了项目初始化工作（Mock 数据）',
    tomorrow_focus: ['继续开发核心功能'],
  };
}

async function logAI(openid, taskType, _result, duration, db) {
  try {
    await db.collection('ai_logs').add({
      data: {
        openid,
        taskType,
        modelName: AI_PROVIDER === 'mock' ? 'mock' : DEEPSEEK_MODEL,
        isSuccess: true,
        durationMs: duration,
        createTime: db.serverDate(),
      },
    });
  } catch (e) {
    console.error('AI 日志写入失败', e);
  }
}

function httpPost(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers,
      },
      timeout: 30000,
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
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
