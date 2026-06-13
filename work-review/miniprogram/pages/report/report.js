const { createReport, saveReport, getReport, createPeriodReport, savePeriodReport, getPeriodReport, getAdvisorAdvice } = require('../../utils/cloud');

function stripMd(text) {
  return (text || '')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[ \t]*[-*+]\s+/gm, '• ')
    .replace(/^[ \t]*\d+\.\s+/gm, '')
    .trim();
}

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
    advisors: [],
    selectedAdvisor: '',
    advice: '',
    adviceLoading: false,
    adviceError: '',
  },

  onLoad(options) {
    const mode = options.mode || 'generate';
    this.setData({ mode });
    this.loadAdvisors();

    if (mode === 'period') {
      const type = options.type || 'week';
      const start = options.start || '';
      const end = options.end || '';
      const label = type === 'week' ? '本周报告' : '本月报告';
      this.setData({ periodType: type, dateLabel: label });
      this._adviceCacheKey = `advice_period_${type}_${start}`;

      if (options.saved === '1') {
        const cached = wx.getStorageSync(`period_${type}_${start}`);
        if (cached) {
          this.setData({ summary: cached.summary, personalText: cached.personalText, formalText: cached.formalText, loading: false });
          return;
        }
        // localStorage 没有（清缓存或换设备），从云端加载
        this.loadSavedPeriod(type, start, end);
        return;
      }
      this.loadAndGeneratePeriod(type, start, end);
      return;
    }

    const date = options.date || new Date().toISOString().slice(0, 10);
    const [, m, d] = date.split('-');
    this.setData({ date, dateLabel: `${+m}月${+d}日` });
    this._adviceCacheKey = `advice_daily_${date}`;

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
      this._clearAdviceCache();
      const generatedDate = new Date().toISOString().slice(0, 10);
      this.setData({
        summary: result.summary || '',
        personalText: result.personal_text,
        formalText: result.formal_text,
        loading: false,
      });
      const cacheData = {
        summary: result.summary || '',
        personalText: result.personal_text,
        formalText: result.formal_text,
        generatedDate,
      };
      wx.setStorageSync(`period_${type}_${startDate}`, cacheData);
      // 同步保存到云端，跨设备可查
      savePeriodReport(type, startDate, endDate, result.summary || '', result.personal_text, result.formal_text).catch(() => {});
    } catch (err) {
      this.setData({ error: err.message, loading: false });
    }
  },

  async loadSavedPeriod(type, startDate, endDate) {
    this.setData({ loading: true, error: null });
    try {
      const result = await getPeriodReport(type, startDate);
      if (result && result.personalText) {
        wx.setStorageSync(`period_${type}_${startDate}`, {
          summary: result.summary || '',
          personalText: result.personalText,
          formalText: result.formalText,
          generatedDate: result.generatedDate || '',
        });
        this.setData({
          summary: result.summary || '',
          personalText: result.personalText,
          formalText: result.formalText,
          loading: false,
        });
      } else {
        // 云端也没有，重新生成
        this.loadAndGeneratePeriod(type, startDate, endDate);
      }
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
      // 自动保存，确保历史页可查到
      try {
        await saveReport(date, result.content, 'personal', result.personal_text, result.formal_text);
        this.setData({ saved: true });
      } catch (_) {}
    } catch (err) {
      this.setData({ error: err.message, loading: false });
    }
  },

  loadAdvisors() {
    const saved = wx.getStorageSync('advisors');
    const advisors = saved && saved.length > 0 ? saved : [
      { id: 'musk', name: '马斯克' },
      { id: 'jobs', name: '乔布斯' },
      { id: 'inamori', name: '稻盛和夫' },
    ];
    this.setData({ advisors });
  },

  async onSelectAdvisor(e) {
    const name = e.currentTarget.dataset.name;
    if (this.data.adviceLoading) return;
    this.setData({ selectedAdvisor: name, advice: '', adviceError: '', adviceLoading: true });
    try {
      await this._fetchAdvice(name);
    } catch (err) {
      this.setData({ adviceError: err.message, adviceLoading: false });
    }
  },

  async _fetchAdvice(name) {
    const cacheKey = `${this._adviceCacheKey}_${name}`;
    const cached = wx.getStorageSync(cacheKey);
    if (cached) {
      this.setData({ advice: cached, adviceLoading: false });
      return;
    }
    const { summary, personalText, reportContent, mode, periodType } = this.data;
    const content = summary || personalText?.slice(0, 400) || '';
    const projects = reportContent?.projects || [];
    const reportType = mode === 'period' ? periodType : 'daily';
    const raw = await getAdvisorAdvice(name, content, projects, reportType);
    const advice = stripMd(raw);
    wx.setStorageSync(cacheKey, advice);
    this.setData({ advice, adviceLoading: false });
  },

  async onRegenerateAdvice() {
    const { selectedAdvisor, adviceLoading } = this.data;
    if (!selectedAdvisor || adviceLoading) return;
    wx.removeStorageSync(`${this._adviceCacheKey}_${selectedAdvisor}`);
    this.setData({ advice: '', adviceError: '', adviceLoading: true });
    try {
      await this._fetchAdvice(selectedAdvisor);
    } catch (err) {
      this.setData({ adviceError: err.message, adviceLoading: false });
    }
  },

  _clearAdviceCache() {
    (this.data.advisors || []).forEach(a => {
      wx.removeStorageSync(`${this._adviceCacheKey}_${a.name}`);
    });
    this.setData({ advice: '', adviceError: '', selectedAdvisor: '' });
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
    this._clearAdviceCache();
    this.loadAndGenerate(this.data.date);
  },
});
