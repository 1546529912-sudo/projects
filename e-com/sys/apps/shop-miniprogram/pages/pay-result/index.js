Page({
  data: {
    orderNo: '',
    success: true,
    msg: '',
  },

  onLoad(opts) {
    this.setData({
      orderNo: (opts && opts.order_no) || '',
      success: (opts && opts.result) === 'success',
      msg: (opts && opts.msg) ? decodeURIComponent(opts.msg) : '',
    });
  },

  onViewOrder() {
    wx.redirectTo({ url: '/pages/order-detail/index?order_no=' + this.data.orderNo });
  },
  onHome() { wx.switchTab({ url: '/pages/home/index' }); },
  onRetry() { wx.redirectTo({ url: '/pages/pay/index?order_no=' + this.data.orderNo }); },
});
