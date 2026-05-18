require('dotenv').config();
const https = require('https');

const AI_PROVIDER = process.env.AI_PROVIDER || 'mock';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

// 预设顾问的人格与思维风格
const ADVISOR_PERSONAS = {
  '马斯克': `你是埃隆·马斯克。你以第一性原理思考，追求极致效率，敢于质疑一切假设。
你的点评风格：直接犀利，不废话；追问"为什么不能10倍速？"；关注本质问题而非表面；
鼓励大胆冒险，批评低效与平庸；经常用工程师视角拆解问题。
用中文回复，语气直接、有力，偶尔带点挑衅。`,

  '乔布斯': `你是史蒂夫·乔布斯。你极度关注简洁与专注，认为"做减法"比"做加法"更难也更重要。
你的点评风格：苛求极致，容不得平庸；追问"这真的是用户需要的吗？"；
强调聚焦，反对分散精力；相信好的工作来自对细节的偏执；
经常说"stay hungry, stay foolish"，鼓励突破舒适区。
用中文回复，语气犀利、充满激情，偶尔有些专横。`,

  '稻盛和夫': `你是稻盛和夫。你相信"心"是一切的根源，企业经营的核心是人心与利他之心。
你的点评风格：温厚但深刻；从"动机是否纯粹"出发审视工作；
强调日复一日的积累与精进；关注团队凝聚力与共同成长；
引用阿米巴经营理念，强调每个人都是经营者；
经常用"敬天爱人"、"付出不亚于任何人的努力"这样的表达。
用中文回复，语气沉稳、充满智慧，带有东方哲学气质。`,
};

exports.main = async (event) => {
  const { advisor, summary, projects = [], reportType = 'daily' } = event;

  if (!advisor) {
    return { code: 4001, message: '参数错误：缺少顾问名称', data: null };
  }
  const content = summary || '（暂无摘要）';

  try {
    const result = AI_PROVIDER === 'mock'
      ? mockAdvice(advisor)
      : await callDeepSeek(advisor, content, projects, reportType);

    return { code: 0, message: 'success', data: { advice: result } };
  } catch (err) {
    console.error('getAdvisorAdvice 失败', err);
    return { code: 5001, message: '建议生成失败：' + err.message, data: null };
  }
};

async function callDeepSeek(advisor, summary, projects, reportType) {
  const persona = ADVISOR_PERSONAS[advisor] || `你是${advisor}，请以他的思维方式、管理哲学和人生经验来点评工作。用中文回复。`;

  const periodLabel = { daily: '今日', week: '本周', month: '本月' }[reportType] || '今日';

  const projectText = projects.length > 0
    ? projects.map(p => `- ${p.project_name}：${(p.actions || []).join('；')}`).join('\n')
    : '（无详细项目信息）';

  const resp = await httpPost(DEEPSEEK_BASE_URL + '/chat/completions', {
    model: DEEPSEEK_MODEL,
    messages: [
      { role: 'system', content: persona },
      {
        role: 'user',
        content: `以下是我${periodLabel}的工作内容，请给我你的点评和建议：

工作概述：${summary}

具体工作：
${projectText}

请以你独特的视角和思维方式，直接给出你的看法和建议。`,
      },
    ],
    temperature: 0.8,
    max_tokens: 1000,
  }, { Authorization: 'Bearer ' + DEEPSEEK_API_KEY });

  return resp.choices[0].message.content;
}

function mockAdvice(advisor) {
  return `【${advisor} Mock 建议】\n\n这只是模拟数据。部署云函数后将获得真实的顾问视角建议。`;
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
    req.on('timeout', () => { req.destroy(); reject(new Error('请求超时')); });
    req.write(data);
    req.end();
  });
}
