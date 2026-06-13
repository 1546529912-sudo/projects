// 统一云函数调用封装，所有页面通过此文件调用云函数，不得直接使用 wx.cloud.callFunction

const callCloud = async (name, data = {}) => {
  try {
    const res = await wx.cloud.callFunction({ name, data, config: { timeout: 30000 } });
    const result = res.result;

    if (!result) {
      throw new Error(`云函数 ${name} 无返回值`);
    }
    if (result.code !== 0) {
      throw new Error(result.message || `云函数 ${name} 返回错误码 ${result.code}`);
    }

    return result.data;
  } catch (err) {
    // 区分网络错误和业务错误
    if (err.errCode) {
      throw new Error(`网络错误（${err.errCode}）：${err.errMsg}`);
    }
    throw err;
  }
};

// 健康检查
const healthCheck = () => callCloud('healthCheck');

// AI 提取
const aiExtract = (text, recordId) => {
  const userContext = wx.getStorageSync('userContext') || '';
  return callCloud('aiExtract', { text, recordId, userContext });
};

// ASR 转写（超时设 60s，对应云函数执行时间）
const doASR = (fileID, format = 'mp3') => {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'doASR',
      data: { fileID, format },
      config: { timeout: 60000 },
      success: (res) => {
        const result = res.result;
        if (!result) return reject(new Error('云函数 doASR 无返回值'));
        if (result.code !== 0) return reject(new Error(result.message || `doASR 返回错误码 ${result.code}`));
        resolve(result.data);
      },
      fail: (err) => reject(new Error(`doASR 调用失败：${err.errMsg || JSON.stringify(err)}`)),
    });
  });
};

// 生成日报（DeepSeek 最长 50s，客户端给 60s 宽限）
const createReport = (date, records) =>
  new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'createReport',
      data: { date, records },
      config: { timeout: 60000 },
      success: (res) => {
        const result = res.result;
        if (!result) return reject(new Error('云函数 createReport 无返回值'));
        if (result.code !== 0) return reject(new Error(result.message || `createReport 返回错误码 ${result.code}`));
        resolve(result.data);
      },
      fail: (err) => reject(new Error(`createReport 调用失败：${err.errMsg || JSON.stringify(err)}`)),
    });
  });

// 保存日报
const saveReport = (date, content, template, personalText, formalText) =>
  callCloud('saveReport', { date, content, template, personalText, formalText });

// 获取历史日报
const getReportHistory = (page = 1, perPage = 20) =>
  callCloud('getReportHistory', { page, perPage });

// 按日期获取单条已保存日报
const getReport = (date) =>
  callCloud('getReportHistory', { date });

// 顾问视角建议
const getAdvisorAdvice = (advisor, summary, projects, reportType) =>
  new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'getAdvisorAdvice',
      data: { advisor, summary, projects, reportType },
      config: { timeout: 60000 },
      success: (res) => {
        const result = res.result;
        if (!result) return reject(new Error('云函数 getAdvisorAdvice 无返回值'));
        if (result.code !== 0) return reject(new Error(result.message || '建议生成失败'));
        resolve(result.data.advice);
      },
      fail: (err) => reject(new Error(`getAdvisorAdvice 调用失败：${err.errMsg || JSON.stringify(err)}`)),
    });
  });

// 生成周报/月报
const createPeriodReport = (type, startDate, endDate) =>
  new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'createPeriodReport',
      data: { type, startDate, endDate },
      config: { timeout: 60000 },
      success: (res) => {
        const result = res.result;
        if (!result) return reject(new Error('云函数 createPeriodReport 无返回值'));
        if (result.code !== 0) return reject(new Error(result.message || `createPeriodReport 返回错误码 ${result.code}`));
        resolve(result.data);
      },
      fail: (err) => reject(new Error(`createPeriodReport 调用失败：${err.errMsg || JSON.stringify(err)}`)),
    });
  });

// 保存/获取周报月报（云端持久化，跨设备可用）
const savePeriodReport = (type, periodStart, periodEnd, summary, personalText, formalText) =>
  callCloud('savePeriodReport', { type, periodStart, periodEnd, summary, personalText, formalText });

const getPeriodReport = (type, periodStart) =>
  callCloud('getPeriodReport', { type, periodStart });

// 获取顾问头像和 title（结果存 DB 供所有用户复用）
const fetchAdvisorAvatar = (name) => callCloud('fetchAdvisorAvatar', { name });

// 个人背景（按 openid 隔离，存云端）
const getUserContext = () => callCloud('getUserContext');
const saveUserContext = (userContext) => callCloud('saveUserContext', { userContext });

module.exports = {
  callCloud,
  healthCheck,
  aiExtract,
  doASR,
  createReport,
  saveReport,
  getReportHistory,
  getReport,
  createPeriodReport,
  savePeriodReport,
  getPeriodReport,
  getAdvisorAdvice,
  fetchAdvisorAvatar,
  getUserContext,
  saveUserContext,
};
