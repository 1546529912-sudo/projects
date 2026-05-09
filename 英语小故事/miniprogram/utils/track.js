function track(event) {
  wx.cloud.callFunction({
    name: 'trackEvent',
    data: { ...event, ts: Date.now() },
  }).catch(() => {})
}

module.exports = { track }
