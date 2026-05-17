require('dotenv').config();
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    asrProvider: process.env.ASR_PROVIDER || 'mock',
    aiProvider: process.env.AI_PROVIDER || 'mock',
  };

  try {
    // 云数据库联通检查
    await db.collection('daily_reports').limit(1).get();
    checks.database = 'connected';
  } catch (err) {
    checks.database = 'disconnected';
    checks.status = 'degraded';
    checks.dbError = err.message;
  }

  return { code: 0, message: 'ok', data: checks };
};
