const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const ADMIN_OPENIDS = ['oKuBV3YRfk-S318GGE9UBcrZQIqM']

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!ADMIN_OPENIDS.includes(OPENID)) return { error: 'unauthorized' }

  const { action } = event

  if (action === 'overview') {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)

    const [userCount, newUsersToday, recentEventsRes, progressRes] = await Promise.all([
      db.collection('users').count(),
      db.collection('users').where({ createdAt: _.gte(todayStart) }).count(),
      db.collection('events').orderBy('createdAt', 'desc').limit(30).get(),
      db.collection('user_progress').limit(1000).get(),
    ])

    const thirtyDayEventsRes = await db.collection('events')
      .where({ createdAt: _.gte(thirtyDaysAgo) })
      .limit(1000)
      .get()

    const eventCounts = {}
    thirtyDayEventsRes.data.forEach(e => {
      eventCounts[e.type] = (eventCounts[e.type] || 0) + 1
    })

    const progressList = progressRes.data
    const readersSet = new Set(progressList.filter(p => p.percent > 0).map(p => p.openid))
    const completionsSet = new Set(progressList.filter(p => p.percent >= 95).map(p => p.openid))

    return {
      userCount: userCount.total,
      newUsersToday: newUsersToday.total,
      eventCounts,
      readerCount: readersSet.size,
      completionCount: completionsSet.size,
      recentEvents: recentEventsRes.data,
    }
  }

  if (action === 'stories') {
    const progressRes = await db.collection('user_progress').limit(1000).get()
    const storyMap = {}
    progressRes.data.forEach(p => {
      if (!storyMap[p.storyId]) storyMap[p.storyId] = { readers: 0, completions: 0 }
      if (p.percent > 0) storyMap[p.storyId].readers++
      if (p.percent >= 95) storyMap[p.storyId].completions++
    })

    const storyIds = Object.keys(storyMap)
    let titleMap = {}
    if (storyIds.length > 0) {
      const storiesRes = await db.collection('stories')
        .where({ _id: _.in(storyIds) })
        .field({ _id: true, title: true, level: true })
        .limit(200)
        .get()
      storiesRes.data.forEach(s => { titleMap[s._id] = { title: s.title, level: s.level } })
    }

    const storyList = Object.entries(storyMap)
      .map(([storyId, s]) => ({
        storyId,
        title: (titleMap[storyId] && titleMap[storyId].title) || storyId,
        level: (titleMap[storyId] && titleMap[storyId].level) || '',
        ...s,
      }))
      .sort((a, b) => b.readers - a.readers)
    return { storyList }
  }

  return { error: 'unknown action' }
}
