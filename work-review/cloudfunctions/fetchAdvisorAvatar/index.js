const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 预置 title，DB 中无记录时的兜底
const PRESET_TITLES = {
  '马斯克':     'Tesla · SpaceX CEO',
  '乔布斯':     'Apple 联合创始人',
  '稻盛和夫':   '京瓷创始人 · 阿米巴之父',
  '任正非':     '华为创始人',
  '巴菲特':     '伯克希尔·哈撒韦 CEO',
  '比尔·盖茨': '微软联合创始人',
  '贝佐斯':     '亚马逊创始人',
  '彼得·德鲁克':'现代管理学之父',
  '查理·芒格': '伯克希尔·哈撒韦副董事长',
  '雷军':       '小米集团创始人',
  '张一鸣':     '字节跳动创始人',
  '马云':       '阿里巴巴联合创始人',
  '黄仁勋':     'NVIDIA CEO',
  '扎克伯格':   'Meta CEO',
};

exports.main = async (event) => {
  const { name } = event;
  if (!name) return { code: 4001, message: '缺少顾问名称', data: null };

  const fallbackTitle = PRESET_TITLES[name] || '';

  try {
    const res = await db.collection('advisor_avatars').where({ name }).get();
    if (res.data && res.data.length > 0) {
      const rec = res.data[0];
      return {
        code: 0,
        message: 'success',
        data: {
          title: rec.title || fallbackTitle,
          avatarFileID: rec.fileID || null,
        },
      };
    }
  } catch (e) {
    console.warn('DB 查询失败:', e.message);
  }

  // DB 暂无记录，返回 title 占位
  return { code: 0, message: 'success', data: { title: fallbackTitle, avatarFileID: null } };
};
