const { doASR } = require('../../utils/cloud');

const recorderManager = wx.getRecorderManager();

Page({
  data: {
    dateStr: '',
    status: 'idle', // idle | recording | uploading | transcribing | done
    isRecording: false,
    recordText: '',
    fileID: null,
    error: null,
    showTyping: false,
    recordSecs: 0,
  },

  _timer: null,

  onLoad() {
    this.setDateStr();
    this.initRecorder();
  },

  onUnload() {
    recorderManager.stop();
    this.clearTimer();
  },

  setDateStr() {
    const now = new Date();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    const weeks = ['日', '一', '二', '三', '四', '五', '六'];
    this.setData({ dateStr: `${m}月${d}日 · 周${weeks[now.getDay()]}` });
  },

  initRecorder() {
    recorderManager.onStop(async (res) => {
      this.clearTimer();
      if (res.tempFilePath) {
        await this.uploadToCloud(res.tempFilePath);
      }
    });
    recorderManager.onError((err) => {
      this.clearTimer();
      this.setData({ error: '录音失败：' + err.errMsg, status: 'idle', isRecording: false });
    });
  },

  onRecordStart() {
    wx.authorize({
      scope: 'scope.record',
      success: () => {
        this.setData({ isRecording: true, status: 'recording', error: null, recordSecs: 0 });
        recorderManager.start({ duration: 60000, format: 'mp3', sampleRate: 16000, numberOfChannels: 1 });
        this.startTimer();
      },
      fail: () => this.setData({ error: '请在设置中授权录音权限' }),
    });
  },

  onRecordStop() {
    if (!this.data.isRecording) return;
    this.setData({ isRecording: false, status: 'uploading' });
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

  async uploadToCloud(tempFilePath) {
    try {
      const ext = tempFilePath.split('.').pop();
      const cloudPath = `recordings/${Date.now()}.${ext}`;
      const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: tempFilePath });
      this.setData({ fileID: uploadRes.fileID, status: 'transcribing' });

      const asrResult = await doASR(uploadRes.fileID, ext);
      this.setData({ recordText: asrResult.text, status: 'done' });
    } catch (err) {
      this.setData({ error: err.message, status: 'idle' });
    }
  },

  onTextChange(e) {
    this.setData({ recordText: e.detail.value });
  },

  onShowTyping() {
    this.setData({ showTyping: true });
  },

  onRedo() {
    this.setData({ status: 'idle', recordText: '', fileID: null, error: null, showTyping: false, recordSecs: 0 });
  },

  async onSubmitToAI() {
    const text = this.data.recordText.trim();
    if (!text) {
      wx.showToast({ title: '请先录入工作内容', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: `/pages/record/ai-confirm/ai-confirm?text=${encodeURIComponent(text)}&fileID=${this.data.fileID || ''}`,
    });
  },
});
