const apis = require('../../apis/index.js');
const auth = require('../../utils/auth.js');

Page({
  data: {
    list: [],
    loading: true,
    selectMode: false,  // ?select=1 → 选地址回填结算页
  },

  onLoad(opts) {
    if (!auth.requireLogin('/pages/address-list/index')) return;
    if (opts.select === '1') this.setData({ selectMode: true });
  },

  onShow() { this.load(); },

  async load() {
    this.setData({ loading: true });
    try {
      const res = await apis.addressList();
      this.setData({ list: res.data || [], loading: false });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: err.msg || '加载失败', icon: 'none' });
    }
  },

  onAdd() {
    wx.navigateTo({ url: '/pages/address-edit/index' });
  },

  onEdit(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/address-edit/index?id=' + id });
  },

  async onDelete(e) {
    const id = e.currentTarget.dataset.id;
    const ok = await new Promise((r) => wx.showModal({ title: '删除地址？', success: (res) => r(res.confirm) }));
    if (!ok) return;
    try {
      await apis.addressDelete(id);
      wx.showToast({ title: '已删除', icon: 'success' });
      this.load();
    } catch (err) {
      wx.showToast({ title: err.msg || '删除失败', icon: 'none' });
    }
  },

  async onSetDefault(e) {
    const id = e.currentTarget.dataset.id;
    try {
      await apis.addressSetDefault(id);
      wx.showToast({ title: '已设为默认', icon: 'success' });
      this.load();
    } catch (err) {
      wx.showToast({ title: err.msg || '操作失败', icon: 'none' });
    }
  },

  // 选择模式：选中回传给上页
  onPick(e) {
    if (!this.data.selectMode) return;
    const id = e.currentTarget.dataset.id;
    const item = this.data.list.find((x) => x.id === id);
    if (!item) return;
    const pages = getCurrentPages();
    const prev = pages[pages.length - 2];
    if (prev && typeof prev.applyAddress === 'function') {
      prev.applyAddress(item);
    }
    wx.navigateBack();
  },
});
