const { healthCheck } = require('../../utils/cloud');

Page({
  data: {
    asrProvider: 'mock',
    aiProvider: 'mock',
    version: '0.1.0',
    userContext: '',
    contextSaved: false,
    showFeedbackModal: false,
    feedbackText: '',
    feedbackSubmitting: false,
  },

  async onLoad() {
    this.setData({ userContext: wx.getStorageSync('userContext') || '' });
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

  onContextChange(e) {
    this.setData({ userContext: e.detail.value, contextSaved: false });
  },

  onSaveContext() {
    wx.setStorageSync('userContext', this.data.userContext);
    this.setData({ contextSaved: true });
    wx.showToast({ title: '已保存', icon: 'success' });
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar().setSelected) {
      this.getTabBar().setSelected(2);
    }
  },

  onFeedback() {
    this.setData({ showFeedbackModal: true, feedbackText: '' });
  },

  onFeedbackInput(e) {
    this.setData({ feedbackText: e.detail.value });
  },

  onFeedbackCancel() {
    this.setData({ showFeedbackModal: false, feedbackText: '' });
  },

  async onFeedbackSubmit() {
    const text = this.data.feedbackText.trim();
    if (!text) {
      wx.showToast({ title: '请填写反馈内容', icon: 'none' });
      return;
    }
    if (this.data.feedbackSubmitting) return;
    this.setData({ feedbackSubmitting: true });
    try {
      const db = wx.cloud.database();
      await db.collection('feedback').add({
        data: {
          content: text,
          appVersion: this.data.version,
          createTime: db.serverDate(),
        },
      });
      this.setData({ showFeedbackModal: false, feedbackText: '', feedbackSubmitting: false });
      wx.showToast({ title: '感谢你的反馈！', icon: 'success' });
    } catch (err) {
      this.setData({ feedbackSubmitting: false });
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
    }
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
