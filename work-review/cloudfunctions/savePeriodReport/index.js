const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { type, periodStart, periodEnd, summary, personalText, formalText } = event;

  if (!type || !periodStart) {
    return { code: 4001, message: '参数错误：缺少 type 或 periodStart', data: null };
  }

  try {
    const existing = await db.collection('period_reports')
      .where({ openid, type, periodStart })
      .limit(1).get();

    if (existing.data.length > 0) {
      await db.collection('period_reports').doc(existing.data[0]._id).update({
        data: {
          periodEnd,
          summary: summary || '',
          personalText: personalText || '',
          formalText: formalText || '',
          generatedDate: new Date().toISOString().slice(0, 10),
          updateTime: db.serverDate(),
        },
      });
      return { code: 0, message: 'success', data: { id: existing.data[0]._id } };
    }

    const res = await db.collection('period_reports').add({
      data: {
        openid,
        type,
        periodStart,
        periodEnd: periodEnd || '',
        summary: summary || '',
        personalText: personalText || '',
        formalText: formalText || '',
        generatedDate: new Date().toISOString().slice(0, 10),
        createTime: db.serverDate(),
        updateTime: db.serverDate(),
      },
    });
    return { code: 0, message: 'success', data: { id: res._id } };
  } catch (err) {
    console.error('savePeriodReport 失败', err);
    return { code: 5001, message: '保存失败：' + err.message, data: null };
  }
};
