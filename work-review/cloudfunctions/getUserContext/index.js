const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async () => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  try {
    const res = await db.collection('user_profiles').doc(openid).get();
    return { code: 0, message: 'success', data: { userContext: res.data.userContext || '' } };
  } catch (_) {
    return { code: 0, message: 'success', data: { userContext: '' } };
  }
};
