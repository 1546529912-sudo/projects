const { isWordSaved, addLocalWord, removeLocalWord } = require('../../utils/storage')
const { track } = require('../../utils/track')

Component({
  properties: {
    visible: { type: Boolean, value: false },
    wordInfo: { type: Object, value: {} },
    storyId: { type: String, value: '' },
    storyTitle: { type: String, value: '' },
  },

  data: {
    saved: false,
    playing: false,
  },

  observers: {
    'visible, wordInfo'(visible, wordInfo) {
      if (visible && wordInfo && wordInfo.word) {
        this.setData({ saved: isWordSaved(wordInfo.word) })
        if (!this._autoPlayed) {
          this._autoPlayed = true
          this.playAudio()
        }
      }
      if (!visible) {
        this._autoPlayed = false
        this.stopAudio()
      }
    },
  },

  lifetimes: {
    detached() {
      this.stopAudio()
    },
  },

  methods: {
    onMaskTap() {
      this.triggerEvent('close')
    },

    stopProp() {},

    playAudio() {
      const url = this.properties.wordInfo && this.properties.wordInfo.audioUrl
      if (!url) return

      this.setData({ playing: true })
      const audio = wx.createInnerAudioContext()
      this._audio = audio
      audio.src = url
      audio.play()

      audio.onEnded(() => {
        this.setData({ playing: false })
        audio.destroy()
      })
      audio.onError(() => {
        this.setData({ playing: false })
        audio.destroy()
      })

      track({ type: 'word_click', word: this.properties.wordInfo.word, storyId: this.properties.storyId })
    },

    stopAudio() {
      if (this._audio) {
        this._audio.stop()
        this._audio.destroy()
        this._audio = null
      }
    },

    onPlayTap() {
      this.stopAudio()
      this.playAudio()
    },

    onSaveTap() {
      const { wordInfo, storyId, storyTitle } = this.properties
      const { saved } = this.data

      if (saved) {
        removeLocalWord(wordInfo.word)
        this.setData({ saved: false })
        wx.cloud.callFunction({ name: 'addVocabulary', data: { action: 'remove', word: wordInfo.word } }).catch(() => {})
      } else {
        const item = {
          word: wordInfo.word,
          phonetic: wordInfo.phonetic,
          audioUrl: wordInfo.audioUrl,
          displayDefinition: wordInfo.displayDefinition || wordInfo.definition,
          partOfSpeech: wordInfo.partOfSpeech,
          addedAt: Date.now(),
          storyId,
          storyTitle,
        }
        addLocalWord(item)
        this.setData({ saved: true })
        wx.cloud.callFunction({ name: 'addVocabulary', data: { action: 'add', item } }).catch(() => {})
        track({ type: 'word_save', word: wordInfo.word, storyId })
      }

      wx.vibrateShort({ type: 'light' })
    },
  },
})
