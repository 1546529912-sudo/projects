const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const tencentcloud = require('tencentcloud-sdk-nodejs-tts')
const TtsClient = tencentcloud.tts.v20190823.Client

// Set in WeChat Cloud env config: TENCENTCLOUD_SECRET_ID, TENCENTCLOUD_SECRET_KEY
const SECRET_ID = process.env.TENCENTCLOUD_SECRET_ID || ''
const SECRET_KEY = process.env.TENCENTCLOUD_SECRET_KEY || ''

const ttsClient = new TtsClient({
  credential: { secretId: SECRET_ID, secretKey: SECRET_KEY },
  region: 'ap-guangzhou',
  profile: { httpProfile: { endpoint: 'tts.tencentcloudapi.com' } },
})

// 按单词边界切分，每段不超过 maxLen 个字符
function splitChunks(text, maxLen = 140) {
  const words = text.split(/\s+/)
  const chunks = []
  let cur = ''
  for (const w of words) {
    const next = cur ? cur + ' ' + w : w
    if (next.length > maxLen) {
      if (cur) chunks.push(cur)
      cur = w
    } else {
      cur = next
    }
  }
  if (cur) chunks.push(cur)
  return chunks.length ? chunks : [text]
}

async function callTTS(text) {
  const chunks = splitChunks(text, 140)
  const buffers = []
  for (let i = 0; i < chunks.length; i++) {
    const result = await ttsClient.TextToVoice({
      Text: chunks[i],
      SessionId: `story_${Date.now()}_${i}`,
      VoiceType: 501009,
      Codec: 'mp3',
      Speed: -1,
      Volume: 0,
      SampleRate: 16000,
    })
    buffers.push(Buffer.from(result.Audio, 'base64'))
  }
  return Buffer.concat(buffers)
}

exports.main = async (event) => {
  const { storyId } = event

  let story
  if (storyId) {
    const res = await db.collection('stories').doc(storyId).get()
    story = res.data
  } else {
    const _ = db.command
    // 包含 ERROR 的故事也重新尝试（本次修复后应能成功）
    const res = await db.collection('stories')
      .where({ audioUrl: _.in(['', null, 'ERROR']) })
      .orderBy('level', 'asc')
      .limit(1)
      .get()
    if (!res.data.length) return { done: true, message: '所有故事已生成音频' }
    story = res.data[0]
  }

  const chunks = splitChunks(story.content || '', 140)
  console.log(`[TTS] ${story.title} level=${story.level} chunks=${chunks.length}`)

  try {
    const audioBuffer = await callTTS(story.content)
    const uploadRes = await cloud.uploadFile({
      cloudPath: `audio/stories/${story._id}.mp3`,
      fileContent: audioBuffer,
    })
    await db.collection('stories').doc(story._id).update({
      data: { audioUrl: uploadRes.fileID },
    })
    return { done: false, result: `✅ ${story.title}` }
  } catch (e) {
    console.error(`[TTS] 失败: ${story.title}`, e.message)
    await db.collection('stories').doc(story._id).update({ data: { audioUrl: 'ERROR' } }).catch(() => {})
    return { done: false, skipped: true, result: `❌ ${story.title}: ${e.message}` }
  }
}
