const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  await db.collection('events').add({
    data: { ...event, openid: OPENID, createdAt: db.serverDate() }
  })
  return { success: true }
}
