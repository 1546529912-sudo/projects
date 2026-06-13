// iter-62 Q39-01 商家自助入驻
const apis = require('../../apis/index.js');

Page({
  data: {
    code: '',
    name: '',
    description: '',
    contact_name: '',
    contact_phone: '',
    business_license: '',
    submitting: false,
    submitted: false,
  },

  onInput(e) {
    const k = e.currentTarget.dataset.k;
    this.setData({ [k]: (e.detail.value || '').trim() });
  },

  async onSubmit() {
    const d = this.data;
    if (!d.code || !d.name || !d.contact_name || !d.contact_phone || !d.business_license) {
      wx.showToast({ title: '请填齐 5 项必填', icon: 'none' });
      return;
    }
    if (!/^[a-z][a-z0-9\-]{2,30}$/.test(d.code)) {
      wx.showToast({ title: '店铺 code 格式：小写字母开头', icon: 'none' });
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(d.contact_phone)) {
      wx.showToast({ title: '手机号格式错误', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    try {
      const res = await apis.merchantApply({
        code: d.code,
        name: d.name,
        description: d.description,
        contact_name: d.contact_name,
        contact_phone: d.contact_phone,
        business_license: d.business_license,
      });
      if (res.code === 0) {
        this.setData({ submitted: true });
        wx.showToast({ title: '申请已提交', icon: 'success' });
      } else {
        wx.showToast({ title: res.msg || '提交失败', icon: 'none' });
      }
    } catch (e) {
      wx.showToast({ title: (e && e.msg) || '提交失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
