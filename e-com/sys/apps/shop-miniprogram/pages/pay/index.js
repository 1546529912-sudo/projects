const apis = require('../../apis/index.js');

Page({
  data: {
    orderNo: '',
    amountYuan: '0.00',
    paying: false,
  },

  onLoad(opts) {
    const orderNo = (opts && opts.order_no) || '';
    if (!orderNo) {
      wx.showToast({ title: '订单号缺失', icon: 'none' });
      return;
    }
    this.setData({ orderNo });
    this.loadDetail();
  },

  async loadDetail() {
    try {
      const res = await apis.orderDetail(this.data.orderNo);
      const order = res.data && res.data.order;
      if (order) {
        this.setData({ amountYuan: (order.total_amount / 100).toFixed(2) });
      }
    } catch (err) { wx.showToast({ title: err.msg, icon: 'none' }); }
  },

  async onPay() {
    if (this.data.paying) return;
    this.setData({ paying: true });
    try {
      await apis.payWx(this.data.orderNo);
      // mock：直接调回调
      const res = await apis.payCallbackMock(this.data.orderNo);
      if (res.code === 0) {
        wx.redirectTo({ url: '/pages/pay-result/index?order_no=' + this.data.orderNo + '&result=success' });
      } else {
        throw new Error(res.msg);
      }
    } catch (err) {
      this.setData({ paying: false });
      wx.redirectTo({ url: '/pages/pay-result/index?order_no=' + this.data.orderNo + '&result=fail&msg=' + encodeURIComponent(err.msg || '支付失败') });
    }
  },

  onCancel() {
    wx.redirectTo({ url: '/pages/order-list/index' });
  },
});
