const apis = require('../../apis/index.js');
const auth = require('../../utils/auth.js');

Page({
  data: {
    list: [],
    totalAmountYuan: '0.00',
    selectedQty: 0,
    loading: true,
    isLogin: false,
  },

  onShow() {
    this.setData({ isLogin: auth.isLogin() });
    if (!auth.isLogin()) { this.setData({ loading: false }); return; }
    this.load();
  },

  async load() {
    this.setData({ loading: true });
    try {
      const res = await apis.cartList();
      const list = (res.data.list || []).map((r) => ({
        ...r,
        priceYuan: r.sku ? ((r.sku.price || 0) / 100).toFixed(2) : '0.00',
        subtotalYuan: (r.subtotal / 100).toFixed(2),
      }));
      this.setData({
        list,
        totalAmountYuan: res.data.total_amount_yuan,
        selectedQty: res.data.selected_qty,
        loading: false,
      });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: err.msg || '加载失败', icon: 'none' });
    }
  },

  async onToggle(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.list.find((x) => x.id === id);
    if (!item) return;
    try {
      await apis.cartUpdate(id, { selected: item.selected ? 0 : 1 });
      this.load();
    } catch (err) { wx.showToast({ title: err.msg, icon: 'none' }); }
  },

  async onPlus(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.list.find((x) => x.id === id);
    try { await apis.cartUpdate(id, { qty: item.qty + 1 }); this.load(); }
    catch (err) { wx.showToast({ title: err.msg, icon: 'none' }); }
  },

  async onMinus(e) {
    const id = e.currentTarget.dataset.id;
    const item = this.data.list.find((x) => x.id === id);
    if (item.qty <= 1) return;
    try { await apis.cartUpdate(id, { qty: item.qty - 1 }); this.load(); }
    catch (err) { wx.showToast({ title: err.msg, icon: 'none' }); }
  },

  async onDelete(e) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除', content: '从购物车移除此商品？',
      success: async (r) => {
        if (!r.confirm) return;
        try { await apis.cartDelete(id); this.load(); }
        catch (err) { wx.showToast({ title: err.msg, icon: 'none' }); }
      },
    });
  },

  onCheckout() {
    if (this.data.selectedQty === 0) {
      wx.showToast({ title: '请先勾选商品', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: '/pages/checkout/index' });
  },

  onLogin() {
    wx.navigateTo({ url: '/pages/login/index' });
  },
});
