const { getLocalVocabulary, saveLocalVocabulary, removeLocalWord } = require('../../utils/storage')
const { track } = require('../../utils/track')

Page({
  data: {
    words: [],
    popupVisible: false,
    currentWordInfo: {},
  },

  onShow() {
    const words = getLocalVocabulary()
    this.setData({ words })
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }
    track({ type: 'vocab_open', wordCount: words.length })
    this.refreshMissingDefinitions(words)
  },

  async refreshMissingDefinitions(words) {
    const missing = words.filter(w => !w.displayDefinition)
    if (!missing.length) return
    for (const item of missing) {
      try {
        const res = await wx.cloud.callFunction({ name: 'getWordInfo', data: { word: item.word } })
        const updated = res.result && res.result.word
        if (updated && updated.displayDefinition) {
          const all = getLocalVocabulary()
          const idx = all.findIndex(w => w.word === item.word)
          if (idx >= 0) {
            all[idx] = { ...all[idx], ...updated }
            saveLocalVocabulary(all)
          }
        }
      } catch {}
    }
    this.setData({ words: getLocalVocabulary() })
  },

  onWordTap(e) {
    const index = e.currentTarget.dataset.index
    const item = this.data.words[index]
    const wordInfo = {
      word: item.word,
      phonetic: item.phonetic,
      audioUrl: item.audioUrl,
      definition: item.displayDefinition,
      displayDefinition: item.displayDefinition,
      partOfSpeech: item.partOfSpeech,
    }
    this.setData({ currentWordInfo: wordInfo, popupVisible: true })
  },

  onPlayTap(e) {
    const url = e.currentTarget.dataset.url
    if (!url) return
    const audio = wx.createInnerAudioContext()
    audio.src = url
    audio.play()
    audio.onEnded(() => audio.destroy())
    audio.onError(() => audio.destroy())
  },

  onDeleteTap(e) {
    const word = e.currentTarget.dataset.word
    wx.showModal({
      title: '删除单词',
      content: '从生词本移除 "' + word + '"？',
      confirmText: '删除',
      confirmColor: '#FF4444',
      success: (res) => {
        if (res.confirm) {
          removeLocalWord(word)
          wx.cloud.callFunction({ name: 'addVocabulary', data: { action: 'remove', word } }).catch(() => {})
          track({ type: 'word_remove', word })
          this.setData({ words: getLocalVocabulary() })
        }
      },
    })
  },

  onPopupClose() {
    this.setData({ popupVisible: false })
  },
})
