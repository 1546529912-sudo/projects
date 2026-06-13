const apis = require('../../apis/index.js');
const app = getApp();

function absUrl(p) {
  if (!p) return '';
  if (p.startsWith('http')) return p;
  return (app.globalData.apiBase || '') + p;
}

Page({
  data: {
    orderNo: '',
    order: null,
    items: [],          // { order_item_id, old_sku_code, qty, max, name, priceYuan, new_sku_code, checked }
    reason: '',
    evidenceImages: [],
    evidencePreviews: [],
    uploading: false,
    submitting: false,
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
    try {
      const res = await apis.orderDetail(this.data.orderNo);
      const order = (res.data && res.data.order) || null;
      const items = ((res.data && res.data.items) || []).map((it) => ({
        order_item_id: it.id,
        old_sku_code: it.sku_code,
        qty: it.qty,
        max: it.qty,
        name: (it.sku_snapshot && it.sku_snapshot.spu_name) || it.sku_code,
        priceYuan: ((it.unit_price || 0) / 100).toFixed(2),
        new_sku_code: '',
        checked: false,
      }));
      this.setData({ order, items });
    } catch (err) {
      wx.showToast({ title: err.msg || '加载失败', icon: 'none' });
    }
  },

  onCheck(e) {
    const idx = e.currentTarget.dataset.idx;
    const items = this.data.items.slice();
    items[idx].checked = !items[idx].checked;
    this.setData({ items });
  },

  onNewSku(e) {
    const idx = e.currentTarget.dataset.idx;
    const items = this.data.items.slice();
    items[idx].new_sku_code = (e.detail.value || '').trim();
    this.setData({ items });
  },

  onQtyChange(e) {
    const idx = e.currentTarget.dataset.idx;
    const v = parseInt(e.detail.value || '0', 10);
    const items = this.data.items.slice();
    if (v <= 0 || v > items[idx].max) {
      wx.showToast({ title: '数量超出范围 1-' + items[idx].max, icon: 'none' });
      items[idx].qty = items[idx].max;
    } else {
      items[idx].qty = v;
    }
    this.setData({ items });
  },

  onReason(e) { this.setData({ reason: e.detail.value }); },

  async onPickImage() {
    if (this.data.evidenceImages.length >= 5) {
      wx.showToast({ title: '最多 5 张', icon: 'none' }); return;
    }
    const that = this;
    wx.chooseMedia({
      count: 5 - this.data.evidenceImages.length,
      mediaType: ['image'], sourceType: ['album', 'camera'], sizeType: ['compressed'],
      success: async (res) => {
        const paths = (res.tempFiles || []).map(f => f.tempFilePath);
        that.setData({ uploading: true });
        const urls = that.data.evidenceImages.slice();
        const previews = that.data.evidencePreviews.slice();
        for (const p of paths) {
          try {
            const r = await apis.uploadImage(p);
            const u = r.data && r.data.url;
            if (u) { urls.push(u); previews.push(absUrl(u)); }
          } catch (err) {
            wx.showToast({ title: err.msg || '上传失败', icon: 'none' });
          }
        }
        that.setData({
          evidenceImages: urls.filter(Boolean),
          evidencePreviews: previews.filter(Boolean),
          uploading: false,
        });
      },
    });
  },

  onRemoveImage(e) {
    const idx = e.currentTarget.dataset.idx;
    const arr = this.data.evidenceImages.slice();
    const prev = this.data.evidencePreviews.slice();
    arr.splice(idx, 1); prev.splice(idx, 1);
    this.setData({ evidenceImages: arr, evidencePreviews: prev });
  },

  async onSubmit() {
    const picked = this.data.items.filter(i => i.checked && i.qty > 0);
    if (!picked.length) { wx.showToast({ title: '请勾选至少一件商品', icon: 'none' }); return; }
    for (const i of picked) {
      if (!i.new_sku_code) {
        wx.showToast({ title: '请为「' + i.name + '」填写要换成的 SKU 编码', icon: 'none' });
        return;
      }
    }
    if (!this.data.reason) { wx.showToast({ title: '请填写换货原因', icon: 'none' }); return; }

    this.setData({ submitting: true });
    try {
      const res = await apis.exchangeApply({
        order_no: this.data.orderNo,
        items: picked.map(i => ({
          order_item_id: i.order_item_id,
          new_sku_code: i.new_sku_code,
          qty: i.qty,
        })),
        reason: this.data.reason,
        evidence_images: this.data.evidenceImages,
      });
      const no = (res.data && res.data.exchange && res.data.exchange.exchange_no) || '';
      wx.showToast({ title: '已提交 ' + no, icon: 'success' });
      setTimeout(() => { wx.redirectTo({ url: '/pages/my-exchanges/index' }); }, 800);
    } catch (err) {
      wx.showToast({ title: err.msg || '提交失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
