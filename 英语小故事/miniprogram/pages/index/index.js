const { LEVELS, getLevelById } = require('../../data/levels')
const { getProgress, getProgressMap } = require('../../utils/storage')
const { track } = require('../../utils/track')

Page({
  data: {
    levels: LEVELS,
    selectedLevel: 1,
    currentLevelName: 'Seed',
    stories: [],
    recentStories: [],
    loading: false,
    statusBarHeight: 44,
  },

  onLoad() {
    const info = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: info.statusBarHeight || 44 })
    this.loadStories(1)
    this.loadRecentStories()
  },

  onShow() {
    this.loadRecentStories()
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }
  },

  onLevelSelect(e) {
    const id = e.currentTarget.dataset.id
    const level = getLevelById(id)
    this.setData({ selectedLevel: id, currentLevelName: (level && level.name) || '' })
    this.loadStories(id)
    track({ type: 'level_select', level: id, levelName: (level && level.name) || '' })
  },

  async resolveCoverUrls(stories) {
    const cloudIds = stories
      .filter(s => s.imageUrl && s.imageUrl.startsWith('cloud://'))
      .map(s => s.imageUrl)
    if (!cloudIds.length) return stories
    try {
      const tmpRes = await wx.cloud.getTempFileURL({ fileList: cloudIds })
      const urlMap = {}
      tmpRes.fileList.forEach(f => { urlMap[f.fileID] = f.tempFileURL })
      return stories.map(s =>
        s.imageUrl ? { ...s, imageUrl: urlMap[s.imageUrl] || s.imageUrl } : s
      )
    } catch (e) {
      return stories
    }
  },

  async loadStories(level) {
    this.setData({ loading: true, stories: [] })
    try {
      const res = await wx.cloud.callFunction({
        name: 'getStories',
        data: { action: 'listByLevel', level },
      })
      let stories = (res.result && res.result.stories) || []
      stories = await this.resolveCoverUrls(stories)
      this.setData({ stories })
    } catch (err) {
      console.error('[index] getStories 失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  async loadRecentStories() {
    try {
      const progressMap = getProgressMap()
      const recentIds = Object.values(progressMap)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
        .slice(0, 2)
        .map(p => p.storyId)
      if (!recentIds.length) return

      const res = await wx.cloud.callFunction({
        name: 'getStories',
        data: { action: 'getByIds', ids: recentIds },
      })
      let stories = (res.result && res.result.stories) || []
      stories = await this.resolveCoverUrls(stories)
      const ordered = recentIds.map(id => stories.find(s => s._id === id)).filter(Boolean)
      const withProgress = ordered.map(s => ({
        ...s,
        _progress: (getProgress(s._id) && getProgress(s._id).percent) || 0,
      }))
      this.setData({ recentStories: withProgress })
    } catch (err) {
      // 最近阅读加载失败不影响主流程
    }
  },

  onStoryTap(e) {
    const story = (e.detail && e.detail.story) || e.currentTarget.dataset.story
    wx.navigateTo({ url: '/pages/reading/reading?id=' + story._id })
  },

  async onAdminLongPress() {
    const { tapIndex } = await new Promise(resolve =>
      wx.showActionSheet({
        itemList: ['批量生成故事音频', '匹配故事封面图片'],
        success: resolve,
        fail: () => resolve({ tapIndex: -1 }),
      })
    )
    if (tapIndex === 1) {
      wx.showLoading({ title: '匹配中...' })
      const res = await wx.cloud.callFunction({ name: 'matchStoryCovers', data: {} })
      wx.hideLoading()
      wx.showModal({ title: '完成', content: res.result.message, showCancel: false })
      this.loadStories(this.data.selectedLevel)
      this.loadRecentStories()
      return
    }
    if (tapIndex !== 0) return

    let count = 0
    let skipped = 0
    wx.showLoading({ title: '生成中 0 篇...' })
    while (count + skipped < 120) {
      try {
        const res = await wx.cloud.callFunction({
          name: 'generateStoryAudio',
          data: {},
          config: { timeout: 70000 },
        })
        if (res.result && res.result.done) break
        if (res.result && res.result.skipped) {
          skipped++
        } else {
          count++
        }
        wx.showLoading({ title: `生成中 ${count} 篇...` })
      } catch (err) {
        console.error('[audio gen] 调用失败', err)
        skipped++
      }
    }
    wx.hideLoading()
    wx.showModal({ title: '完成', content: `生成 ${count} 篇，跳过 ${skipped} 篇`, showCancel: false })
  },
})
