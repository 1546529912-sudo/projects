function tokenize(content) {
  const tokens = []
  const lines = content.split('\n')

  lines.forEach((line, lineIdx) => {
    const parts = line.split(/(\s+|[.,!?;:'"()\-])/)
    parts.forEach(part => {
      if (!part) return
      if (/^\s+$/.test(part)) return
      if (/^[a-zA-Z']+$/.test(part)) {
        tokens.push({
          type: 'word',
          text: part,
          cleanWord: part.replace(/[^a-zA-Z]/g, '').toLowerCase(),
        })
      } else {
        tokens.push({ type: 'punct', text: part })
      }
    })
    if (lineIdx < lines.length - 1) {
      tokens.push({ type: 'newline', text: '\n' })
    }
  })

  return tokens
}

function getOxfordAudioUrl(word) {
  const lower = word.toLowerCase()
  const first = lower[0]
  const padded = lower.padEnd(5, '_').slice(0, 5)
  return `https://www.oxfordlearnersdictionaries.com/media/english/us_pron/${first}/${lower.slice(0, 3)}/${padded}/${lower}__us_1.mp3`
}

function fetchWordInfo(word) {
  return new Promise(resolve => {
    wx.request({
      url: `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`,
      success(res) {
        if (res.statusCode !== 200 || !Array.isArray(res.data) || !res.data[0]) {
          resolve(null)
          return
        }
        const entry = res.data[0]
        const meaning = entry.meanings && entry.meanings[0]
        const def = meaning && meaning.definitions && meaning.definitions[0]
        const phonetics = entry.phonetics || []
        const phoneticEntry = phonetics.find(p => p.text) || {}
        const audioEntry = phonetics.find(p => p.audio && p.audio.includes('-us'))
                        || phonetics.find(p => p.audio && p.audio.length > 0)
                        || {}
        const audioUrl = audioEntry.audio || getOxfordAudioUrl(word)

        resolve({
          word: entry.word || word,
          phonetic: phoneticEntry.text || '',
          audioUrl,
          definition: (def && def.definition) || '',
          displayDefinition: '',
          partOfSpeech: (meaning && meaning.partOfSpeech) || '',
        })
      },
      fail() {
        resolve(null)
      },
    })
  })
}

// 按行分句，每句附带估算的开始时间（用于高亮跟读）
const WORDS_PER_SEC = 2.5
const SENTENCE_GAP = 0.4

function tokenizeBySentence(content) {
  const lines = content.split('\n').filter(l => l.trim())
  let elapsed = 0
  return lines.map(line => {
    const tokens = []
    const parts = line.split(/(\s+|[.,!?;:'"()\-])/)
    let wordCount = 0
    parts.forEach(part => {
      if (!part || /^\s+$/.test(part)) return
      if (/^[a-zA-Z']+$/.test(part)) {
        tokens.push({ type: 'word', text: part, cleanWord: part.replace(/[^a-zA-Z]/g, '').toLowerCase() })
        wordCount++
      } else {
        tokens.push({ type: 'punct', text: part })
      }
    })
    const startTime = elapsed
    elapsed += wordCount / WORDS_PER_SEC + SENTENCE_GAP
    return { tokens, startTime }
  })
}

module.exports = { tokenize, tokenizeBySentence, getOxfordAudioUrl, fetchWordInfo }
