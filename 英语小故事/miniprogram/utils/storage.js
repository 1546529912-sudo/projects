const KEY_PROGRESS = 'reading_progress'
const KEY_VOCAB = 'vocabulary'
const KEY_FAV = 'fav_stories'

function saveProgress(progress) {
  const all = getProgressMap()
  all[progress.storyId] = progress
  wx.setStorageSync(KEY_PROGRESS, all)
}

function getProgress(storyId) {
  return getProgressMap()[storyId] || null
}

function getProgressMap() {
  return wx.getStorageSync(KEY_PROGRESS) || {}
}

function saveProgressMap(map) {
  wx.setStorageSync(KEY_PROGRESS, map)
}

function getLocalVocabulary() {
  return wx.getStorageSync(KEY_VOCAB) || []
}

function saveLocalVocabulary(items) {
  wx.setStorageSync(KEY_VOCAB, items)
}

function addLocalWord(item) {
  const items = getLocalVocabulary()
  const exists = items.find(i => i.word === item.word)
  if (!exists) {
    items.unshift(item)
    saveLocalVocabulary(items)
  }
}

function removeLocalWord(word) {
  const items = getLocalVocabulary().filter(i => i.word !== word)
  saveLocalVocabulary(items)
}

function isWordSaved(word) {
  return getLocalVocabulary().some(i => i.word === word)
}

function getFavStories() {
  return wx.getStorageSync(KEY_FAV) || []
}

function toggleFavStory(storyId) {
  const favs = getFavStories()
  const idx = favs.indexOf(storyId)
  if (idx >= 0) { favs.splice(idx, 1) } else { favs.unshift(storyId) }
  wx.setStorageSync(KEY_FAV, favs)
  return idx < 0 // true = 已收藏
}

function isStorySaved(storyId) {
  return getFavStories().includes(storyId)
}

module.exports = { saveProgress, getProgress, getProgressMap, saveProgressMap, getLocalVocabulary, saveLocalVocabulary, addLocalWord, removeLocalWord, isWordSaved, getFavStories, toggleFavStory, isStorySaved }
