const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  const col = db.collection('users')
  const now = new Date()

  const { data } = await col.where({ openid: OPENID }).limit(1).get()

  if (data.length === 0) {
    const addRes = await col.add({
      data: { openid: OPENID, createdAt: now, lastActiveAt: now },
    })
    return { user: { _id: addRes._id, openid: OPENID, createdAt: now.toISOString() }, isNew: true }
  }

  await col.doc(data[0]._id).update({ data: { lastActiveAt: now } })
  return { user: data[0], isNew: false }
}
