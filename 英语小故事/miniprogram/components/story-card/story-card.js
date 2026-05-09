const { getLevelById } = require('../../data/levels')

const EMOJIS = ['🦁','🐶','🐱','🐰','🦊','🐸','🦋','🌸','⭐','🌈','🎨','🌻','🐠','🦅','🌺','🏠','🎪','🐘','🦒','🌙']

function titleToEmoji(title) {
  if (!title) return '📖'
  let hash = 0
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) & 0xffff
  return EMOJIS[hash % EMOJIS.length]
}

Component({
  properties: {
    story: { type: Object, value: {} },
    progress: { type: Number, value: 0 },
    readCount: { type: Number, value: 0 },
  },

  data: {
    levelName: '',
    coverBg: '#F5ECD7',
    coverEmoji: '📖',
    coverFontSize: 36,
    titleFontSize: 28,
    resolvedImageUrl: '',
  },

  observers: {
    story(story) {
      const level = getLevelById(story && story.level)
      const title = (story && story.title) || ''
      const len = title.length
      const coverFontSize = len <= 12 ? 40 : len <= 20 ? 34 : 28
      const titleFontSize = len <= 15 ? 28 : len <= 22 ? 24 : 22
      this.setData({
        levelName: (level && level.name) || '',
        coverBg: (level && level.color) || '#F5ECD7',
        coverEmoji: titleToEmoji(title),
        coverFontSize,
        titleFontSize,
        resolvedImageUrl: '',
      })
      const imageUrl = story && story.imageUrl
      console.log('[story-card] imageUrl=', imageUrl)
      if (imageUrl && imageUrl.startsWith('cloud://')) {
        wx.cloud.getTempFileURL({
          fileList: [imageUrl],
          success: res => {
            console.log('[story-card] getTempFileURL res=', JSON.stringify(res))
            const url = res.fileList && res.fileList[0] && res.fileList[0].tempFileURL
            if (url) this.setData({ resolvedImageUrl: url })
          },
          fail: err => {
            console.error('[story-card] getTempFileURL fail=', err)
          },
        })
      } else if (imageUrl) {
        this.setData({ resolvedImageUrl: imageUrl })
      }
    },
  },

  methods: {
    onTap() {
      this.triggerEvent('tap', { story: this.properties.story })
    },
  },
})
