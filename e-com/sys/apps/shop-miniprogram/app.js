// 小程序全局入口
App({
  globalData: {
    // 开发环境后端基地址（生产改为线上域名）
    apiBase: 'http://localhost:8001',
    token: null,
    userInfo: null,
  },

  onLaunch() {
    // 读本地缓存恢复登录态
    try {
      const token = wx.getStorageSync('token');
      const userInfo = wx.getStorageSync('userInfo');
      if (token) this.globalData.token = token;
      if (userInfo) this.globalData.userInfo = userInfo;
    } catch (e) {
      console.error('恢复登录态失败', e);
    }
  },

  onError(err) {
    console.error('[App.onError]', err);
  },
});
