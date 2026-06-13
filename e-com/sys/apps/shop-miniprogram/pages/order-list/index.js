const apis = require('../../apis/index.js');
const auth = require('../../utils/auth.js');

const STATUS_TABS = [
  { key: '', label: '全部' },
  { key: 'pending_pay', label: '待支付' },
  { key: 'paid', label: '待发货' },
  { key: 'shipped', label: '待收货' },
  { key: 'completed', label: '已完成' },
];

const STATUS_TEXT = {
  pending_pay: '待支付',
  paid: '已支付',
  picking: '拣货中',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消',
  exception: '异常',
};

Page({
  data: {
    tabs: STATUS_TABS,
    activeTab: '',
    list: [],
    loading: true,
  },

  onLoad(opts) {
    if (opts && opts.status) this.setData({ activeTab: opts.status });
  },

  onShow() {
    if (!auth.requireLogin('/pages/order-list/index')) return;
    this.load();
  },

  onTab(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ activeTab: key });
    this.load();
  },

  async load() {
    this.setData({ loading: true });
    try {
      const res = await apis.orderList(this.data.activeTab, 1, 50);
      const list = (res.data.list || []).map((o) => ({
        ...o,
        statusText: STATUS_TEXT[o.status] || o.status,
        totalYuan: (o.total_amount / 100).toFixed(2),
      }));
      this.setData({ list, loading: false });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: err.msg || '加载失败', icon: 'none' });
    }
  },

  onTapOrder(e) {
    const no = e.currentTarget.dataset.no;
    wx.navigateTo({ url: '/pages/order-detail/index?order_no=' + no });
  },

  onPay(e) {
    const no = e.currentTarget.dataset.no;
    wx.navigateTo({ url: '/pages/pay/index?order_no=' + no });
  },
});
