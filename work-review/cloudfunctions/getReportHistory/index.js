const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { page = 1, perPage = 20 } = event;

  const skip = (page - 1) * perPage;

  try {
    const res = await db.collection('daily_reports')
      .where({ openid, isDeleted: false })
      .orderBy('reportDate', 'desc')
      .skip(skip)
      .limit(perPage)
      .get();

    const countRes = await db.collection('daily_reports')
      .where({ openid, isDeleted: false })
      .count();

    return {
      code: 0, message: 'success',
      data: {
        list: res.data,
        total: countRes.total,
        page,
        perPage,
        hasMore: skip + res.data.length < countRes.total,
      },
    };
  } catch (err) {
    console.error('getReportHistory 失败', err);
    return { code: 5001, message: '获取历史失败：' + err.message, data: null };
  }
};
