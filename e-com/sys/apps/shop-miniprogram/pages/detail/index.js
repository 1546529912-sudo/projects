const apis = require('../../apis/index.js');
const auth = require('../../utils/auth.js');

Page({
  data: {
    sku: '',
    loading: true,
    error: '',
    skuInfo: null,
    spuInfo: null,
    available: 0,
    qty: 1,
    priceYuan: '0.00',
    // iter-20
    favored: false,
    reviewCount: 0,
    ratingAvg: 0,
    reviews: [],   // 前 3 条简略
  },

  onLoad(opts) {
    const sku = opts && opts.sku ? decodeURIComponent(opts.sku) : '';
    if (!sku) {
      this.setData({ loading: false, error: '缺少 sku 参数' });
      return;
    }
    this.setData({ sku });
    this.load();
  },

  absUrl(p) {
    if (!p) return '';
    if (p.startsWith('http')) return p;
    const app = getApp();
    return ((app && app.globalData && app.globalData.apiBase) || '') + p;
  },

  async load() {
    this.setData({ loading: true, error: '' });
    try {
      const res = await apis.productDetail(this.data.sku);
      const sku = res.data.sku || {};
      const spu = res.data.spu || {};
      const reviews = (res.data.reviews || []).map((r) => ({
        ...r,
        previews: (r.images || []).map((p) => this.absUrl(p)),
        stars: '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating),
      }));
      this.setData({
        skuInfo: sku,
        spuInfo: spu,
        available: res.data.available || 0,
        priceYuan: sku.price_yuan || ((sku.price || 0) / 100).toFixed(2),
        reviewCount: res.data.review_count || 0,
        ratingAvg: res.data.rating_avg || 0,
        reviews,
        loading: false,
      });
      // iter-39 BIZ-08-5: 拉店铺信息（基于 spu.store_id，若为 1=平台店则隐藏）
      const storeId = spu && spu.store_id;
      if (storeId && storeId !== 1) {
        try {
          const sres = await apis.storeDetail(storeId);
          this.setData({ storeInfo: sres.data });
        } catch (e) {}
      }
      // 收藏状态
      if (spu && spu.id && auth.isLogin()) {
        try {
          const fav = await apis.favoriteCheck(spu.id);
          this.setData({ favored: !!(fav.data && fav.data.favored) });
        } catch (e) {}
      }
    } catch (err) {
      this.setData({ loading: false, error: err.msg || '加载失败' });
    }
  },

  async onToggleFav() {
    if (!auth.requireLogin('/pages/detail/index?sku=' + encodeURIComponent(this.data.sku))) return;
    const spuId = this.data.spuInfo && this.data.spuInfo.id;
    if (!spuId) return;
    try {
      if (this.data.favored) {
        await apis.favoriteRemove(spuId);
        this.setData({ favored: false });
        wx.showToast({ title: '已取消收藏', icon: 'success' });
      } else {
        await apis.favoriteAdd(spuId);
        this.setData({ favored: true });
        wx.showToast({ title: '已收藏', icon: 'success' });
      }
    } catch (err) {
      wx.showToast({ title: err.msg || '操作失败', icon: 'none' });
    }
  },

  onPlus() {
    if (this.data.qty < this.data.available) this.setData({ qty: this.data.qty + 1 });
  },
  onMinus() {
    if (this.data.qty > 1) this.setData({ qty: this.data.qty - 1 });
  },

  async onAddCart() {
    if (!auth.requireLogin('/pages/detail/index?sku=' + encodeURIComponent(this.data.sku))) return;
    try {
      await apis.cartAdd(this.data.sku, this.data.qty);
      wx.showToast({ title: '已加入购物车', icon: 'success' });
    } catch (err) {
      wx.showToast({ title: err.msg || '加购失败', icon: 'none' });
    }
  },

  async onBuyNow() {
    if (!auth.requireLogin('/pages/detail/index?sku=' + encodeURIComponent(this.data.sku))) return;
    try {
      await apis.cartAdd(this.data.sku, this.data.qty);
      wx.switchTab({ url: '/pages/cart/index' });
    } catch (err) {
      wx.showToast({ title: err.msg || '加购失败', icon: 'none' });
    }
  },

  onGoCart() {
    wx.switchTab({ url: '/pages/cart/index' });
  },
});
