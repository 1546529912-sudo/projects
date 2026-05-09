const { getLocalVocabulary, getProgressMap, saveProgressMap } = require('../../utils/storage')

Page({
  data: {
    daysJoined: 1,
    storiesRead: 0,
    storiesCompleted: 0,
    vocabCount: 0,
    loading: true,
  },

  onLoad() {
    this._avatarTapCount = 0
    this._avatarTapTimer = null
    this.loadProfile()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
    this.refreshStats()
  },

  async loadProfile() {
    try {
      const res = await wx.cloud.callFunction({ name: 'userInit' })
      const user = res.result && res.result.user
      if (user && user.createdAt) {
        const createdAt = new Date(user.createdAt)
        const daysJoined = Math.max(1, Math.ceil((Date.now() - createdAt.getTime()) / 86400000))
        this.setData({ daysJoined })
      }
    } catch {}
    this.refreshStats()
    this.setData({ loading: false })
  },

  refreshStats() {
    const progressMap = getProgressMap()
    const list = Object.values(progressMap)
    this.setData({
      storiesRead: list.filter(p => p.percent > 0).length,
      storiesCompleted: list.filter(p => p.percent >= 95).length,
      vocabCount: getLocalVocabulary().length,
    })
  },

  onPrivacyTap() {
    wx.navigateTo({ url: '/pages/privacy/privacy' })
  },

  onAvatarTap() {
    this._avatarTapCount = (this._avatarTapCount || 0) + 1
    if (this._avatarTapTimer) clearTimeout(this._avatarTapTimer)
    if (this._avatarTapCount >= 5) {
      this._avatarTapCount = 0
      wx.navigateTo({ url: '/pages/admin/admin' })
      return
    }
    this._avatarTapTimer = setTimeout(() => { this._avatarTapCount = 0 }, 2000)
  },

  async onSyncProgress() {
    wx.showLoading({ title: '同步中...' })
    try {
      const progressMap = getProgressMap()
      const progressList = Object.values(progressMap)
      if (progressList.length > 0) {
        await wx.cloud.callFunction({
          name: 'syncProgress',
          data: { action: 'push', progressList },
        })
      }
      const res = await wx.cloud.callFunction({ name: 'syncProgress', data: { action: 'pull' } })
      const cloudList = (res.result && res.result.progressList) || []
      if (cloudList.length > 0) {
        const merged = { ...progressMap }
        cloudList.forEach(p => {
          const existing = merged[p.storyId]
          if (!existing || p.updatedAt > existing.updatedAt) {
            merged[p.storyId] = p
          }
        })
        saveProgressMap(merged)
        this.refreshStats()
      }
      wx.hideLoading()
      wx.showToast({ title: '同步完成', icon: 'success' })
    } catch {
      wx.hideLoading()
      wx.showToast({ title: '同步失败', icon: 'error' })
    }
  },
})
