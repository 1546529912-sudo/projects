const { aiExtract } = require('../../../utils/cloud');

Page({
  data: {
    loading: true,
    saving: false,
    error: null,
    rawText: '',
    aiResult: null,
    today: '',
    recordId: null,   // 已有记录的 _id，有则为编辑模式
    statusBarHeight: 0,
    editingIdx: -1,
    editingProject: null,
    projectSuggestions: [],
    showProjectPicker: false,
    pickerNewName: '',
  },

  onLoad(options) {
    const today = new Date().toISOString().slice(0, 10);
    const sys = wx.getSystemInfoSync();
    this.setData({ today, statusBarHeight: sys.statusBarHeight || 0 });

    if (options.recordId) {
      // 从首页点击已有记录进入：直接从 DB 加载
      this.setData({ recordId: options.recordId });
      this.loadExistingRecord(options.recordId);
    } else {
      const rawText = decodeURIComponent(options.text || '');
      this.setData({ rawText });
      this.doAIExtract(rawText);
    }
    this.loadProjectSuggestions();
  },

  async loadProjectSuggestions() {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('work_records')
        .orderBy('createTime', 'desc')
        .limit(50)
        .get();
      const seen = new Set();
      const suggestions = [];
      (res.data || []).forEach(r => {
        (r.projects || []).forEach(p => {
          const name = (p.project_name || '').trim();
          if (name && !seen.has(name)) {
            seen.add(name);
            suggestions.push(name);
          }
        });
      });
      this.setData({ projectSuggestions: suggestions.slice(0, 20) });
    } catch (_) {}
  },

  async loadExistingRecord(recordId) {
    this.setData({ loading: true, error: null });
    try {
      const db = wx.cloud.database();
      const res = await db.collection('work_records').doc(recordId).get();
      const r = res.data;
      const projects = (r.projects || []).map(p => ({
        ...p,
        actionsText: (p.actions || []).join('；'),
        problemsText: (p.problems || []).join('；'),
        hasProblems: !!(p.problems && p.problems.length),
      }));
      this.setData({
        rawText: r.rawText || '',
        aiResult: { summary: r.summary || '', projects, tomorrow_focus: r.tomorrow_focus || [] },
        loading: false,
      });
    } catch (err) {
      this.setData({ error: err.message, loading: false });
    }
  },

  async doAIExtract(text) {
    this.setData({ loading: true, error: null, editingIdx: -1 });
    try {
      const result = await aiExtract(text);
      const projects = (result.projects || []).map(p => ({
        ...p,
        actionsText: (p.actions || []).join('；'),
        problemsText: (p.problems || []).join('；'),
        hasProblems: !!(p.problems && p.problems.length),
      }));
      this.setData({ aiResult: { ...result, projects }, loading: false });
    } catch (err) {
      this.setData({ error: err.message, loading: false });
    }
  },

  onBack() {
    wx.navigateBack();
  },

  onCancelEdit() {
    const { editingIdx, aiResult } = this.data;
    const p = aiResult.projects[editingIdx];
    // 新增但未填写任何内容时取消，直接删除这条空项目
    if (p && !p.project_name && !p.actionsText) {
      const projects = [...aiResult.projects];
      projects.splice(editingIdx, 1);
      this.setData({ 'aiResult.projects': projects, editingIdx: -1, editingProject: null });
    } else {
      this.setData({ editingIdx: -1, editingProject: null });
    }
  },

  onRegenerate() {
    this.doAIExtract(this.data.rawText);
  },

  onAddProject() {
    const newProject = {
      project_name: '',
      actions: [],
      actionsText: '',
      problems: [],
      problemsText: '',
      hasProblems: false,
      next_steps: [],
    };
    const projects = [...this.data.aiResult.projects, newProject];
    this.setData({
      'aiResult.projects': projects,
      editingIdx: projects.length - 1,
      editingProject: { project_name: '', actionsText: '', problemsText: '', nextStepsText: '' },
    });
  },

  // 进入编辑态
  onEditProject(e) {
    const idx = parseInt(e.currentTarget.dataset.idx);
    const p = this.data.aiResult.projects[idx];
    this.setData({
      editingIdx: idx,
      editingProject: {
        project_name: p.project_name || '',
        actionsText: (p.actions || []).join('\n'),
        problemsText: (p.problems || []).join('\n'),
        nextStepsText: (p.next_steps || []).join('\n'),
      },
    });
  },

  onFieldChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`editingProject.${field}`]: e.detail.value });
  },

  onOpenProjectPicker() {
    this.setData({ showProjectPicker: true, pickerNewName: this.data.editingProject?.project_name || '' });
  },

  onCloseProjectPicker() {
    this.setData({ showProjectPicker: false });
  },

  onPickerNewNameInput(e) {
    this.setData({ pickerNewName: e.detail.value });
  },

  onPickerConfirm() {
    const name = this.data.pickerNewName.trim();
    if (name) {
      this.setData({ 'editingProject.project_name': name, showProjectPicker: false });
    } else {
      this.setData({ showProjectPicker: false });
    }
  },

  onSelectSuggestion(e) {
    const name = e.currentTarget.dataset.name;
    this.setData({ 'editingProject.project_name': name, showProjectPicker: false });
  },

  // 保存编辑
  onSaveEdit() {
    const { editingIdx, editingProject } = this.data;
    if (editingIdx < 0 || !editingProject) return;

    const split = str => (str || '').split(/[；\n]/).map(s => s.trim()).filter(Boolean);
    const actions = split(editingProject.actionsText);
    const problems = split(editingProject.problemsText);
    const next_steps = split(editingProject.nextStepsText);

    const updated = {
      ...this.data.aiResult.projects[editingIdx],
      project_name: editingProject.project_name.trim() || '未命名项目',
      actions,
      actionsText: actions.join('；'),
      problems,
      problemsText: problems.join('；'),
      hasProblems: problems.length > 0,
      next_steps,
    };

    const projects = [...this.data.aiResult.projects];
    projects[editingIdx] = updated;
    this.setData({ 'aiResult.projects': projects, editingIdx: -1, editingProject: null });
  },

  // 从编辑态删除此项目
  onDeleteFromEdit() {
    const { editingIdx } = this.data;
    const projects = [...this.data.aiResult.projects];
    projects.splice(editingIdx, 1);
    this.setData({ 'aiResult.projects': projects, editingIdx: -1, editingProject: null });
  },

  async onConfirm() {
    if (!this.data.aiResult || this.data.saving) return;
    this.setData({ saving: true });
    try {
      const db = wx.cloud.database();
      const { aiResult, rawText, today, recordId } = this.data;
      const title = aiResult.projects?.[0]?.project_name
        || aiResult.summary?.slice(0, 15)
        || '工作记录';
      const payload = {
        title,
        summary: aiResult.summary || '',
        projects: aiResult.projects || [],
        tomorrow_focus: aiResult.tomorrow_focus || [],
      };

      if (recordId) {
        // 已有记录：更新（updateTime 让首页能检测到"有新数据"）
        await db.collection('work_records').doc(recordId).update({
          data: { ...payload, updateTime: db.serverDate() },
        });
        wx.switchTab({ url: '/pages/index/index' });
      } else {
        // 新记录：保存后回首页，由用户决定何时生成日报
        await db.collection('work_records').add({
          data: { date: today, rawText, ...payload, createTime: db.serverDate() },
        });
        wx.switchTab({ url: '/pages/index/index' });
      }
    } catch (err) {
      this.setData({ saving: false });
      wx.showToast({ title: '保存失败：' + err.message, icon: 'none', duration: 2500 });
    }
  },
});
