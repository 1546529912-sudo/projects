const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// "The Red Apple" → "the-red-apple", "Grandma's Garden" → "grandmas-garden"
function toSlug(title) {
  return title.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

exports.main = async () => {
  // 先上传一个临时文件，拿到当前环境的 fileID 前缀
  const probe = await cloud.uploadFile({
    cloudPath: '_probe.txt',
    fileContent: Buffer.from('ok'),
  })
  const envPrefix = probe.fileID.replace('_probe.txt', '')
  // envPrefix = "cloud://envId.xxxxxx/"

  // 拉取所有故事
  let allStories = []
  let skip = 0
  while (true) {
    const res = await db.collection('stories').skip(skip).limit(20).get()
    allStories = allStories.concat(res.data)
    if (res.data.length < 20) break
    skip += 20
  }

  // 为每篇故事构造预期的封面 fileID
  const candidates = allStories.map(s => ({
    story: s,
    fileID: `${envPrefix}covers/${toSlug(s.title)}.jpg`,
  }))

  // 批量检查文件是否存在（每次最多 50 个）
  let matched = 0
  let skipped = 0
  for (let i = 0; i < candidates.length; i += 50) {
    const batch = candidates.slice(i, i + 50)
    const result = await cloud.getTempFileURL({
      fileList: batch.map(c => c.fileID),
    })

    for (let j = 0; j < result.fileList.length; j++) {
      const item = result.fileList[j]
      if (item.status === 0) {
        // 文件存在，更新故事的 imageUrl
        await db.collection('stories')
          .doc(batch[j].story._id)
          .update({ data: { imageUrl: batch[j].fileID } })
        matched++
      } else {
        skipped++
      }
    }
  }

  // 清理临时文件
  await cloud.deleteFile({ fileList: [probe.fileID] }).catch(() => {})

  return {
    total: allStories.length,
    matched,
    skipped,
    message: `✅ 匹配 ${matched} 篇，未找到图片 ${skipped} 篇`,
  }
}
