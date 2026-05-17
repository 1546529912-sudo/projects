const { healthCheck, doASR } = require('../../utils/cloud');

const IS_DEV = true;
const recorderManager = wx.getRecorderManager();

Page({
  data: {
    timeOfDay: '下午好',
    hasTodayRecord: false,
    todayRecords: [],
    todayProjectCount: 0,
    todayTaskCount: 0,
    cloudStatus: null,
    cloudMsg: '',
    isDev: IS_DEV,
    // 录音覆层状态
    recordStatus: 'idle', // idle | recording | uploading | transcribing
    recordSecs: 0,
  },

  _timer: null,

  onLoad() {
    this.setTimeOfDay();
    this.checkCloud();
    this.initRecorder();
  },

  onShow() {
    this.setData({ recordStatus: 'idle' });
    if (typeof this.getTabBar === 'function' && this.getTabBar().setSelected) {
      this.getTabBar().setSelected(0);
    }
    this.loadTodayRecords();
  },

  onUnload() {
    recorderManager.stop();
    this.clearTimer();
  },

  setTimeOfDay() {
    const h = new Date().getHours();
    let t = '早上好';
    if (h >= 12 && h < 18) t = '下午好';
    else if (h >= 18) t = '晚上好';
    this.setData({ timeOfDay: t });
  },

  async checkCloud() {
    try {
      const data = await healthCheck();
      this.setData({ cloudStatus: data.status, cloudMsg: data.database || '' });
    } catch (err) {
      this.setData({ cloudStatus: 'error', cloudMsg: err.message });
    }
  },

  async loadTodayRecords() {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const db = wx.cloud.database();
      const res = await db.collection('work_records')
        .where({ date: today })
        .orderBy('createTime', 'asc')
        .get();

      const records = (res.data || []).map(r => ({
        ...r,
        recordTime: (() => {
          if (!r.createTime) return '--:--';
          const d = new Date(r.createTime);
          return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        })(),
        title: r.title || r.rawText?.slice(0, 15) || '录入记录',
        summary: r.summary || r.rawText?.slice(0, 30) || '',
      }));

      let projectSet = new Set();
      let taskCount = 0;
      records.forEach(r => {
        (r.projects || []).forEach(p => {
          projectSet.add(p.project_name);
          taskCount += (p.actions || []).length;
        });
      });

      this.setData({
        todayRecords: records,
        hasTodayRecord: records.length > 0,
        todayProjectCount: projectSet.size || records.length,
        todayTaskCount: taskCount,
      });
    } catch (err) {
      console.error('[loadTodayRecords]', err.message);
      this.setData({ hasTodayRecord: false, todayRecords: [] });
    }
  },

  // ── 录音（首页直接长按） ──
  initRecorder() {
    recorderManager.onStop(async (res) => {
      this.clearTimer();
      if (res.tempFilePath) {
        await this.uploadAndTranscribe(res.tempFilePath);
      }
    });
    recorderManager.onError((err) => {
      this.clearTimer();
      this.setData({ recordStatus: 'idle' });
      wx.showToast({ title: '录音失败', icon: 'none' });
      console.error('[recorder]', err);
    });
  },

  onRecordStart() {
    wx.authorize({
      scope: 'scope.record',
      success: () => {
        this.setData({ recordStatus: 'recording', recordSecs: 0 });
        recorderManager.start({ duration: 60000, format: 'mp3', sampleRate: 16000, numberOfChannels: 1 });
        this.startTimer();
      },
      fail: () => wx.showToast({ title: '请授权录音权限', icon: 'none' }),
    });
  },

  onRecordStop() {
    if (this.data.recordStatus !== 'recording') return;
    if (this.data.recordSecs < 1) {
      recorderManager.stop();
      this.clearTimer();
      this.setData({ recordStatus: 'idle' });
      wx.showToast({ title: '录音太短，请重试', icon: 'none' });
      return;
    }
    this.setData({ recordStatus: 'uploading' });
    recorderManager.stop();
  },

  startTimer() {
    this._timer = setInterval(() => {
      const secs = this.data.recordSecs + 1;
      this.setData({ recordSecs: secs });
      if (secs >= 60) this.onRecordStop();
    }, 1000);
  },

  clearTimer() {
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  },

  async uploadAndTranscribe(tempFilePath) {
    try {
      const ext = tempFilePath.split('.').pop();
      const cloudPath = `recordings/${Date.now()}.${ext}`;
      const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: tempFilePath });
      this.setData({ recordStatus: 'transcribing' });

      const asrResult = await doASR(uploadRes.fileID, ext);
      wx.navigateTo({
        url: `/pages/record/ai-confirm/ai-confirm?text=${encodeURIComponent(asrResult.text)}`,
      });
    } catch (err) {
      this.setData({ recordStatus: 'idle' });
      wx.showToast({ title: err.message, icon: 'none', duration: 2500 });
    }
  },

  // ── 其他导航 ──
  onTapRecord(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/record/ai-confirm/ai-confirm?recordId=${id}` });
  },

  onViewReport() {
    const today = new Date().toISOString().slice(0, 10);
    wx.navigateTo({ url: `/pages/report/report?date=${today}&mode=draft` });
  },

  onGenerateReport() {
    const today = new Date().toISOString().slice(0, 10);
    wx.navigateTo({ url: `/pages/report/report?date=${today}&mode=generate` });
  },

  onTextInput() {
    wx.navigateTo({ url: '/pages/record/record' });
  },
});
