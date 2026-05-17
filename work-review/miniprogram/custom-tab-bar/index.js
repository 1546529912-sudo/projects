Component({
  data: {
    selected: 0,
    tabs: [
      { key: 'record', path: '/pages/index/index',       label: '录音'  },
      { key: 'history', path: '/pages/history/history',  label: '历史'  },
      { key: 'mine',   path: '/pages/settings/settings', label: '我的'  },
    ],
  },

  methods: {
    // 由各 tabBar 页面在 onShow 里主动调用：
    //   this.getTabBar().setSelected(0/1/2)
    setSelected(index) {
      this.setData({ selected: index });
    },

    onTapMic() {
      wx.switchTab({ url: '/pages/index/index' });
      this.setData({ selected: 0 });
    },

    onTapHistory() {
      wx.switchTab({ url: '/pages/history/history' });
      this.setData({ selected: 1 });
    },

    onTapMine() {
      wx.switchTab({ url: '/pages/settings/settings' });
      this.setData({ selected: 2 });
    },
  },
});
