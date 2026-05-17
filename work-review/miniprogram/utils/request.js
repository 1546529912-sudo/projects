const app = getApp();

const request = (options) => {
  return new Promise((resolve, reject) => {
    const { method = 'GET', url, data, needAuth = true } = options;

    const header = {
      'Content-Type': 'application/json',
    };

    if (needAuth && app.globalData.token) {
      header['Authorization'] = `Bearer ${app.globalData.token}`;
    }

    wx.request({
      url: `${app.globalData.baseUrl}${url}`,
      method,
      data,
      header,
      timeout: 30000,
      success: (res) => {
        if (res.statusCode === 401) {
          app.clearToken();
          wx.redirectTo({ url: '/pages/login/login' });
          reject(new Error('未授权，请重新登录'));
          return;
        }

        if (res.data && res.data.code === 0) {
          resolve(res.data.data);
        } else {
          const msg = res.data?.message || '请求失败';
          reject(new Error(msg));
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络请求失败'));
      },
    });
  });
};

const get = (url, data) => request({ method: 'GET', url, data });
const post = (url, data, needAuth = true) => request({ method: 'POST', url, data, needAuth });

module.exports = { request, get, post };
