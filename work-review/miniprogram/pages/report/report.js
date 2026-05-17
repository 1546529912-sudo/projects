const { createReport, saveReport } = require('../../utils/cloud');

Page({
  data: {
    loading: true,
    saving: false,
    error: null,
    date: '',
    dateLabel: '',
    reportContent: null,
    summary: '',
    personalText: '',
    formalText: '',
    activeTab: 'personal',
    saved: false,
    mode: 'generate',
  },

  onLoad(options) {
    const date = options.date || new Date().toISOString().slice(0, 10);
    const mode = options.mode || 'generate';
    const [, m, d] = date.split('-');
    this.setData({ date, dateLabel: `${+m}月${+d}日`, mode });

    if (mode === 'view') {
      this.loadSaved(date);
    } else {
      this.loadAndGenerate(date);
    }
  },

  // 从历史进入：读已保存的日报，没有则回退到重新生成
  async loadSaved(date) {
    this.setData({ loading: true, error: null });
    try {
      const db = wx.cloud.database();
      const res = await db.collection('daily_reports')
        .where({ reportDate: date })
        .orderBy('updateTime', 'desc')
        .limit(1)
        .get();

      if (res.data.length === 0) {
        this.loadAndGenerate(date);
        return;
      }

      const r = res.data[0];
      this.setData({
        reportContent: r.content,
        summary: r.content?.summary || '',
        personalText: r.personalText || '',
        formalText: r.formalText || '',
        saved: true,
        loading: false,
      });
    } catch (err) {
      this.setData({ error: err.message, loading: false });
    }
  },

  // 从 DB 读当日所有录入，汇总后生成日报
  async loadAndGenerate(date) {
    this.setData({ loading: true, error: null });
    try {
      const db = wx.cloud.database();
      const res = await db.collection('work_records')
        .where({ date })
        .orderBy('createTime', 'asc')
        .get();

      if (!res.data || res.data.length === 0) {
        this.setData({ error: '今日暂无工作记录，请先录入', loading: false });
        return;
      }

      // 汇总所有项目
      const allProjects = [];
      res.data.forEach(r => {
        if (Array.isArray(r.projects)) allProjects.push(...r.projects);
      });

      if (allProjects.length === 0) {
        this.setData({ error: '录入数据不完整，请重新录入', loading: false });
        return;
      }

      const result = await createReport(date, allProjects);
      this.setData({
        reportContent: result.content,
        summary: result.summary || '',
        personalText: result.personal_text,
        formalText: result.formal_text,
        loading: false,
      });
    } catch (err) {
      this.setData({ error: err.message, loading: false });
    }
  },

  onSwitchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  onCopy() {
    const text = this.data.activeTab === 'personal'
      ? this.data.personalText
      : this.data.formalText;
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '已复制', icon: 'success' }),
    });
  },

  async onSave() {
    if (this.data.saved || this.data.saving) return;
    this.setData({ saving: true });
    try {
      await saveReport(
        this.data.date,
        this.data.reportContent,
        this.data.activeTab,
        this.data.personalText,
        this.data.formalText,
      );
      this.setData({ saved: true, saving: false });
      wx.showToast({ title: '已保存', icon: 'success' });
    } catch (err) {
      this.setData({ saving: false });
      wx.showToast({ title: '保存失败：' + err.message, icon: 'none' });
    }
  },

  onBackHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  onRegenerate() {
    this.loadAndGenerate(this.data.date);
  },
});
