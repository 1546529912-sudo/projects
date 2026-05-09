const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event) => {
  const { action, item, word } = event
  const { OPENID } = cloud.getWXContext()

  switch (action) {
    case 'add': {
      // 幂等：先检查是否已存在
      const exists = await db.collection('vocabulary')
        .where({ openid: OPENID, word: item.word })
        .limit(1)
        .get()
      if (exists.data.length > 0) return { success: true, existing: true }

      await db.collection('vocabulary').add({
        data: { ...item, openid: OPENID, addedAt: db.serverDate() }
      })
      return { success: true }
    }

    case 'remove': {
      await db.collection('vocabulary')
        .where({ openid: OPENID, word })
        .remove()
      return { success: true }
    }

    case 'list': {
      const res = await db.collection('vocabulary')
        .where({ openid: OPENID })
        .orderBy('addedAt', 'desc')
        .limit(200)
        .get()
      return { words: res.data }
    }

    default:
      return { error: 'unknown action' }
  }
}
