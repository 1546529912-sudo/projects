Component({
  data: {
    selected: 0,
  },

  methods: {
    onTab(e) {
      const index = e.currentTarget.dataset.index
      const pages = ['/pages/index/index', '/pages/vocabulary/vocabulary', '/pages/profile/profile']
      this.setData({ selected: index })
      wx.switchTab({ url: pages[index] })
    },
  },
})
