Page({
  data: {
    loading: true,
    unauthorized: false,
    tab: 'overview',
    // overview
    userCount: 0,
    newUsersToday: 0,
    readerCount: 0,
    completionCount: 0,
    eventCounts: {},
    recentEvents: [],
    // stories
    storyList: [],
    storiesLoaded: false,
  },

  onLoad() {
    this.loadOverview()
  },

  async loadOverview() {
    this.setData({ loading: true })
    try {
      const res = await wx.cloud.callFunction({
        name: 'adminStats',
        data: { action: 'overview' },
      })
      const r = res.result
      if (r.error === 'unauthorized') {
        this.setData({ unauthorized: true, loading: false })
        return
      }
      this.setData({
        userCount: r.userCount,
        newUsersToday: r.newUsersToday,
        readerCount: r.readerCount,
        completionCount: r.completionCount,
        eventCounts: r.eventCounts || {},
        recentEvents: (r.recentEvents || []).map(e => ({
          ...e,
          timeStr: e.createdAt ? new Date(e.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '',
        })),
        loading: false,
      })
    } catch (e) {
      console.error('[admin] loadOverview fail=', e)
      this.setData({ loading: false })
    }
  },

  async loadStories() {
    if (this.data.storiesLoaded) return
    wx.showLoading({ title: '加载中' })
    try {
      const res = await wx.cloud.callFunction({
        name: 'adminStats',
        data: { action: 'stories' },
      })
      this.setData({ storyList: res.result.storyList || [], storiesLoaded: true })
    } catch {}
    wx.hideLoading()
  },

  onTabTap(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ tab })
    if (tab === 'stories') this.loadStories()
  },

  onRefresh() {
    this.setData({ storiesLoaded: false })
    this.loadOverview()
  },
})
