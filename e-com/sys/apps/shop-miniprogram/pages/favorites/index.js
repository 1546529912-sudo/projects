const apis = require('../../apis/index.js');
const auth = require('../../utils/auth.js');

Page({
  data: { list: [], loading: true },

  onLoad() {
    if (!auth.requireLogin('/pages/favorites/index')) return;
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
      const res = await apis.favoriteList();
      const list = (res.data || []).map((r) => ({
        ...r,
        thumb: r.spu ? this.absUrl(r.spu.main_image) : '',
        title: r.spu ? r.spu.name : ('SPU ' + r.spu_id),
        priceYuan: r.spu ? r.spu.price_yuan : '0.00',
        sku_code: r.spu ? r.spu.default_sku_code : '',
      }));
      this.setData({ list, loading: false });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: err.msg || '加载失败', icon: 'none' });
    }
  },

  onDetail(e) {
    const sku = e.currentTarget.dataset.sku;
    if (!sku) {
      wx.showToast({ title: '商品已下架', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/detail/index?sku=' + sku });
  },

  async onUnfav(e) {
    const spuId = e.currentTarget.dataset.id;
    try {
      await apis.favoriteRemove(spuId);
      wx.showToast({ title: '已取消收藏', icon: 'success' });
      this.load();
    } catch (err) {
      wx.showToast({ title: err.msg || '操作失败', icon: 'none' });
    }
  },
});
