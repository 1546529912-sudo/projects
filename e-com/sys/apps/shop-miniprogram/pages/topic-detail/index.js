const apis = require('../../apis/index.js');
const app = getApp();

function absUrl(p) {
  if (!p) return '';
  if (p.startsWith('http')) return p;
  return (app.globalData.apiBase || '') + p;
}

Page({
  data: {
    code: '',
    topic: null,
    items: [],
    loading: true,
    error: '',
  },

  onLoad(opts) {
    const code = (opts && opts.code) || '';
    if (!code) {
      this.setData({ loading: false, error: '专题 code 缺失' });
      return;
    }
    this.setData({ code });
    wx.setNavigationBarTitle({ title: '活动专题' });
    this.load();
  },

  onPullDownRefresh() {
    this.load().finally(() => wx.stopPullDownRefresh());
  },

  async load() {
    this.setData({ loading: true, error: '' });
    try {
      const res = await apis.topicDetailByCode(this.data.code);
      const topic = (res.data && res.data.topic) || null;
      const items = (res.data && res.data.items) || [];
      if (topic && topic.banner_image_url) {
        topic.banner_preview = absUrl(topic.banner_image_url);
      }
      const itemsAbs = items.map((it) => ({
        ...it,
        main_image_preview: absUrl(it.main_image),
      }));
      if (topic) wx.setNavigationBarTitle({ title: topic.name });
      this.setData({ topic, items: itemsAbs, loading: false });
    } catch (err) {
      this.setData({ loading: false, error: err.msg || '加载失败' });
    }
  },

  onItemTap(e) {
    // iter-51 Q41-01 — 后端 publicListTopicByCode 已回填 sku_code
    const sku = e.currentTarget.dataset.sku;
    if (sku) {
      wx.navigateTo({ url: '/pages/detail/index?sku=' + encodeURIComponent(sku) });
    } else {
      wx.showToast({ title: '商品已下架', icon: 'none' });
    }
  },
});
