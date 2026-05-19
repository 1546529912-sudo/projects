const { healthCheck, fetchAdvisorAvatar, getUserContext, saveUserContext } = require('../../utils/cloud');

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
    advisors: [],
    showAddAdvisor: false,
    newAdvisorName: '',
  },

  async onLoad() {
    // 先用本地缓存立即显示，再从云端拉取最新值并同步
    this.setData({ userContext: wx.getStorageSync('userContext') || '' });
    this.loadAdvisors();
    try {
      const info = await healthCheck();
      this.setData({
        asrProvider: info.asrProvider || 'mock',
        aiProvider: info.aiProvider || 'mock',
      });
    } catch (_) {}
    try {
      const { userContext } = await getUserContext();
      wx.setStorageSync('userContext', userContext);
      this.setData({ userContext });
    } catch (_) {}
  },

  loadAdvisors() {
    const saved = wx.getStorageSync('advisors');
    const defaults = [
      { id: 'musk',    name: '马斯克',   preset: true, title: 'Tesla · SpaceX CEO' },
      { id: 'jobs',    name: '乔布斯',   preset: true, title: 'Apple 联合创始人' },
      { id: 'inamori', name: '稻盛和夫', preset: true, title: '京瓷创始人 · 阿米巴之父' },
    ];
    let advisors;
    if (saved && saved.length > 0) {
      const defMap = {};
      defaults.forEach(d => { defMap[d.id] = d; });
      advisors = saved.map(a => {
        const def = defMap[a.id];
        return def ? { title: def.title, ...a } : a;
      });
    } else {
      advisors = defaults;
    }
    this.setData({ advisors });
  },

  onAddAdvisor() {
    this.setData({ showAddAdvisor: true, newAdvisorName: '' });
  },

  onNewAdvisorInput(e) {
    this.setData({ newAdvisorName: e.detail.value });
  },

  async onConfirmAddAdvisor() {
    const name = this.data.newAdvisorName.trim();
    if (!name) { wx.showToast({ title: '请输入顾问名字', icon: 'none' }); return; }
    const newAdvisor = { id: `custom_${Date.now()}`, name, preset: false };
    const advisors = [...this.data.advisors, newAdvisor];
    wx.setStorageSync('advisors', advisors);
    this.setData({ advisors, showAddAdvisor: false, newAdvisorName: '' });
    // 后台拉 title（和头像，如 DB 中管理员已上传）
    const info = await fetchAdvisorAvatar(name).catch(() => null);
    if (info && (info.title || info.avatarFileID)) {
      const title = (info.title || '').slice(0, 20);
      const updated = this.data.advisors.map(a =>
        a.id === newAdvisor.id ? { ...a, ...info, title } : a
      );
      wx.setStorageSync('advisors', updated);
      this.setData({ advisors: updated });
      if (info.avatarFileID) this.refreshAvatarUrls(updated);
    }
  },

  onCancelAddAdvisor() {
    this.setData({ showAddAdvisor: false, newAdvisorName: '' });
  },

  onDeleteAdvisor(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '删除顾问',
      content: '确认删除这位顾问吗？',
      confirmColor: '#C07048',
      success: (res) => {
        if (!res.confirm) return;
        const advisors = this.data.advisors.filter(a => a.id !== id);
        wx.setStorageSync('advisors', advisors);
        this.setData({ advisors });
      },
    });
  },

  onContextChange(e) {
    this.setData({ userContext: e.detail.value, contextSaved: false });
  },

  async onSaveContext() {
    const { userContext } = this.data;
    wx.setStorageSync('userContext', userContext);
    this.setData({ contextSaved: true });
    wx.showToast({ title: '已保存', icon: 'success' });
    try {
      await saveUserContext(userContext);
    } catch (_) {}
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
