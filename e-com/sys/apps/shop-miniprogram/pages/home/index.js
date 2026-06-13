const apis = require('../../apis/index.js');

Page({
  data: {
    products: [],
    loading: true,
    error: '',
    source: '',
    cartCount: 0,
    banners: [],
    featured: [],
    topics: [],
  },

  onLoad() {
    this.loadBanners();
    this.loadFeatured();
    this.loadTopics();
    this.loadProducts();
  },

  onPullDownRefresh() {
    Promise.all([this.loadBanners(), this.loadFeatured(), this.loadTopics(), this.loadProducts()])
      .finally(() => wx.stopPullDownRefresh());
  },

  async loadTopics() {
    try {
      const res = await apis.topicList(3);
      this.setData({ topics: (res.data && res.data.list) || [] });
    } catch (err) { console.warn('[home.topics]', err); }
  },

  onTopicTap(e) {
    const code = e.currentTarget.dataset.code;
    if (code) wx.navigateTo({ url: '/pages/topic-detail/index?code=' + encodeURIComponent(code) });
  },

  async loadBanners() {
    try {
      const res = await apis.bannerList('home');
      this.setData({ banners: (res.data && res.data.list) || [] });
    } catch (err) { console.warn('[home.banners]', err); }
  },

  async loadFeatured() {
    try {
      const res = await apis.featuredList('home_hot', 6);
      this.setData({ featured: (res.data && res.data.list) || [] });
    } catch (err) { console.warn('[home.featured]', err); }
  },

  onBannerTap(e) {
    // iter-51 Q40-01 — 后端 publicListBanners 已回填 link_sku（默认首 SKU）
    const { type, value, sku } = e.currentTarget.dataset;
    if (!type || type === 'none') return;
    if (type === 'spu') {
      if (sku) {
        wx.navigateTo({ url: '/pages/detail/index?sku=' + encodeURIComponent(sku) });
      } else {
        wx.showToast({ title: '该商品已下架', icon: 'none' });
      }
    } else if (type === 'category') {
      wx.navigateTo({ url: '/pages/list/index?category=' + encodeURIComponent(value) });
    } else if (type === 'url') {
      wx.showToast({ title: '外链 ' + value, icon: 'none' });
    }
  },

  onFeaturedTap(e) {
    // iter-51 Q40-01 — featured list 已回填 sku_code
    const sku = e.currentTarget.dataset.sku;
    if (sku) {
      wx.navigateTo({ url: '/pages/detail/index?sku=' + encodeURIComponent(sku) });
    } else {
      wx.showToast({ title: '商品已下架', icon: 'none' });
    }
  },

  async loadProducts() {
    this.setData({ loading: true, error: '' });
    try {
      const res = await apis.productList(1, 20);
      const list = ((res.data && res.data.list) || []).map((item) => ({
        ...item,
        price_yuan: ((item.base_price || 0) / 100).toFixed(2),
        sales_text: item.sales || 0,
      }));
      this.setData({
        products: list,
        source: res.source || '',
        loading: false,
      });
    } catch (err) {
      console.error('[home.loadProducts]', err);
      this.setData({
        loading: false,
        error: err.msg || '加载失败',
      });
    }
  },

  onProductTap(e) {
    const sku = e.currentTarget.dataset.sku;
    if (!sku) return;
    wx.navigateTo({ url: '/pages/detail/index?sku=' + encodeURIComponent(sku) });
  },
});
