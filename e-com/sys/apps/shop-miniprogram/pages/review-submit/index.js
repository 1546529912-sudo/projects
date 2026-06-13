const apis = require('../../apis/index.js');
const auth = require('../../utils/auth.js');

Page({
  data: {
    order_no: '',
    sku_code: '',
    rating: 5,
    content: '',
    images: [],         // 后端相对路径数组
    previews: [],       // 绝对路径用于展示
    submitting: false,
  },

  onLoad(opts) {
    if (!auth.requireLogin('/pages/review-submit/index')) return;
    this.setData({
      order_no: opts.order_no || '',
      sku_code: opts.sku_code || '',
    });
  },

  absUrl(p) {
    if (!p) return '';
    if (p.startsWith('http')) return p;
    const app = getApp();
    return ((app && app.globalData && app.globalData.apiBase) || '') + p;
  },

  onRating(e) { this.setData({ rating: e.detail.value }); },
  onContent(e) { this.setData({ content: e.detail.value }); },

  onAddImage() {
    if (this.data.images.length >= 9) {
      wx.showToast({ title: '最多 9 张', icon: 'none' });
      return;
    }
    wx.chooseImage({
      count: 9 - this.data.images.length,
      sizeType: ['compressed'],
      success: async (res) => {
        for (const p of res.tempFilePaths) {
          try {
            const up = await apis.uploadImage(p);
            const rel = up.data && up.data.url ? up.data.url : '';
            if (rel) {
              this.setData({
                images: [...this.data.images, rel],
                previews: [...this.data.previews, this.absUrl(rel)],
              });
            }
          } catch (err) {
            wx.showToast({ title: err.msg || '上传失败', icon: 'none' });
          }
        }
      },
    });
  },

  onRemoveImage(e) {
    const i = e.currentTarget.dataset.idx;
    const images = this.data.images.filter((_, idx) => idx !== i);
    const previews = this.data.previews.filter((_, idx) => idx !== i);
    this.setData({ images, previews });
  },

  onPreview(e) {
    const i = e.currentTarget.dataset.idx;
    wx.previewImage({ current: this.data.previews[i], urls: this.data.previews });
  },

  async onSubmit() {
    if (!this.data.order_no || !this.data.sku_code) {
      wx.showToast({ title: '订单/SKU 缺失', icon: 'none' });
      return;
    }
    if (this.data.rating < 1 || this.data.rating > 5) {
      wx.showToast({ title: '请打分', icon: 'none' });
      return;
    }
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    try {
      await apis.reviewSubmit({
        order_no: this.data.order_no,
        sku_code: this.data.sku_code,
        rating: this.data.rating,
        content: this.data.content,
        images: this.data.images,
      });
      wx.showToast({ title: '评价成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 800);
    } catch (err) {
      this.setData({ submitting: false });
      wx.showToast({ title: err.msg || '提交失败', icon: 'none' });
    }
  },
});
