App({
  globalData: {
    userInfo: null,
  },

  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('微信基础库版本过低，请升级至 2.2.3 以上');
      return;
    }
    wx.cloud.init({
      env: 'cloud1-d9gzx1q5h5edcca4a',
      traceUser: true,
    });
  },
});
