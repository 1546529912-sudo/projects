const { getLevelById } = require('../../data/levels')

Page({
  data: {
    level: 1,
    levelName: '',
    levelDesc: '',
    levelColor: '#A8D5A2',
    stories: [],
    loading: true,
  },

  onLoad(options) {
    const level = parseInt(options.level || '1', 10)
    const levelInfo = getLevelById(level)
    this.setData({
      level,
      levelName: (levelInfo && levelInfo.name) || '',
      levelDesc: (levelInfo && levelInfo.description) || '',
      levelColor: (levelInfo && levelInfo.color) || '#A8D5A2',
    })
    wx.setNavigationBarTitle({ title: 'L' + level + ' ' + ((levelInfo && levelInfo.name) || '') })
    this.loadStories(level)
  },

  async loadStories(level) {
    try {
      const res = await wx.cloud.callFunction({ name: 'getStories', data: { action: 'listByLevel', level } })
      this.setData({ stories: (res.result && res.result.stories) || [], loading: false })
    } catch (err) {
      this.setData({ loading: false })
    }
  },

  onStoryTap(e) {
    const story = e.detail && e.detail.story
    if (!story || !story._id) return
    wx.navigateTo({
      url: '/pages/reading/reading?id=' + story._id,
      fail(err) { console.error('navigate failed', err) },
    })
  },
})
