const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  console.log('syncProgress event:', JSON.stringify(event))
  const { OPENID } = cloud.getWXContext()
  const { action, progressList } = event
  const col = db.collection('user_progress')

  if (action === 'push') {
    await Promise.all(
      (progressList || []).map(p => {
        const { _id, openid: _openid, ...rest } = p
        return col.doc(`${OPENID}_${p.storyId}`).set({ data: { ...rest, openid: OPENID } })
      })
    )
    return { success: true }
  }

  if (action === 'pull') {
    const res = await col.where({ openid: OPENID }).limit(200).get()
    return { progressList: res.data }
  }

  return { error: 'unknown action' }
}
