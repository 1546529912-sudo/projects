const { getReportHistory } = require('../../utils/cloud');

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
      periodStart = new Date(now - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      filtered = allReports.filter(r => r.reportDate >= periodStart);
    } else if (filter === 'month') {
      const y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, '0');
      periodStart = `${y}-${m}-01`;
      filtered = allReports.filter(r => r.reportDate.startsWith(`${y}-${m}`));
    }
    const periodType = filter === 'week' ? 'week' : 'month';
    const hasPeriodReport = filter !== 'all' && !!wx.getStorageSync(`period_${periodType}_${periodStart}`);
    this.setData({ periodStart, periodEnd, hasPeriodReport });

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

  onViewDetail(e) {
    wx.navigateTo({ url: `/pages/report/report?date=${e.currentTarget.dataset.date}&mode=view` });
  },

  onGeneratePeriodReport() {
    const { filter, periodStart, periodEnd, hasPeriodReport } = this.data;
    if (filter === 'all') return;
    const type = filter === 'week' ? 'week' : 'month';
    const saved = hasPeriodReport ? '&saved=1' : '';
    wx.navigateTo({
      url: `/pages/report/report?mode=period&type=${type}&start=${periodStart}&end=${periodEnd}${saved}`,
    });
  },
});
