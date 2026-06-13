// 业务接口集合
const { request, uploadFile } = require('../utils/request.js');

const apis = {
  // 健康检查
  health() {
    return request({ url: '/health' });
  },

  // —— 商品 ——
  productList(page = 1, size = 20) {
    return request({ url: '/api/v1/product/list', data: { page, size } });
  },
  productDetail(sku) {
    return request({ url: '/api/v1/product/' + encodeURIComponent(sku) });
  },

  // iter-39 BIZ-08-5 公开店铺信息（按 store code）
  storeDetail(storeIdOrCode) {
    return request({ url: '/api/v1/store/' + encodeURIComponent(storeIdOrCode) });
  },

  // iter-40 BIZ-09-1 内容运营
  bannerList(position = 'home') {
    return request({ url: '/api/v1/banner/list', data: { position } });
  },
  featuredList(position = 'home_hot', limit = 10) {
    return request({ url: '/api/v1/featured/list', data: { position, limit } });
  },

  // iter-41 BIZ-09-2 营销专题
  topicList(limit = 5) {
    return request({ url: '/api/v1/topic/list', data: { limit } });
  },
  topicDetailByCode(code) {
    return request({ url: '/api/v1/topic/' + encodeURIComponent(code) });
  },

  // —— 用户 ——
  sendSms(phone) {
    return request({ url: '/api/v1/sms/code', method: 'POST', data: { phone } });
  },
  login(phone, code) {
    return request({ url: '/api/v1/user/login', method: 'POST', data: { phone, code } });
  },
  logout() {
    return request({ url: '/api/v1/user/logout', method: 'POST' });
  },
  me() {
    return request({ url: '/api/v1/user/me' });
  },

  // —— 购物车 ——
  cartList() {
    return request({ url: '/api/v1/cart/list' });
  },
  cartAdd(sku_code, qty = 1) {
    return request({
      url: '/api/v1/cart/add', method: 'POST',
      data: { sku_code, qty },
      header: { 'Idempotency-Key': 'cart-add-' + Date.now() },
    });
  },
  cartUpdate(id, payload) {
    return request({ url: '/api/v1/cart/' + id, method: 'PUT', data: payload });
  },
  cartDelete(id) {
    return request({ url: '/api/v1/cart/' + id, method: 'DELETE' });
  },

  // —— 订单 ——
  // iter-27 Q19-03: user_coupon_ids 数组优先（多券叠加）；单数 user_coupon_id 兼容老调用
  orderSubmit(remark = '', user_coupon_id = 0, address = null, user_coupon_ids = null) {
    const data = { remark };
    if (Array.isArray(user_coupon_ids) && user_coupon_ids.length) {
      data.user_coupon_ids = user_coupon_ids;
    } else if (user_coupon_id > 0) {
      data.user_coupon_id = user_coupon_id;
    }
    if (address) data.address = address;
    return request({
      url: '/api/v1/order/submit', method: 'POST',
      data,
      header: { 'Idempotency-Key': 'order-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) },
    });
  },
  orderList(status, page = 1, size = 20) {
    return request({ url: '/api/v1/order/list', data: { status, page, size } });
  },
  orderDetail(orderNo) {
    return request({ url: '/api/v1/order/' + orderNo });
  },
  orderCancel(orderNo, reason = '用户取消') {
    return request({
      url: '/api/v1/order/' + orderNo + '/cancel', method: 'POST',
      data: { reason },
      header: { 'Idempotency-Key': 'cancel-' + orderNo + '-' + Date.now() },
    });
  },
  orderConfirm(orderNo) {
    return request({
      url: '/api/v1/order/' + orderNo + '/confirm', method: 'POST',
      header: { 'Idempotency-Key': 'confirm-' + orderNo + '-' + Date.now() },
    });
  },

  // —— 退款（iter-14/15）——
  refundApply({ order_no, type, items, reason, amount, evidence_images }) {
    return request({
      url: '/api/v1/refund', method: 'POST',
      data: { order_no, type, items, reason, amount, evidence_images: evidence_images || [] },
      header: { 'Idempotency-Key': 'refund-' + order_no + '-' + Date.now() },
    });
  },
  // 上传凭证图片（iter-15）
  uploadImage(filePath) {
    return uploadFile({ url: '/api/v1/upload/image', filePath, name: 'file' });
  },
  refundList(page = 1, size = 20) {
    return request({ url: '/api/v1/refund/list', data: { page, size } });
  },
  refundDetail(refundNo) {
    return request({ url: '/api/v1/refund/' + refundNo });
  },

  // —— 换货（iter-34）——
  exchangeApply({ order_no, items, reason, evidence_images }) {
    return request({
      url: '/api/v1/exchange', method: 'POST',
      data: { order_no, items, reason, evidence_images: evidence_images || [] },
      header: { 'Idempotency-Key': 'exchange-' + order_no + '-' + Date.now() },
    });
  },
  exchangeList(page = 1, size = 20) {
    return request({ url: '/api/v1/exchange/list', data: { page, size } });
  },
  exchangeDetail(no) {
    return request({ url: '/api/v1/exchange/' + no });
  },
  exchangeCancel(no) {
    return request({ url: '/api/v1/exchange/' + no + '/cancel', method: 'POST', data: {} });
  },

  // —— 支付 ——
  payWx(orderNo) {
    return request({
      url: '/api/v1/payment/wxpay', method: 'POST',
      data: { order_no: orderNo },
      header: { 'Idempotency-Key': 'pay-' + orderNo + '-' + Date.now() },
    });
  },
  payCallbackMock(orderNo) {
    return request({
      url: '/api/v1/payment/callback/mock', method: 'POST',
      data: { order_no: orderNo },
    });
  },

  // —— 地址簿（iter-20）——
  addressList() {
    return request({ url: '/api/v1/address/list' });
  },
  addressCreate(data) {
    return request({ url: '/api/v1/address', method: 'POST', data });
  },
  addressUpdate(id, data) {
    return request({ url: '/api/v1/address/' + id, method: 'PUT', data });
  },
  addressDelete(id) {
    return request({ url: '/api/v1/address/' + id, method: 'DELETE' });
  },
  addressSetDefault(id) {
    return request({ url: '/api/v1/address/' + id + '/default', method: 'POST' });
  },

  // —— 收藏（iter-20）——
  favoriteList() {
    return request({ url: '/api/v1/favorite/list' });
  },
  favoriteAdd(spuId) {
    return request({ url: '/api/v1/favorite/' + spuId, method: 'POST' });
  },
  favoriteRemove(spuId) {
    return request({ url: '/api/v1/favorite/' + spuId, method: 'DELETE' });
  },
  favoriteCheck(spuId) {
    return request({ url: '/api/v1/favorite/check/' + spuId });
  },

  // —— 评价（iter-20）——
  reviewSubmit({ order_no, sku_code, rating, content, images }) {
    return request({
      url: '/api/v1/review', method: 'POST',
      data: { order_no, sku_code, rating, content, images: images || [] },
    });
  },
  reviewMy(page = 1, size = 20) {
    return request({ url: '/api/v1/review/my', data: { page, size } });
  },
  reviewBySpu(spuId, page = 1, size = 20) {
    return request({ url: '/api/v1/review/by-spu/' + spuId, data: { page, size } });
  },

  // —— 优惠券（iter-19）——
  couponAvailable() {
    return request({ url: '/api/v1/coupon/available' });
  },
  couponClaim(id) {
    return request({ url: '/api/v1/coupon/' + id + '/claim', method: 'POST' });
  },
  couponMy(status = 'all') {
    return request({ url: '/api/v1/coupon/my', data: { status } });
  },
  couponCheck(user_coupon_id, goods_amount) {
    return request({
      url: '/api/v1/coupon/check', method: 'POST',
      data: { user_coupon_id, goods_amount },
    });
  },
  // iter-62 Q39-01 商家自助入驻
  merchantApply(data) {
    return request({ url: '/api/v1/merchant/apply', method: 'POST', data });
  },
};

module.exports = apis;
