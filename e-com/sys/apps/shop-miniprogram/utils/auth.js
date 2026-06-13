// 登录态工具
function isLogin() {
  try {
    return !!wx.getStorageSync('token');
  } catch (e) { return false; }
}

function getToken() {
  try { return wx.getStorageSync('token') || ''; } catch (e) { return ''; }
}

function getUserInfo() {
  try { return wx.getStorageSync('userInfo') || null; } catch (e) { return null; }
}

function saveLogin(token, userInfo) {
  try {
    wx.setStorageSync('token', token);
    wx.setStorageSync('userInfo', userInfo);
  } catch (e) {}
  const app = getApp();
  if (app && app.globalData) {
    app.globalData.token = token;
    app.globalData.userInfo = userInfo;
  }
}

function clearLogin() {
  try {
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
  } catch (e) {}
  const app = getApp();
  if (app && app.globalData) {
    app.globalData.token = null;
    app.globalData.userInfo = null;
  }
}

function requireLogin(redirectAfter) {
  if (isLogin()) return true;
  const url = '/pages/login/index' + (redirectAfter ? '?back=' + encodeURIComponent(redirectAfter) : '');
  wx.navigateTo({ url });
  return false;
}

module.exports = { isLogin, getToken, getUserInfo, saveLogin, clearLogin, requireLogin };
