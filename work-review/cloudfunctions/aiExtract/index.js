require('dotenv').config();
const cloud = require('wx-server-sdk');
const https = require('https');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

const AI_PROVIDER = process.env.AI_PROVIDER || 'mock';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  const { text, recordId } = event;

  if (!text || text.trim().length < 3) {
    return { code: 4001, message: '参数错误：文字内容不能为空', data: null };
  }

  const startTime = Date.now();

  try {
    let result;
    if (AI_PROVIDER === 'mock') {
      result = mockExtract(text);
    } else {
      result = await callDeepSeek(text);
    }

    const duration = Date.now() - startTime;
    await logAI(openid, 'extract', result, duration, db);

    return { code: 0, message: 'success', data: result };
  } catch (err) {
    console.error('aiExtract 失败', err);
    return { code: 5021, message: 'AI 服务异常：' + err.message, data: null };
  }
};

async function callDeepSeek(text) {
  const prompt = buildExtractPrompt(text);
  const response = await httpPost(DEEPSEEK_BASE_URL + '/chat/completions', {
    model: DEEPSEEK_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    response_format: { type: 'json_object' },
  }, { Authorization: 'Bearer ' + DEEPSEEK_API_KEY });

  const content = response.choices[0].message.content;
  return parseAndValidate(content);
}

function buildExtractPrompt(text) {
  return `你是一个工作记录提取助手。请从以下工作描述中提取结构化信息。

工作描述：
${text}

请以 JSON 格式返回，结构如下：
{
  "projects": [
    {
      "project_name": "项目名称",
      "actions": ["做了什么"],
      "outputs": ["产出了什么"],
      "problems": ["遇到什么问题"],
      "next_steps": ["下一步计划"]
    }
  ],
  "summary": "今日工作简要摘要",
  "tomorrow_focus": ["明日重点"]
}

要求：
1. project_name 和 actions 为必填
2. 如果文字中没有明确的项目，归入"日常工作"
3. 只返回 JSON，不要其他文字`;
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

function mockExtract(text) {
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

async function logAI(openid, taskType, result, duration, db) {
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
