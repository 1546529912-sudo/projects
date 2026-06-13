const apis = require('../../apis/index.js');
const auth = require('../../utils/auth.js');

Page({
  data: {
    list: [],
    loading: true,
    tab: 'unused',  // unused / used / expired
    // 选择模式（从 checkout 跳入时带 ?select=1&goods_amount=N）
    selectMode: false,
    goodsAmount: 0,
  },

  onLoad(opts) {
    if (!auth.requireLogin('/pages/my-coupons/index')) return;
    if (opts.select === '1') {
      this.setData({
        selectMode: true,
        goodsAmount: parseInt(opts.goods_amount || '0', 10),
      });
    }
  },

  onShow() {
    this.load();
  },

  onTab(e) {
    this.setData({ tab: e.currentTarget.dataset.tab });
    this.load();
  },

  async load() {
    this.setData({ loading: true });
    try {
      const res = await apis.couponMy(this.data.tab);
      const list = (res.data || []).map((r) => ({
        ...r,
        discount_yuan: r.type === 'threshold' ? (r.discount_value / 100).toFixed(2) : null,
        min_yuan: (r.min_amount / 100).toFixed(2),
        usable: this.data.selectMode && r.status === 'unused' && this.data.goodsAmount >= Number(r.min_amount),
        desc: r.type === 'threshold'
          ? `满 ¥${(r.min_amount / 100).toFixed(2)} 减 ¥${(r.discount_value / 100).toFixed(2)}`
          : `满 ¥${(r.min_amount / 100).toFixed(2)} 减 ${r.discount_value}%${r.max_discount !== null ? `（最多 ¥${(r.max_discount / 100).toFixed(2)}）` : ''}`,
      }));
      this.setData({ list, loading: false });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: err.msg || '加载失败', icon: 'none' });
    }
  },

  // 选择模式下点击：回传给 checkout
  onPick(e) {
    if (!this.data.selectMode) return;
    const item = this.data.list.find((x) => x.id === e.currentTarget.dataset.id);
    if (!item || !item.usable) return;
    const pages = getCurrentPages();
    const prev = pages[pages.length - 2];
    if (prev && prev.route.indexOf('checkout') >= 0) {
      prev.applyCoupon({
        user_coupon_id: item.id,
        name: item.name,
      });
    }
    wx.navigateBack();
  },

  onUnpick() {
    const pages = getCurrentPages();
    const prev = pages[pages.length - 2];
    if (prev && prev.route.indexOf('checkout') >= 0) {
      prev.applyCoupon(null);
    }
    wx.navigateBack();
  },

  onCenter() {
    wx.navigateTo({ url: '/pages/coupon-center/index' });
  },
});
