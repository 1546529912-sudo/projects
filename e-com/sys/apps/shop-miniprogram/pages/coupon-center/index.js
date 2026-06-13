const apis = require('../../apis/index.js');
const auth = require('../../utils/auth.js');

Page({
  data: {
    list: [],
    loading: true,
  },

  onLoad() {
    if (!auth.requireLogin('/pages/coupon-center/index')) return;
  },

  onShow() {
    this.load();
  },

  async load() {
    this.setData({ loading: true });
    try {
      const res = await apis.couponAvailable();
      const list = (res.data || []).map((r) => ({
        ...r,
        discount_yuan: r.type === 'threshold' ? (r.discount_value / 100).toFixed(2) : null,
        min_yuan: (r.min_amount / 100).toFixed(2),
        max_yuan: r.max_discount !== null ? (r.max_discount / 100).toFixed(2) : null,
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

  async onClaim(e) {
    const id = e.currentTarget.dataset.id;
    try {
      await apis.couponClaim(id);
      wx.showToast({ title: '领取成功', icon: 'success' });
      this.load();
    } catch (err) {
      wx.showToast({ title: err.msg || '领取失败', icon: 'none' });
    }
  },

  onMy() {
    wx.navigateTo({ url: '/pages/my-coupons/index' });
  },
});
