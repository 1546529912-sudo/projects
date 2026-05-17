const { healthCheck } = require('../../utils/cloud');

Page({
  data: {
    asrProvider: 'mock',
    aiProvider: 'mock',
    version: '0.1.0',
  },

  async onLoad() {
    try {
      const info = await healthCheck();
      this.setData({
        asrProvider: info.asrProvider || 'mock',
        aiProvider: info.aiProvider || 'mock',
      });
    } catch (_) {
      // 保持默认 mock 显示
    }
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar().setSelected) {
      this.getTabBar().setSelected(2);
    }
  },

  onFeedback() {
    wx.showToast({ title: '感谢反馈 ❤️', icon: 'none' });
  },

  onAbout() {
    wx.showModal({
      title: '工作记录助手',
      content: '版本 v0.1.0\n\n录语音 → AI 整理 → 一键生成日报\n让工作记录变得轻松自在',
      showCancel: false,
      confirmText: '知道了',
      confirmColor: '#C07048',
    });
  },

  onClearCache() {
    wx.showModal({
      title: '确认清除',
      content: '将清除本地缓存数据，不影响云端保存的日报',
      confirmColor: '#C07048',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          wx.showToast({ title: '已清除', icon: 'success' });
        }
      },
    });
  },
});
