const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const { action, id, level, limit = 20 } = event
  const { OPENID } = cloud.getWXContext()

  switch (action) {
    case 'getById': {
      const res = await db.collection('stories').doc(id).get()
      return { story: res.data }
    }

    case 'listByLevel': {
      const res = await db.collection('stories')
        .where({ level, status: 'published' })
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .get()
      return { stories: res.data }
    }

    case 'getByIds': {
      const { ids = [] } = event
      if (!ids.length) return { stories: [] }
      const res = await db.collection('stories')
        .where({ _id: _.in(ids) })
        .get()
      return { stories: res.data }
    }

    case 'getRecent': {
      // 查询用户最近阅读记录
      const progressRes = await db.collection('reading_progress')
        .where({ openid: OPENID })
        .orderBy('updatedAt', 'desc')
        .limit(limit)
        .get()

      if (progressRes.data.length === 0) return { stories: [] }

      const storyIds = progressRes.data.map(p => p.storyId)
      const storiesRes = await db.collection('stories')
        .where({ _id: _.in(storyIds) })
        .get()

      // 按最近阅读顺序排列
      const storyMap = Object.fromEntries(storiesRes.data.map(s => [s._id, s]))
      const stories = storyIds.map(id => storyMap[id]).filter(Boolean)
      return { stories }
    }

    default:
      return { error: 'unknown action' }
  }
}
