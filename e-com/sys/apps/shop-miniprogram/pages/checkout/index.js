const apis = require('../../apis/index.js');
const auth = require('../../utils/auth.js');

Page({
  data: {
    address: null,
    list: [],
    totalAmountYuan: '0.00',
    selectedQty: 0,
    freightYuan: '10.00',
    payTotalYuan: '0.00',
    remark: '',
    submitting: false,
    // iter-19 优惠券
    goodsAmountCents: 0,
    couponName: '',
    userCouponId: 0,
    discountYuan: '0.00',
  },

  onLoad() {
    if (!auth.requireLogin('/pages/checkout/index')) return;
  },

  onShow() {
    // iter-20 fix: 仅首次进入加载默认地址；从 address-list 回来后保留用户已选
    if (!this.data.address) this.loadDefaultAddress();
    this.loadCart();
  },

  async loadDefaultAddress() {
    // iter-20: 优先从地址簿取默认；空时回落老的 last_address_snapshot
    try {
      const res = await apis.addressList();
      const list = res.data || [];
      const def = list.find((x) => x.is_default) || list[0];
      if (def) {
        this.setData({ address: def });
        return;
      }
    } catch (e) {}
    const u = auth.getUserInfo();
    this.setData({ address: (u && u.last_address_snapshot) || null });
  },

  onPickAddress() {
    wx.navigateTo({ url: '/pages/address-list/index?select=1' });
  },

  applyAddress(addr) {
    this.setData({ address: addr });
  },

  async loadCart() {
    try {
      const res = await apis.cartList();
      const selected = (res.data.list || []).filter((r) => r.selected && r.available).map((r) => ({
        ...r,
        priceYuan: r.sku ? ((r.sku.price || 0) / 100).toFixed(2) : '0.00',
        subtotalYuan: (r.subtotal / 100).toFixed(2),
      }));
      const goods = res.data.total_amount || 0;
      this.setData({
        list: selected,
        totalAmountYuan: (goods / 100).toFixed(2),
        selectedQty: res.data.selected_qty,
        goodsAmountCents: goods,
      }, () => {
        // 重新校验已选券（金额/有效期可能变了）
        if (this.data.userCouponId > 0) this.recheckCoupon();
        else this.recomputeTotal();
      });
    } catch (err) {
      wx.showToast({ title: err.msg || '加载失败', icon: 'none' });
    }
  },

  onRemark(e) { this.setData({ remark: e.detail.value }); },

  onPickCoupon() {
    wx.navigateTo({
      url: '/pages/my-coupons/index?select=1&goods_amount=' + this.data.goodsAmountCents,
    });
  },

  // 给 my-coupons 回调
  applyCoupon(payload) {
    if (!payload) {
      this.setData({ userCouponId: 0, couponName: '', discountYuan: '0.00' }, () => this.recomputeTotal());
      return;
    }
    this.setData({ userCouponId: payload.user_coupon_id, couponName: payload.name }, () => this.recheckCoupon());
  },

  async recheckCoupon() {
    try {
      const res = await apis.couponCheck(this.data.userCouponId, this.data.goodsAmountCents);
      const discount = res.data?.discount || 0;
      this.setData({
        discountYuan: (discount / 100).toFixed(2),
      }, () => this.recomputeTotal(discount));
    } catch (err) {
      wx.showToast({ title: err.msg || '券不可用', icon: 'none' });
      this.setData({ userCouponId: 0, couponName: '', discountYuan: '0.00' }, () => this.recomputeTotal());
    }
  },

  recomputeTotal(discountCents = 0) {
    const freight = 1000;
    const goods = this.data.goodsAmountCents;
    const pay = Math.max(0, goods + freight - discountCents);
    this.setData({ payTotalYuan: (pay / 100).toFixed(2) });
  },

  async onSubmit() {
    if (!this.data.address) {
      wx.showToast({ title: '请先设置收货地址', icon: 'none' });
      return;
    }
    if (this.data.list.length === 0) {
      wx.showToast({ title: '没有可结算商品', icon: 'none' });
      return;
    }
    if (this.data.submitting) return;
    this.setData({ submitting: true });
    try {
      const addrPayload = this.data.address ? {
        name: this.data.address.name,
        phone: this.data.address.phone,
        province: this.data.address.province,
        city: this.data.address.city,
        district: this.data.address.district,
        detail: this.data.address.detail,
      } : null;
      const res = await apis.orderSubmit(this.data.remark, this.data.userCouponId, addrPayload);
      const orderNo = res.data && res.data.order && res.data.order.order_no;
      if (!orderNo) throw new Error('订单号缺失');
      wx.redirectTo({ url: '/pages/pay/index?order_no=' + orderNo });
    } catch (err) {
      this.setData({ submitting: false });
      wx.showToast({ title: err.msg || '下单失败', icon: 'none' });
    }
  },
});
