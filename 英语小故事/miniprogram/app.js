const { getLocalVocabulary, saveLocalVocabulary, getProgressMap, saveProgressMap } = require('./utils/storage')

App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-d8gqau60pb124456a',
        traceUser: false,
      })
      wx.cloud.callFunction({
        name: 'trackEvent',
        data: { type: 'app_open', ts: Date.now() },
      }).catch(() => {})
      this.initUser()
      this.syncVocabulary()
      this.syncProgress()
    }
  },

  async initUser() {
    try {
      await wx.cloud.callFunction({ name: 'userInit' })
    } catch {}
  },

  async syncProgress() {
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
      }
    } catch {}
  },

  async syncVocabulary() {
    try {
      const res = await wx.cloud.callFunction({ name: 'addVocabulary', data: { action: 'list' } })
      const cloudWords = (res.result && res.result.words) || []

      // 本地有但云端没有的，上传到云端
      const localWords = getLocalVocabulary()
      const cloudSet = new Set(cloudWords.map(w => w.word))
      const localOnly = localWords.filter(w => !cloudSet.has(w.word))
      for (const item of localOnly) {
        wx.cloud.callFunction({ name: 'addVocabulary', data: { action: 'add', item } }).catch(() => {})
      }

      // 以云端为准合并到本地
      const merged = [...cloudWords, ...localOnly]
      if (merged.length > 0) saveLocalVocabulary(merged)
    } catch {}
  },

  globalData: {
    userInfo: null,
  },
})
