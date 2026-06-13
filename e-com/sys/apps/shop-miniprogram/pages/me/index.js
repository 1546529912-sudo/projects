const auth = require('../../utils/auth.js');
const apis = require('../../apis/index.js');

Page({
  data: { user: null, isLogin: false },

  onShow() {
    const isLogin = auth.isLogin();
    this.setData({ isLogin, user: auth.getUserInfo() });
  },

  onLogin() { wx.navigateTo({ url: '/pages/login/index' }); },
  onOrders() {
    if (!auth.requireLogin('/pages/me/index')) return;
    wx.navigateTo({ url: '/pages/order-list/index' });
  },
  onOrdersPending() {
    if (!auth.requireLogin('/pages/me/index')) return;
    wx.navigateTo({ url: '/pages/order-list/index?status=pending_pay' });
  },
  onRefunds() {
    if (!auth.requireLogin('/pages/me/index')) return;
    wx.navigateTo({ url: '/pages/my-refunds/index' });
  },
  onExchanges() {
    if (!auth.requireLogin('/pages/me/index')) return;
    wx.navigateTo({ url: '/pages/my-exchanges/index' });
  },
  onCouponCenter() {
    if (!auth.requireLogin('/pages/me/index')) return;
    wx.navigateTo({ url: '/pages/coupon-center/index' });
  },
  onMyCoupons() {
    if (!auth.requireLogin('/pages/me/index')) return;
    wx.navigateTo({ url: '/pages/my-coupons/index' });
  },
  onAddresses() {
    if (!auth.requireLogin('/pages/me/index')) return;
    wx.navigateTo({ url: '/pages/address-list/index' });
  },
  onFavorites() {
    if (!auth.requireLogin('/pages/me/index')) return;
    wx.navigateTo({ url: '/pages/favorites/index' });
  },
  onMyReviews() {
    if (!auth.requireLogin('/pages/me/index')) return;
    wx.navigateTo({ url: '/pages/my-reviews/index' });
  },
  onLogout() {
    wx.showModal({
      title: '退出登录？',
      success: async (r) => {
        if (!r.confirm) return;
        try { await apis.logout(); } catch (e) {}
        auth.clearLogin();
        this.setData({ isLogin: false, user: null });
      },
    });
  },
});
