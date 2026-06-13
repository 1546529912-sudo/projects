// 网络请求封装（统一拦截 token、错误处理、trace）
const app = getApp();

function request(options) {
  const base = (app && app.globalData && app.globalData.apiBase) || 'http://localhost:8001';
  const token = (app && app.globalData && app.globalData.token) || null;

  return new Promise((resolve, reject) => {
    wx.request({
      url: base + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
        'X-Trace-Id': genTraceId(),
        ...(options.header || {}),
      },
      timeout: options.timeout || 8000,
      success(res) {
        if (res.statusCode === 200 && res.data && res.data.code === 0) {
          resolve(res.data);
        } else if (res.statusCode === 401) {
          // token 失效
          try { wx.removeStorageSync('token'); } catch (e) {}
          if (app) app.globalData.token = null;
          reject({ code: 401, msg: '未登录', data: res.data });
        } else {
          reject({
            code: (res.data && res.data.code) || res.statusCode,
            msg: (res.data && res.data.msg) || '请求失败',
            data: res.data,
          });
        }
      },
      fail(err) {
        reject({ code: -1, msg: err.errMsg || '网络异常', data: null });
      },
    });
  });
}

function genTraceId() {
  return 'mp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

// 文件上传（多 part form），用于退货凭证图片 iter-15
function uploadFile({ url, filePath, name = 'file', formData = {} }) {
  const base = (app && app.globalData && app.globalData.apiBase) || 'http://localhost:8001';
  const token = (app && app.globalData && app.globalData.token) || null;
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: base + url,
      filePath,
      name,
      formData,
      header: {
        ...(token ? { 'Authorization': 'Bearer ' + token } : {}),
        'X-Trace-Id': genTraceId(),
      },
      success(res) {
        if (res.statusCode !== 200) {
          reject({ code: res.statusCode, msg: '上传失败 HTTP ' + res.statusCode, data: null });
          return;
        }
        let data;
        try { data = JSON.parse(res.data); }
        catch { reject({ code: -1, msg: '响应非 JSON', data: res.data }); return; }
        if (data && data.code === 0) resolve(data);
        else reject({ code: data && data.code, msg: (data && data.msg) || '上传失败', data });
      },
      fail(err) { reject({ code: -1, msg: err.errMsg || '网络异常', data: null }); },
    });
  });
}

module.exports = { request, uploadFile };
