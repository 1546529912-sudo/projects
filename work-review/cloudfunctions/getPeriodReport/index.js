const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { type, periodStart } = event;

  if (!type || !periodStart) {
    return { code: 4001, message: '参数错误：缺少 type 或 periodStart', data: null };
  }

  try {
    const res = await db.collection('period_reports')
      .where({ openid, type, periodStart })
      .orderBy('updateTime', 'desc')
      .limit(1)
      .get();

    if (res.data.length === 0) {
      return { code: 0, message: 'success', data: null };
    }

    return { code: 0, message: 'success', data: res.data[0] };
  } catch (err) {
    console.error('getPeriodReport 失败', err);
    return { code: 5001, message: '获取失败：' + err.message, data: null };
  }
};
