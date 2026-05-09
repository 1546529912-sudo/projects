// 云函数：初始化数据库（仅首次运行）
// 调用方式：在微信开发者工具 → 云函数 → 右键本地调试
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const SEED_STORIES = [
  { title: 'The Red Apple',  level: 1, content: 'I see a red apple.\nThe apple is big.\nI eat the apple.\nIt is good!', wordCount: 15, status: 'published', readCount: 0, coverImage: '', audioUrl: '', createdAt: Date.now() },
  { title: 'My Cat',         level: 1, content: 'I have a cat.\nMy cat is fat.\nMy cat can sit.\nI love my cat.', wordCount: 16, status: 'published', readCount: 0, coverImage: '', audioUrl: '', createdAt: Date.now() },
  { title: 'The Sun',        level: 1, content: 'The sun is up.\nThe sun is hot.\nI can see the sun.\nThe sun is big.', wordCount: 17, status: 'published', readCount: 0, coverImage: '', audioUrl: '', createdAt: Date.now() },
  { title: 'The Little Dog', level: 2, content: 'Tom has a little dog.\nThe dog likes to run.\nThe dog likes to jump.\nTom and the dog play all day.', wordCount: 22, status: 'published', readCount: 0, coverImage: '', audioUrl: '', createdAt: Date.now() },
  { title: 'A Rainy Day',    level: 2, content: 'Today it is raining.\nI wear my boots.\nI jump in the puddles.\nRain is so much fun!', wordCount: 20, status: 'published', readCount: 0, coverImage: '', audioUrl: '', createdAt: Date.now() },
  { title: 'My Family',      level: 2, content: 'I have a big family.\nMom, Dad, and my sister.\nWe eat dinner together.\nI love my family very much.', wordCount: 22, status: 'published', readCount: 0, coverImage: '', audioUrl: '', createdAt: Date.now() },
  { title: 'The Lost Bird',  level: 3, content: 'A little bird sat on a tree.\nSuddenly, the wind blew hard.\nThe bird fell from the branch.\n"Help!" said the bird.\nA kind girl heard the bird.\nShe picked it up and put it back.\nThe bird sang a happy song.', wordCount: 42, status: 'published', readCount: 0, coverImage: '', audioUrl: '', createdAt: Date.now() },
  { title: 'Baking Cookies', level: 3, content: 'Mom and I made cookies today.\nWe mixed flour, eggs, and butter.\nWe put them in the oven.\nThe house smelled so sweet!\nWe shared the cookies with our neighbors.\nEveryone smiled and said thank you.', wordCount: 38, status: 'published', readCount: 0, coverImage: '', audioUrl: '', createdAt: Date.now() },
  { title: 'The Brave Mouse', level: 3, content: 'Max was a small mouse.\nHe was afraid of the dark.\nOne night, the lights went out.\nMax took a deep breath.\n"I can do this," he said.\nHe walked through the dark room.\nWhen the lights came back, Max felt proud.', wordCount: 46, status: 'published', readCount: 0, coverImage: '', audioUrl: '', createdAt: Date.now() },
]

const SEED_WORDS = [
  { word: 'apple',  phonetic: '/ˈæp.əl/', partOfSpeech: 'noun',      displayDefinition: '苹果', audioUrl: '' },
  { word: 'cat',    phonetic: '/kæt/',     partOfSpeech: 'noun',      displayDefinition: '猫', audioUrl: '' },
  { word: 'sun',    phonetic: '/sʌn/',     partOfSpeech: 'noun',      displayDefinition: '太阳', audioUrl: '' },
  { word: 'run',    phonetic: '/rʌn/',     partOfSpeech: 'verb',      displayDefinition: '跑', audioUrl: '' },
  { word: 'jump',   phonetic: '/dʒʌmp/',   partOfSpeech: 'verb',      displayDefinition: '跳', audioUrl: '' },
  { word: 'rain',   phonetic: '/reɪn/',    partOfSpeech: 'noun/verb', displayDefinition: '雨；下雨', audioUrl: '' },
  { word: 'family', phonetic: '/ˈfæm.ɪ.li/', partOfSpeech: 'noun',   displayDefinition: '家庭', audioUrl: '' },
  { word: 'bird',   phonetic: '/bɜːrd/',   partOfSpeech: 'noun',      displayDefinition: '鸟', audioUrl: '' },
  { word: 'brave',  phonetic: '/breɪv/',   partOfSpeech: 'adjective', displayDefinition: '勇敢的', audioUrl: '' },
  { word: 'afraid', phonetic: '/əˈfreɪd/', partOfSpeech: 'adjective', displayDefinition: '害怕的', audioUrl: '' },
  { word: 'proud',  phonetic: '/praʊd/',   partOfSpeech: 'adjective', displayDefinition: '自豪的', audioUrl: '' },
]

exports.main = async () => {
  const results = []

  // 初始化故事
  for (const story of SEED_STORIES) {
    try {
      await db.collection('stories').add({ data: story })
      results.push(`✅ 故事: ${story.title}`)
    } catch (e) {
      results.push(`❌ 故事: ${story.title} — ${e.message}`)
    }
  }

  // 初始化词库
  for (const word of SEED_WORDS) {
    try {
      await db.collection('words').add({ data: word })
      results.push(`✅ 单词: ${word.word}`)
    } catch (e) {
      results.push(`❌ 单词: ${word.word} — ${e.message}`)
    }
  }

  return { results }
}
