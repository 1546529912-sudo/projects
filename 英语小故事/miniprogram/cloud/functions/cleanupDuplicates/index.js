const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

async function getAllStories() {
  const stories = []
  let skip = 0
  while (true) {
    const res = await db.collection('stories').skip(skip).limit(20).get()
    stories.push(...res.data)
    if (res.data.length < 20) break
    skip += 20
  }
  return stories
}

exports.main = async () => {
  const stories = await getAllStories()

  const groups = {}
  for (const s of stories) {
    const key = s.title
    if (!groups[key]) groups[key] = []
    groups[key].push(s)
  }

  const toDelete = []
  for (const title of Object.keys(groups)) {
    const group = groups[title]
    if (group.length <= 1) continue
    group.sort((a, b) => (b.audioUrl ? 1 : 0) - (a.audioUrl ? 1 : 0))
    for (let i = 1; i < group.length; i++) {
      toDelete.push(group[i]._id)
    }
  }

  for (const id of toDelete) {
    await db.collection('stories').doc(id).remove()
  }

  return { total: stories.length, deleted: toDelete.length, kept: stories.length - toDelete.length }
}
