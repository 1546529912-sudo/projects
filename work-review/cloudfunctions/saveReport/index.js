const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { date, content, template, personalText, formalText } = event;

  if (!date || !content) {
    return { code: 4001, message: '参数错误：缺少 date 或 content', data: null };
  }

  try {
    // 查找是否已有当天日报（updateOrCreate 语义）
    const existing = await db.collection('daily_reports')
      .where({ openid, reportDate: date, isDeleted: false })
      .limit(1).get();

    let reportId;
    if (existing.data.length > 0) {
      reportId = existing.data[0]._id;
      await db.collection('daily_reports').doc(reportId).update({
        data: {
          content,
          template: template || 'personal',
          personalText: personalText || '',
          formalText: formalText || '',
          updateTime: db.serverDate(),
        },
      });
    } else {
      const res = await db.collection('daily_reports').add({
        data: {
          _openid: openid,
          openid,
          reportDate: date,
          content,
          template: template || 'personal',
          personalText: personalText || '',
          formalText: formalText || '',
          isDeleted: false,
          createTime: db.serverDate(),
          updateTime: db.serverDate(),
        },
      });
      reportId = res._id;
    }

    return { code: 0, message: 'success', data: { reportId } };
  } catch (err) {
    console.error('saveReport 失败', err);
    return { code: 5001, message: '保存失败：' + err.message, data: null };
  }
};
