const apis = require('../../apis/index.js');

const STATUS_TEXT = {
  pending_pay: '待支付', paid: '已支付', picking: '拣货中',
  shipped: '已发货', completed: '已完成', cancelled: '已取消', exception: '异常',
};

Page({
  data: {
    orderNo: '',
    order: null,
    items: [],
    address: null,
    statusText: '',
    totalYuan: '0.00',
    goodsYuan: '0.00',
    freightYuan: '10.00',
    loading: true,
  },

  onLoad(opts) {
    const orderNo = (opts && opts.order_no) || '';
    if (!orderNo) {
      wx.showToast({ title: '订单号缺失', icon: 'none' });
      return;
    }
    this.setData({ orderNo });
    this.load();
  },

  async load() {
    this.setData({ loading: true });
    try {
      const res = await apis.orderDetail(this.data.orderNo);
      const order = (res.data && res.data.order) || null;
      const items = ((res.data && res.data.items) || []).map((it) => ({
        ...it,
        subtotalYuan: (it.subtotal / 100).toFixed(2),
        priceYuan: (it.unit_price / 100).toFixed(2),
      }));
      if (!order) throw new Error('订单不存在');
      this.setData({
        order,
        items,
        address: order.address || null,
        statusText: STATUS_TEXT[order.status] || order.status,
        totalYuan: (order.total_amount / 100).toFixed(2),
        goodsYuan: (order.goods_amount / 100).toFixed(2),
        freightYuan: (order.freight / 100).toFixed(2),
        loading: false,
      });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: err.msg || '加载失败', icon: 'none' });
    }
  },

  onPay() { wx.navigateTo({ url: '/pages/pay/index?order_no=' + this.data.orderNo }); },

  async onCancel() {
    const that = this;
    wx.showModal({
      title: '确认取消订单', content: '取消后库存自动释放',
      success: async (r) => {
        if (!r.confirm) return;
        try {
          await apis.orderCancel(that.data.orderNo, '用户取消');
          wx.showToast({ title: '已取消', icon: 'success' });
          that.load();
        } catch (err) { wx.showToast({ title: err.msg, icon: 'none' }); }
      },
    });
  },

  onRefund(e) {
    const type = (e.currentTarget.dataset && e.currentTarget.dataset.type) || 'refund_only';
    wx.navigateTo({ url: '/pages/refund-apply/index?order_no=' + this.data.orderNo + '&type=' + type });
  },

  onExchange() {
    wx.navigateTo({ url: '/pages/exchange-apply/index?order_no=' + this.data.orderNo });
  },

  onReview(e) {
    const skuCode = e.currentTarget.dataset.sku;
    wx.navigateTo({
      url: '/pages/review-submit/index?order_no=' + this.data.orderNo + '&sku_code=' + encodeURIComponent(skuCode),
    });
  },

  async onConfirm() {
    const that = this;
    wx.showModal({
      title: '确认收货？', content: '确认后订单完成',
      success: async (r) => {
        if (!r.confirm) return;
        try {
          await apis.orderConfirm(that.data.orderNo);
          wx.showToast({ title: '已确认收货', icon: 'success' });
          that.load();
        } catch (err) { wx.showToast({ title: err.msg, icon: 'none' }); }
      },
    });
  },
});
