const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const { userContext = '' } = event;

  try {
    await db.collection('user_profiles').doc(openid).set({
      data: { openid, userContext, updateTime: db.serverDate() },
    });
    return { code: 0, message: 'success', data: null };
  } catch (err) {
    return { code: 5001, message: '保存失败：' + err.message, data: null };
  }
};
