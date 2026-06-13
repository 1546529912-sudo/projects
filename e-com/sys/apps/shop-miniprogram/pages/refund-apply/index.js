const apis = require('../../apis/index.js');
const app = getApp();

const TYPE_LABEL = { refund_only: '仅退款（未发货可用）', return_refund: '退货退款（已发货后可用）' };

function absUrl(p) {
  if (!p) return '';
  if (p.startsWith('http')) return p;
  return (app.globalData.apiBase || '') + p;
}

Page({
  data: {
    orderNo: '',
    type: 'refund_only',
    typeLabel: '',
    order: null,
    items: [],            // { sku_code, qty, max, name, image, priceYuan, checked }
    reason: '',
    amountYuan: '0.00',
    submitting: false,
    evidenceImages: [],   // 相对 URL 数组（发给后端存库）
    evidencePreviews: [], // 完整 URL（apiBase + 相对路径，用于 <image src>）
    uploading: false,
  },

  onLoad(opts) {
    const orderNo = (opts && opts.order_no) || '';
    const type = (opts && opts.type) || 'refund_only';
    if (!orderNo) {
      wx.showToast({ title: '订单号缺失', icon: 'none' });
      return;
    }
    this.setData({ orderNo, type, typeLabel: TYPE_LABEL[type] || type });
    this.load();
  },

  async load() {
    try {
      const res = await apis.orderDetail(this.data.orderNo);
      const order = (res.data && res.data.order) || null;
      const items = ((res.data && res.data.items) || []).map((it) => ({
        sku_code: it.sku_code,
        qty: it.qty,        // 申请的退款数量，初始等于购买数量
        max: it.qty,
        name: (it.sku_snapshot && it.sku_snapshot.spu_name) || it.sku_code,
        priceYuan: ((it.unit_price || 0) / 100).toFixed(2),
        checked: true,
      }));
      this.setData({ order, items });
      this.recalcAmount();
    } catch (err) {
      wx.showToast({ title: err.msg || '加载失败', icon: 'none' });
    }
  },

  onCheck(e) {
    const idx = e.currentTarget.dataset.idx;
    const items = this.data.items.slice();
    items[idx].checked = !items[idx].checked;
    this.setData({ items });
    this.recalcAmount();
  },

  onQtyChange(e) {
    const idx = e.currentTarget.dataset.idx;
    const v = parseInt(e.detail.value || '0', 10);
    const items = this.data.items.slice();
    if (v <= 0 || v > items[idx].max) {
      wx.showToast({ title: '数量超出可退范围 1-' + items[idx].max, icon: 'none' });
      items[idx].qty = items[idx].max;
    } else {
      items[idx].qty = v;
    }
    this.setData({ items });
    this.recalcAmount();
  },

  onReason(e) { this.setData({ reason: e.detail.value }); },

  recalcAmount() {
    // 简单算法：按 unit_price × qty
    let cents = 0;
    for (const it of this.data.items) {
      if (!it.checked) continue;
      cents += Math.round(parseFloat(it.priceYuan) * 100) * it.qty;
    }
    this.setData({ amountYuan: (cents / 100).toFixed(2), amountCents: cents });
  },

  // 选图 + 上传（最多 5 张，iter-15）
  async onPickImage() {
    if (this.data.evidenceImages.length >= 5) {
      wx.showToast({ title: '最多 5 张', icon: 'none' }); return;
    }
    const that = this;
    wx.chooseMedia({
      count: 5 - this.data.evidenceImages.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
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
    arr.splice(idx, 1);
    prev.splice(idx, 1);
    this.setData({ evidenceImages: arr, evidencePreviews: prev });
  },

  async onSubmit() {
    const picked = this.data.items.filter(i => i.checked && i.qty > 0);
    if (!picked.length) { wx.showToast({ title: '请勾选至少一件商品', icon: 'none' }); return; }
    if (!this.data.reason) { wx.showToast({ title: '请填写退款原因', icon: 'none' }); return; }
    if (this.data.amountCents <= 0) { wx.showToast({ title: '退款金额异常', icon: 'none' }); return; }

    this.setData({ submitting: true });
    try {
      const res = await apis.refundApply({
        order_no: this.data.orderNo,
        type: this.data.type,
        items: picked.map(i => ({ sku_code: i.sku_code, qty: i.qty })),
        reason: this.data.reason,
        amount: this.data.amountCents,
        evidence_images: this.data.evidenceImages,
      });
      const no = (res.data && res.data.refund && res.data.refund.refund_no) || '';
      wx.showToast({ title: '已提交 ' + no, icon: 'success' });
      setTimeout(() => { wx.redirectTo({ url: '/pages/my-refunds/index' }); }, 800);
    } catch (err) {
      wx.showToast({ title: err.msg || '提交失败', icon: 'none' });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
