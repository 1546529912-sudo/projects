const { track } = require('../../utils/track')

function fmt(secs) {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return m + ':' + s.toString().padStart(2, '0')
}

Component({
  properties: {
    audioUrl: { type: String, value: '' },
    storyId: { type: String, value: '' },
  },

  data: {
    playing: false,
    progressPct: 0,
    currentTimeStr: '0:00',
    durationStr: '0:00',
  },

  lifetimes: {
    attached() { this.initAudio() },
    detached() { this.destroyAudio() },
  },

  observers: {
    audioUrl(url) {
      if (url) {
        this.destroyAudio()
        this.initAudio()
      }
    },
  },

  methods: {
    initAudio() {
      const { audioUrl } = this.properties
      if (!audioUrl) return

      const audio = wx.createInnerAudioContext()
      this._audio = audio
      audio.src = audioUrl

      audio.onTimeUpdate(() => {
        const pct = audio.duration > 0 ? (audio.currentTime / audio.duration) * 100 : 0
        this.setData({
          progressPct: Math.min(pct, 100),
          currentTimeStr: fmt(audio.currentTime),
          durationStr: fmt(audio.duration || 0),
        })
        this.triggerEvent('timeupdate', { currentTime: audio.currentTime })
      })

      audio.onEnded(() => {
        this.setData({ playing: false, progressPct: 0, currentTimeStr: '0:00' })
        this.triggerEvent('ended')
        track({ type: 'audio_stop', storyId: this.properties.storyId, progress: 100 })
      })

      audio.onError(() => {
        this.setData({ playing: false })
        wx.showToast({ title: '音频加载失败', icon: 'none' })
      })
    },

    destroyAudio() {
      if (this._audio) {
        if (this.data.playing) {
          track({ type: 'audio_stop', storyId: this.properties.storyId, progress: this.data.progressPct })
        }
        this._audio.stop()
        this._audio.destroy()
        this._audio = null
        this.setData({ playing: false, progressPct: 0, currentTimeStr: '0:00' })
      }
    },

    onToggle() {
      if (!this._audio) return
      if (this.data.playing) {
        this._audio.pause()
        this.setData({ playing: false })
      } else {
        this._audio.play()
        this.setData({ playing: true })
        track({ type: 'audio_play', storyId: this.properties.storyId })
      }
    },
  },
})
