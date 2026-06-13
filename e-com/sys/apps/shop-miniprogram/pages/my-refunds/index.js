const apis = require('../../apis/index.js');
const app = getApp();

function absUrl(p) {
  if (!p) return '';
  if (p.startsWith('http')) return p;
  return (app.globalData.apiBase || '') + p;
}

const STATUS_TEXT = {
  pending_approve: '待审批',
  approved: '已通过',
  received_back: '已收货',
  refunded: '已退款',
  rejected: '已拒绝',
};

Page({
  data: { list: [], loading: true },

  onShow() { this.load(); },

  async load() {
    this.setData({ loading: true });
    try {
      const res = await apis.refundList(1, 50);
      const rows = ((res.data && res.data.list) || []).map((r) => {
        let imgs = [];
        if (r.evidence_images) {
          try { imgs = typeof r.evidence_images === 'string' ? JSON.parse(r.evidence_images) : r.evidence_images; } catch {}
        }
        return {
          ...r,
          statusText: STATUS_TEXT[r.status] || r.status,
          amountYuan: ((r.amount || 0) / 100).toFixed(2),
          evidenceList: (Array.isArray(imgs) ? imgs : []).map(absUrl),
        };
      });
      this.setData({ list: rows, loading: false });
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({ title: err.msg || '加载失败', icon: 'none' });
    }
  },
});
