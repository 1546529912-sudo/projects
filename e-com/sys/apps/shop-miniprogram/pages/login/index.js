const apis = require('../../apis/index.js');
const auth = require('../../utils/auth.js');

Page({
  data: {
    // dev: 默认填测试账号 + 默认验证码（后端 dev 模式始终返回 123456）
    phone: '13800138000',
    code: '123456',
    countdown: 0,
    back: '',
  },

  onLoad(opts) {
    if (opts && opts.back) this.setData({ back: decodeURIComponent(opts.back) });
    // dev: 自动触发一次 sendSms，让后端缓存写入 code=123456，方便直接点登录
    this.onSendCode();
  },

  onInputPhone(e) { this.setData({ phone: e.detail.value }); },
  onInputCode(e) { this.setData({ code: e.detail.value }); },

  async onSendCode() {
    const phone = (this.data.phone || '').trim();
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '手机号格式错误', icon: 'none' });
      return;
    }
    try {
      const res = await apis.sendSms(phone);
      const tip = (res.data && res.data.code) ? ('dev 模式验证码: ' + res.data.code) : '验证码已发送';
      wx.showToast({ title: tip, icon: 'none', duration: 3000 });
      this.startCountdown();
    } catch (err) {
      wx.showToast({ title: err.msg || '发送失败', icon: 'none' });
    }
  },

  startCountdown() {
    this.setData({ countdown: 60 });
    const timer = setInterval(() => {
      const c = this.data.countdown - 1;
      if (c <= 0) { clearInterval(timer); this.setData({ countdown: 0 }); }
      else this.setData({ countdown: c });
    }, 1000);
  },

  async onLogin() {
    const phone = (this.data.phone || '').trim();
    const code = (this.data.code || '').trim();
    if (!phone || !code) {
      wx.showToast({ title: '请填写手机号和验证码', icon: 'none' });
      return;
    }
    try {
      const res = await apis.login(phone, code);
      auth.saveLogin(res.data.token, res.data.user);
      wx.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(() => {
        if (this.data.back) {
          wx.redirectTo({ url: this.data.back });
        } else {
          wx.switchTab({ url: '/pages/home/index' });
        }
      }, 500);
    } catch (err) {
      wx.showToast({ title: err.msg || '登录失败', icon: 'none' });
    }
  },
});
