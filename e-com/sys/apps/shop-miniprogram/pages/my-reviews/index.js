const apis = require('../../apis/index.js');
const auth = require('../../utils/auth.js');

Page({
  data: { list: [], loading: true },

  onLoad() {
    if (!auth.requireLogin('/pages/my-reviews/index')) return;
  },

  onShow() { this.load(); },

  absUrl(p) {
    if (!p) return '';
    if (p.startsWith('http')) return p;
    const app = getApp();
    return ((app && app.globalData && app.globalData.apiBase) || '') + p;
  },

  async load() {
    this.setData({ loading: true });
    try {
      const res = await apis.reviewMy(1, 50);
      const list = (res.data && res.data.list || []).map((r) => ({
        ...r,
        previews: (r.images || []).map((p) => this.absUrl(p)),
        stars: '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating),
      }));
      this.setData({ list, loading: false });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: err.msg || '加载失败', icon: 'none' });
    }
  },

  onPreview(e) {
    const i = e.currentTarget.dataset.idx;
    const urls = e.currentTarget.dataset.urls;
    wx.previewImage({ current: urls[i], urls });
  },
});
