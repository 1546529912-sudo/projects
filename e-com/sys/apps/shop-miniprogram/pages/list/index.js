const apis = require('../../apis/index.js');

Page({
  data: {
    products: [],
    loading: true,
    error: '',
  },

  onLoad() {
    this.loadProducts();
  },

  async loadProducts() {
    this.setData({ loading: true, error: '' });
    try {
      const res = await apis.productList(1, 50);
      const list = ((res.data && res.data.list) || []).map((item) => ({
        ...item,
        price_yuan: ((item.base_price || 0) / 100).toFixed(2),
      }));
      this.setData({
        products: list,
        loading: false,
      });
    } catch (err) {
      this.setData({
        loading: false,
        error: err.msg || '加载失败',
      });
    }
  },
});
