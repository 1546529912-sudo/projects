require('dotenv').config();
const cloud = require('wx-server-sdk');
const WebSocket = require('ws');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const ASR_PROVIDER = process.env.ASR_PROVIDER || 'mock';
const DOUBAO_APP_ID = process.env.DOUBAO_APP_ID || '';
const DOUBAO_TOKEN = process.env.DOUBAO_TOKEN || '';
const DOUBAO_CLUSTER = process.env.DOUBAO_CLUSTER || 'Doubao_Seed_ASR_Streaming_2.0';

// 火山引擎流式 ASR 二进制协议常量（v3 BigModel）
const PROTO_VER    = 1;
const HDR_SIZE     = 1;  // 1 × 4 = 4 字节报头
const FULL_CLIENT  = 1;  // 配置帧（client → server）
const AUDIO_ONLY   = 2;  // 音频帧（client → server）
const SVR_RESPONSE = 9;  // 服务端响应（server → client），实测 type=9（0x91/0x93）
const SVR_ERROR    = 15; // 服务端错误（server → client）
const FLAG_NONE    = 0;
const FLAG_LAST    = 2;  // 最后一帧标志（flags & 0x02 != 0）
const SER_JSON     = 1;
const COMP_NONE    = 0;

function buildMsg(msgType, flags, payload) {
  // 音频帧用 serialization_type=0（原始二进制），配置帧用 1（JSON）
  const isRaw = Buffer.isBuffer(payload);
  const serType = isRaw ? 0 : SER_JSON;
  const header = Buffer.from([
    (PROTO_VER << 4) | HDR_SIZE,
    (msgType << 4) | flags,
    (serType << 4) | COMP_NONE,
    0,
  ]);
  const body = isRaw ? payload : Buffer.from(JSON.stringify(payload), 'utf-8');
  const size = Buffer.allocUnsafe(4);
  size.writeUInt32BE(body.length, 0);
  return Buffer.concat([header, size, body]);
}

function parseMsg(rawData) {
  try {
    // 文本帧：服务器直接返回 JSON 字符串
    if (typeof rawData === 'string') {
      console.log('[doASR] 文本帧：', rawData.slice(0, 200));
      return { msgType: SVR_RESPONSE, json: JSON.parse(rawData), isLast: false };
    }
    // 二进制帧结构（v3 BigModel）：
    //   [0-3]  4字节报头：version|hdr_size, type|flags, serial|compress, reserved
    //   [4-7]  4字节序列号
    //   [8-11] 4字节 payload 长度
    //   [12+]  JSON payload
    const data = Buffer.isBuffer(rawData) ? rawData : Buffer.from(rawData);
    const hdrBytes = (data[0] & 0x0F) * 4;          // 通常 = 4
    const msgType  = (data[1] >> 4) & 0x0F;          // 9 = 服务端响应
    const flags    = data[1] & 0x0F;                 // 1=普通, 3=最后一帧
    const isLast   = (flags & FLAG_LAST) !== 0;      // flags bit1 = last
    const payLen   = data.readUInt32BE(hdrBytes + 4); // 跳过4字节序列号
    const payload  = data.slice(hdrBytes + 8, hdrBytes + 8 + payLen);
    const json     = JSON.parse(payload.toString('utf-8'));
    console.log('[doASR] type=%d flags=%d isLast=%s json=%s', msgType, flags, isLast, JSON.stringify(json).slice(0, 200));
    return { msgType, json, isLast };
  } catch (e) {
    const preview = Buffer.isBuffer(rawData)
      ? rawData.slice(0, 16).toString('hex')
      : typeof rawData === 'string' ? rawData.slice(0, 100) : String(rawData);
    console.error('[doASR] parseMsg 失败:', e.message, '| hex:', preview);
    return { msgType: -1, json: null, isLast: false };
  }
}

exports.main = async (event, context) => {
  const { fileID, format = 'mp3' } = event;

  if (!fileID && ASR_PROVIDER !== 'mock') {
    return { code: 4001, message: '参数错误：缺少 fileID', data: null };
  }

  try {
    let text;
    if (ASR_PROVIDER === 'mock') {
      text = mockTranscribe();
    } else {
      const fileRes = await cloud.downloadFile({ fileID });
      let lastErr;
      for (let i = 0; i < 2; i++) {
        try {
          text = await callDoubaoASR(fileRes.fileContent, format);
          break;
        } catch (err) {
          lastErr = err;
          if (i < 1) {
            console.log('[doASR] 第1次失败，1.5s 后重试：', err.message);
            await new Promise(r => setTimeout(r, 1500));
          }
        }
      }
      if (text === undefined) throw lastErr;
    }
    return { code: 0, message: 'success', data: { text } };
  } catch (err) {
    console.error('[doASR] 失败：', err.message);
    return { code: 5031, message: 'ASR 服务异常：' + err.message, data: null };
  }
};

function callDoubaoASR(audioBuffer, format) {
  if (!DOUBAO_APP_ID || !DOUBAO_TOKEN) {
    return Promise.reject(new Error('豆包 ASR 凭证未配置：缺少 DOUBAO_APP_ID 或 DOUBAO_TOKEN'));
  }

  const reqId = `wr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  console.log('[doASR] 开始 WS ASR', { appid: DOUBAO_APP_ID, cluster: DOUBAO_CLUSTER, format, reqId });

  return new Promise((resolve, reject) => {
    const ws = new WebSocket('wss://openspeech.bytedance.com/api/v3/sauc/bigmodel', {
      headers: {
        'X-Api-App-Key':     DOUBAO_APP_ID,
        'X-Api-Access-Key':  DOUBAO_TOKEN,
        'X-Api-Resource-Id': 'volc.bigasr.sauc.duration',
        'X-Api-Connect-Id':  generateUUID(),
      },
    });

    const texts = [];
    let settled = false;

    const done = (err, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      } catch (_) {}
      if (err) reject(err);
      else resolve(result);
    };

    const timer = setTimeout(() => done(new Error('ASR 超时（30s）')), 30000);

    ws.on('open', () => {
      console.log('[doASR] WebSocket 已连接，发送配置帧');
      // 第一帧：发送识别配置
      ws.send(buildMsg(FULL_CLIENT, FLAG_NONE, {
        app: { appid: DOUBAO_APP_ID, token: DOUBAO_TOKEN, cluster: DOUBAO_CLUSTER },
        user: { uid: 'wx_user' },
        audio: { format, sample_rate: 16000, channel: 1, bits: 16 },
        request: {
          reqid: reqId,
          workflow: 'audio_in,resample,partition,asr,itn,punctuate',
          show_utterances: false,
        },
      }));
      // 第二帧：发送全部音频并标记结束
      ws.send(buildMsg(AUDIO_ONLY, FLAG_LAST, audioBuffer));
      console.log('[doASR] 音频已发送（%d bytes），等待响应…', audioBuffer.length);
    });

    ws.on('message', (data) => {
      const { msgType, json, isLast } = parseMsg(data);

      if (msgType === SVR_RESPONSE && json) {
        // 兼容多种响应结构提取文本
        const text =
          json.result?.text ||
          (Array.isArray(json.result) ? json.result.map(r => r.text).join('') : '') ||
          json.payload?.result?.text ||
          '';
        if (text) texts.push(text);
        // 以协议层 isLast 标志为准，JSON 字段作为备用
        if (isLast || json.is_last_package || json.result?.is_final) {
          done(null, texts.join(''));
        }
      } else if (msgType === SVR_ERROR && json) {
        console.error('[doASR] 服务端错误：', JSON.stringify(json));
        done(new Error(`ASR 服务端错误：${json.error || json.message || JSON.stringify(json)}`));
      }
    });

    ws.on('close', (code, reason) => {
      console.log('[doASR] WS 关闭 code=%d reason=%s', code, reason?.toString());
      // 关闭时若未 done，以已收到的文本结算
      done(null, texts.join(''));
    });

    ws.on('error', (err) => {
      console.error('[doASR] WS 错误：', err.message);
      done(new Error(`WebSocket 连接失败：${err.message}`));
    });
  });
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function mockTranscribe() {
  return '今天完成了项目初始化工作，搭建了微信云开发环境，配置了云数据库，实现了健康检查云函数。明天计划接入 AI 服务。（Mock 转写结果）';
}
