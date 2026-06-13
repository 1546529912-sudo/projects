const { getReportHistory, getPeriodReport } = require('../../utils/cloud');

Page({
  data: {
    loading: false,
    hasLoaded: false,
    error: null,
    filter: 'week',
    allReports: [],
    displayList: [],
    periodStart: '',
    periodEnd: '',
    hasPeriodReport: false,
    hasNewReports: false,
  },

  onLoad() {
    this.loadAll();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar().setSelected) {
      this.getTabBar().setSelected(1);
    }
    // 从日报详情页返回时重新加载，避免新保存的日报不显示
    if (!this.data.loading) this.loadAll();
  },

  async onPullDownRefresh() {
    await this.loadAll();
    wx.stopPullDownRefresh();
  },

  async loadAll() {
    this.setData({ loading: true, error: null });
    try {
      const result = await getReportHistory(1, 100);
      const today = new Date().toISOString().slice(0, 10);
      const weeks = ['日', '一', '二', '三', '四', '五', '六'];

      const reports = (result.list || []).map(r => {
        const date = new Date(r.reportDate);
        const projects = r.content?.projects || [];
        const taskCount = projects.reduce((s, p) => s + (p.actions?.length || 0), 0);
        return {
          ...r,
          day: date.getDate(),
          weekLabel: `周${weeks[date.getDay()]}`,
          monthLabel: `${date.getFullYear()}年${date.getMonth() + 1}月`,
          isToday: r.reportDate === today,
          projectCount: projects.length,
          taskCount,
          projectNames: projects.map(p => p.project_name).join('、'),
          summary: r.content?.summary || '',
        };
      });

      this.setData({ allReports: reports, loading: false, hasLoaded: true });
      this.applyFilter();
    } catch (err) {
      this.setData({ error: err.message, loading: false });
    }
  },

  onFilterChange(e) {
    this.setData({ filter: e.currentTarget.dataset.f });
    this.applyFilter();
  },

  applyFilter() {
    const { filter, allReports } = this.data;
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    let filtered = allReports;
    let periodStart = '', periodEnd = today;
    if (filter === 'week') {
      // 用本周一作为稳定 key，避免每天变化导致找不到已保存的周报
      const day = now.getDay();
      const daysFromMon = day === 0 ? 6 : day - 1;
      const mon = new Date(now);
      mon.setDate(now.getDate() - daysFromMon);
      periodStart = mon.toISOString().slice(0, 10);
      filtered = allReports.filter(r => r.reportDate >= periodStart);
    } else if (filter === 'month') {
      const y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, '0');
      periodStart = `${y}-${m}-01`;
      filtered = allReports.filter(r => r.reportDate.startsWith(`${y}-${m}`));
    }
    const periodType = filter === 'week' ? 'week' : 'month';
    const periodData = filter !== 'all' ? wx.getStorageSync(`period_${periodType}_${periodStart}`) : null;
    const hasPeriodReport = !!periodData;
    const hasNewReports = hasPeriodReport && !!periodData.generatedDate &&
      filtered.some(r => r.reportDate > periodData.generatedDate);
    this.setData({ periodStart, periodEnd, hasPeriodReport, hasNewReports });

    // localStorage 没有时，异步从云端补查（清缓存或换设备场景）
    if (filter !== 'all' && !hasPeriodReport) {
      this._checkPeriodFromCloud(periodType, periodStart, filtered);
    }

    // 按月分组，打平为带 type 标记的列表
    const displayList = [];
    let curMonth = '';
    for (const r of filtered) {
      if (r.monthLabel !== curMonth) {
        displayList.push({ type: 'month', label: r.monthLabel });
        curMonth = r.monthLabel;
      }
      displayList.push({ type: 'item', ...r });
    }
    this.setData({ displayList });
  },

  async _checkPeriodFromCloud(type, periodStart, filtered) {
    try {
      const result = await getPeriodReport(type, periodStart);
      if (!result || !result.personalText) return;
      wx.setStorageSync(`period_${type}_${periodStart}`, {
        summary: result.summary || '',
        personalText: result.personalText,
        formalText: result.formalText,
        generatedDate: result.generatedDate || '',
      });
      const hasNewReports = !!result.generatedDate &&
        filtered.some(r => r.reportDate > result.generatedDate);
      this.setData({ hasPeriodReport: true, hasNewReports });
    } catch (_) {}
  },

  onViewDetail(e) {
    wx.navigateTo({ url: `/pages/report/report?date=${e.currentTarget.dataset.date}&mode=view` });
  },

  onViewPeriodReport() {
    const { filter, periodStart, periodEnd } = this.data;
    const type = filter === 'week' ? 'week' : 'month';
    wx.navigateTo({
      url: `/pages/report/report?mode=period&type=${type}&start=${periodStart}&end=${periodEnd}&saved=1`,
    });
  },

  onGeneratePeriodReport() {
    const { filter, periodStart, periodEnd } = this.data;
    if (filter === 'all') return;
    const type = filter === 'week' ? 'week' : 'month';
    wx.navigateTo({
      url: `/pages/report/report?mode=period&type=${type}&start=${periodStart}&end=${periodEnd}`,
    });
  },
});
