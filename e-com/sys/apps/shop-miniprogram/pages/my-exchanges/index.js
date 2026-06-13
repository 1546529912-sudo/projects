const apis = require('../../apis/index.js');

const STATUS_LABEL = {
  pending_approve: '待审批',
  approved: '已通过 · 请寄回旧货',
  received_old: '已收旧 · 等发新',
  sent_new: '新货已发出',
  completed: '已完成',
  rejected: '已拒绝',
  cancelled: '已取消',
};

Page({
  data: { list: [], page: 1, size: 20, total: 0, loading: true, hasMore: true },

  onShow() { this.refresh(); },
  onPullDownRefresh() { this.refresh().then(() => wx.stopPullDownRefresh()); },

  async refresh() {
    this.setData({ page: 1, list: [], hasMore: true });
    return this.load();
  },

  async load() {
    if (!this.data.hasMore || this.data.loading === false) {} // pass
    this.setData({ loading: true });
    try {
      const res = await apis.exchangeList(this.data.page, this.data.size);
      const list = (res.data && res.data.list) || [];
      const total = (res.data && res.data.total) || 0;
      const items = list.map(it => ({
        ...it,
        statusLabel: STATUS_LABEL[it.status] || it.status,
        canCancel: it.status === 'pending_approve',
      }));
      this.setData({
        list: this.data.page === 1 ? items : this.data.list.concat(items),
        total,
        hasMore: this.data.list.length + items.length < total,
      });
    } catch (err) {
      wx.showToast({ title: err.msg || '加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onReachBottom() {
    if (!this.data.hasMore) return;
    this.setData({ page: this.data.page + 1 });
    this.load();
  },

  async onCancel(e) {
    const no = e.currentTarget.dataset.no;
    const that = this;
    wx.showModal({
      title: '取消换货？',
      content: '取消后无法恢复',
      success: async (r) => {
        if (!r.confirm) return;
        try {
          await apis.exchangeCancel(no);
          wx.showToast({ title: '已取消', icon: 'success' });
          that.refresh();
        } catch (err) {
          wx.showToast({ title: err.msg || '取消失败', icon: 'none' });
        }
      },
    });
  },
});
