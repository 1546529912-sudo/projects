const { tokenizeBySentence, getOxfordAudioUrl } = require('../../utils/word')
const { getLevelById } = require('../../data/levels')
const { saveProgress, getProgress, toggleFavStory, isStorySaved } = require('../../utils/storage')
const { track } = require('../../utils/track')

const wordCache = {}

Page({
  data: {
    story: {},
    sentences: [],
    activeSentence: -1,
    levelName: '',
    coverUrl: '',
    statusBarHeight: 44,
    loading: true,
    popupVisible: false,
    currentWordInfo: {},
    activeWord: '',
    favoured: false,
    scrollTop: 0,
  },

  _storyOpenTime: 0,
  _fetchingWord: false,
  _scrollTop: 0,
  _scrollHeight: 0,

  onLoad(options) {
    const id = options.id
    if (!id) { wx.navigateBack(); return }
    const info = wx.getSystemInfoSync()
    this.setData({ statusBarHeight: info.statusBarHeight || 44 })
    this._storyOpenTime = Date.now()
    this.loadStory(id)
  },

  onUnload() {
    const percent = this._saveProgress()
    const { story } = this.data
    if (!story || !story._id || !this._storyOpenTime) return
    const duration = Math.round((Date.now() - this._storyOpenTime) / 1000)
    track({ type: 'story_exit', storyId: story._id, level: story.level, exitPercent: percent, duration })
    if (percent >= 95) {
      track({ type: 'story_complete', storyId: story._id, level: story.level, duration })
    }
  },

  async loadStory(id) {
    try {
      const res = await wx.cloud.callFunction({ name: 'getStories', data: { action: 'getById', id } })
      let story = res.result && res.result.story
      if (!story) throw new Error('story not found')
      const sentences = tokenizeBySentence(story.content)
      const level = getLevelById(story.level)
      const saved = getProgress(story._id)
      const scrollTop = (saved && saved.scrollTop) || 0
      this._scrollTop = scrollTop
      this.setData({ story, sentences, activeSentence: -1, levelName: (level && level.name) || '', loading: false, scrollTop, favoured: isStorySaved(story._id) })
      if (story.imageUrl && story.imageUrl.startsWith('cloud://')) {
        wx.cloud.getTempFileURL({
          fileList: [story.imageUrl],
          success: res => {
            const url = res.fileList && res.fileList[0] && res.fileList[0].tempFileURL
            if (url) this.setData({ coverUrl: url })
          },
        })
      } else if (story.imageUrl) {
        this.setData({ coverUrl: story.imageUrl })
      }
      track({ type: 'story_open', storyId: story._id, level: story.level })
    } catch (err) {
      this.setData({ loading: false })
      wx.showToast({ title: '故事加载失败', icon: 'none' })
    }
  },

  async onWordTap(e) {
    if (this._fetchingWord) return
    const word = e.currentTarget.dataset.word
    if (!word || word.length < 2) return
    this.setData({ activeWord: word })
    if (wordCache[word]) {
      this.setData({ currentWordInfo: wordCache[word], popupVisible: true })
      return
    }
    this._fetchingWord = true
    this.setData({ currentWordInfo: { word, phonetic: '', audioUrl: getOxfordAudioUrl(word), definition: '加载中...', displayDefinition: '', partOfSpeech: '' }, popupVisible: true })
    try {
      const cloudRes = await wx.cloud.callFunction({ name: 'getWordInfo', data: { word } }).catch(() => null)
      const cloudData = cloudRes && cloudRes.result && cloudRes.result.word
      const info = cloudData
        ? { word: cloudData.word || word, phonetic: cloudData.phonetic || '', audioUrl: cloudData.audioUrl || getOxfordAudioUrl(word), definition: cloudData.definition || '', displayDefinition: cloudData.displayDefinition || '', partOfSpeech: cloudData.partOfSpeech || '' }
        : { word, phonetic: '', audioUrl: getOxfordAudioUrl(word), definition: '', displayDefinition: '', partOfSpeech: '' }
      wordCache[word] = info
      if (this.data.popupVisible && this.data.activeWord === word) this.setData({ currentWordInfo: info })
    } finally {
      this._fetchingWord = false
    }
  },

  onScroll(e) {
    this._scrollTop = e.detail.scrollTop
    this._scrollHeight = e.detail.scrollHeight
  },

  _saveProgress() {
    const { story } = this.data
    if (!story || !story._id) return 0
    const viewHeight = wx.getSystemInfoSync().windowHeight
    const maxScroll = Math.max((this._scrollHeight || 0) - viewHeight, 1)
    const scrollPercent = Math.min(Math.round(this._scrollTop / maxScroll * 100), 100)
    const existing = getProgress(story._id)
    const percent = existing ? Math.max(scrollPercent, existing.percent || 0) : scrollPercent
    saveProgress({ storyId: story._id, scrollTop: this._scrollTop, percent, updatedAt: Date.now() })
    return percent
  },

  onAudioTimeUpdate(e) {
    const t = e.detail.currentTime
    const sentences = this.data.sentences
    let idx = 0
    for (let i = sentences.length - 1; i >= 0; i--) {
      if (t >= sentences[i].startTime) { idx = i; break }
    }
    if (idx !== this.data.activeSentence) this.setData({ activeSentence: idx })
  },

  onAudioEnded() {
    this.setData({ activeSentence: -1 })
    const { story } = this.data
    if (story && story._id) {
      saveProgress({ storyId: story._id, scrollTop: this._scrollTop, percent: 100, updatedAt: Date.now() })
    }
  },

  onPopupClose() { this.setData({ popupVisible: false, activeWord: '' }) },
  onBack() { wx.navigateBack() },
  onFavTap() {
    const { story } = this.data
    if (!story || !story._id) return
    const favoured = toggleFavStory(story._id)
    this.setData({ favoured })
    wx.vibrateShort({ type: 'light' })
    wx.showToast({ title: favoured ? '已收藏' : '已取消收藏', icon: 'none' })
  },
  onVocabTap() { wx.switchTab({ url: '/pages/vocabulary/vocabulary' }) },
})
