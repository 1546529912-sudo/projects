const apis = require('../../apis/index.js');
const auth = require('../../utils/auth.js');

Page({
  data: {
    id: 0,
    name: '',
    phone: '',
    region: ['', '', ''],   // [province, city, district]
    detail: '',
    submitting: false,
  },

  onLoad(opts) {
    if (!auth.requireLogin('/pages/address-edit/index')) return;
    if (opts.id) {
      this.setData({ id: parseInt(opts.id, 10) });
      this.loadDetail(opts.id);
      wx.setNavigationBarTitle({ title: '编辑地址' });
    } else {
      wx.setNavigationBarTitle({ title: '新增地址' });
    }
  },

  async loadDetail(id) {
    try {
      const res = await apis.addressList();
      const item = (res.data || []).find((x) => x.id === parseInt(id, 10));
      if (item) {
        this.setData({
          name: item.name,
          phone: item.phone,
          region: [item.province, item.city, item.district],
          detail: item.detail,
        });
      }
    } catch (err) {
      wx.showToast({ title: err.msg || '加载失败', icon: 'none' });
    }
  },

  onName(e) { this.setData({ name: e.detail.value }); },
  onPhone(e) { this.setData({ phone: e.detail.value }); },
  onRegion(e) { this.setData({ region: e.detail.value }); },
  onDetail(e) { this.setData({ detail: e.detail.value }); },

  async onSubmit() {
    const { id, name, phone, region, detail } = this.data;
    if (!name || !phone || !region[0] || !region[1] || !region[2] || !detail) {
      wx.showToast({ title: '请填写完整', icon: 'none' });
      return;
    }
    if (!/^1\d{10}$/.test(phone)) {
      wx.showToast({ title: '手机号格式不对', icon: 'none' });
      return;
    }
    const payload = {
      name, phone,
      province: region[0], city: region[1], district: region[2],
      detail,
    };
    this.setData({ submitting: true });
    try {
      if (id > 0) await apis.addressUpdate(id, payload);
      else await apis.addressCreate(payload);
      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 800);
    } catch (err) {
      this.setData({ submitting: false });
      wx.showToast({ title: err.msg || '保存失败', icon: 'none' });
    }
  },
});
