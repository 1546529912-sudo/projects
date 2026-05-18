const { createReport, saveReport, getReport, createPeriodReport } = require('../../utils/cloud');

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
    periodType: '',
  },

  onLoad(options) {
    const mode = options.mode || 'generate';
    this.setData({ mode });

    if (mode === 'period') {
      const type = options.type || 'week';
      const start = options.start || '';
      const end = options.end || '';
      const label = type === 'week' ? '本周报告' : '本月报告';
      this.setData({ periodType: type, dateLabel: label });

      if (options.saved === '1') {
        // 直接从本地读已保存版本
        const cached = wx.getStorageSync(`period_${type}_${start}`);
        if (cached) {
          this.setData({ summary: cached.summary, personalText: cached.personalText, formalText: cached.formalText, loading: false });
          return;
        }
      }
      this.loadAndGeneratePeriod(type, start, end);
      return;
    }

    const date = options.date || new Date().toISOString().slice(0, 10);
    const [, m, d] = date.split('-');
    this.setData({ date, dateLabel: `${+m}月${+d}日` });

    if (mode === 'view') {
      this.loadSaved(date);
    } else {
      this.loadAndGenerate(date);
    }
  },

  async loadAndGeneratePeriod(type, startDate, endDate) {
    this.setData({ loading: true, error: null });
    try {
      const result = await createPeriodReport(type, startDate, endDate);
      this.setData({
        summary: result.summary || '',
        personalText: result.personal_text,
        formalText: result.formal_text,
        loading: false,
      });
      // 生成成功后自动缓存到本地，供历史页判断和下次直接查看
      wx.setStorageSync(`period_${type}_${startDate}`, {
        summary: result.summary || '',
        personalText: result.personal_text,
        formalText: result.formal_text,
      });
    } catch (err) {
      this.setData({ error: err.message, loading: false });
    }
  },

  // 从历史进入：读已保存的日报，没有则回退到重新生成
  async loadSaved(date) {
    this.setData({ loading: true, error: null });
    try {
      const result = await getReport(date);
      if (!result.list || result.list.length === 0) {
        this.loadAndGenerate(date);
        return;
      }
      const r = result.list[0];
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

      // 汇总并按项目名合并（同名项目合并 actions/problems/next_steps）
      const projectMap = new Map();
      res.data.forEach(r => {
        (r.projects || []).forEach(p => {
          const name = (p.project_name || '其他工作').trim();
          if (!projectMap.has(name)) {
            projectMap.set(name, {
              project_name: name,
              actions: [...(p.actions || [])],
              problems: [...(p.problems || [])],
              next_steps: [...(p.next_steps || [])],
            });
          } else {
            const existing = projectMap.get(name);
            existing.actions.push(...(p.actions || []));
            existing.problems.push(...(p.problems || []));
            existing.next_steps.push(...(p.next_steps || []));
          }
        });
      });
      const allProjects = Array.from(projectMap.values());

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
