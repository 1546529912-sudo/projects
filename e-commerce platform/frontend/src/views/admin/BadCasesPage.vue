<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  adminListBadCases, adminLabelBadCase, adminBadCaseStats, adminExportBadCases,
  type AiFeedback, type FeedbackStats,
} from '@/api/admin-bad-case'

type LabeledFilter = '0' | '1' | 'all'

const labeled = ref<LabeledFilter>('0')
const items = ref<AiFeedback[]>([])
const loading = ref(true)
const stats = ref<FeedbackStats | null>(null)
const labelingId = ref<number | null>(null)
const labelInput = ref('')
const correctAnswer = ref('')
const labelingItem = ref<AiFeedback | null>(null)
const error = ref('')

const TAG_SUGGESTIONS = ['知识缺失', '价格错误', '理解偏差', '答非所问', '语气不当', '需要转人工']

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [list, s] = await Promise.all([
      adminListBadCases({ rating: 'bad', labeled: labeled.value, per_page: 50 }),
      adminBadCaseStats(),
    ])
    items.value = list.data.items
    stats.value = s.data
  } catch (e: any) {
    error.value = e?.response?.data?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function startLabel(item: AiFeedback) {
  labelingId.value = item.id
  labelingItem.value = item
  labelInput.value = (item.tags || []).join(',')
  correctAnswer.value = item.correct_answer || ''
}

async function submitLabel(id: number, tags: string[]) {
  if (tags.length === 0) {
    alert('请至少选一个标签')
    return
  }
  const ifMatch = labelingItem.value?.updated_at || undefined
  try {
    await adminLabelBadCase(id, tags, correctAnswer.value.trim() || undefined, ifMatch)
    labelingId.value = null
    labelingItem.value = null
    labelInput.value = ''
    correctAnswer.value = ''
    await load()
  } catch (e: any) {
    // iter-26 乐观锁冲突：刷新 + 让用户确认是否覆盖
    if (e?.response?.status === 409) {
      const current = e.response.data?.data?.current
      const summary = current
        ? `他人已修改：标签=${(current.tags || []).join(',')}；正确答案=${current.correct_answer ? '已填' : '空'}`
        : '记录已被他人修改'
      if (confirm(`${summary}\n\n点击"确定"用你的版本覆盖，"取消"放弃保存。`)) {
        // 用户坚持覆盖：再次提交但不带 if_match → 后端不校验
        try {
          await adminLabelBadCase(id, tags, correctAnswer.value.trim() || undefined, undefined)
          labelingId.value = null
          labelingItem.value = null
          labelInput.value = ''
          correctAnswer.value = ''
          await load()
        } catch (e2: any) {
          alert(e2?.response?.data?.message || '覆盖失败')
        }
      } else {
        await load()
      }
      return
    }
    alert(e?.response?.data?.message || '标注失败')
  }
}

function pickedTags(): string[] {
  return labelInput.value
    .split(/[,，、]/)
    .map(t => t.trim())
    .filter(Boolean)
}

function switchTab(v: LabeledFilter) {
  labeled.value = v
  load()
}

const exporting = ref<'csv' | 'jsonl' | null>(null)
async function exportData(format: 'csv' | 'jsonl') {
  exporting.value = format
  try {
    await adminExportBadCases(format, { rating: 'bad', labeled: labeled.value })
  } catch (e: any) {
    alert('导出失败：' + (e?.message || '未知错误'))
  } finally {
    exporting.value = null
  }
}

onMounted(load)
</script>

<template>
  <section class="admin">
    <header class="head">
      <h1>AI Bad Case 收集 + 标注</h1>
      <span v-if="stats" class="meta">
        差评 {{ stats.total_bad }} · 待标注 <strong>{{ stats.unlabeled_bad }}</strong> ·
        训练集就绪 <span class="ok-pill">{{ stats.training_ready }}</span>
      </span>
      <span class="spacer"></span>
      <button class="export" :disabled="exporting !== null" @click="exportData('csv')">
        {{ exporting === 'csv' ? '导出中…' : '📥 导出 CSV' }}
      </button>
      <button class="export" :disabled="exporting !== null" @click="exportData('jsonl')" title="ML 工程师拿去做 prompt review / fine-tuning 起草">
        {{ exporting === 'jsonl' ? '导出中…' : '📥 导出 JSONL' }}
      </button>
    </header>

    <div v-if="stats" class="stats">
      <div class="stat-block">
        <h3>来源聚类</h3>
        <ul>
          <li v-for="(c, src) in stats.by_source" :key="src">
            <span class="src-name">{{ src }}</span>
            <span class="src-count">{{ c }}</span>
          </li>
        </ul>
      </div>
      <div class="stat-block">
        <h3>标签聚类（已标注）</h3>
        <ul v-if="Object.keys(stats.by_tag).length > 0">
          <li v-for="(c, tag) in stats.by_tag" :key="tag">
            <span class="src-name">{{ tag }}</span>
            <span class="src-count">{{ c }}</span>
          </li>
        </ul>
        <p v-else class="muted">尚无已标注 Bad Case</p>
      </div>
    </div>

    <div class="tabs">
      <button :class="{ active: labeled === '0' }" @click="switchTab('0')">未标注</button>
      <button :class="{ active: labeled === '1' }" @click="switchTab('1')">已标注</button>
      <button :class="{ active: labeled === 'all' }" @click="switchTab('all')">全部</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="loading" class="state loading">载入中…</div>
    <div v-else-if="items.length === 0" class="state empty">暂无 Bad Case</div>
    <table v-else class="table">
      <thead>
        <tr>
          <th>时间</th>
          <th>来源</th>
          <th>用户反馈</th>
          <th>AI 消息片段</th>
          <th>已标注</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="f in items" :key="f.id">
          <td>{{ f.created_at?.slice(0, 16).replace('T', ' ') }}</td>
          <td>
            <span class="badge" :class="'src-' + f.source">{{ f.source }}</span>
          </td>
          <td class="reason">{{ f.reason || '—' }}</td>
          <td class="msg-content">{{ (f.message_content || '').slice(0, 80) }}{{ (f.message_content || '').length > 80 ? '…' : '' }}</td>
          <td>
            <span v-if="f.labeled">
              <span v-for="t in f.tags" :key="t" class="tag">{{ t }}</span>
            </span>
            <span v-else class="muted">—</span>
          </td>
          <td>
            <button v-if="!f.labeled" class="action" @click="startLabel(f)">标注</button>
            <span v-else>
              <button class="action ghost" @click="startLabel(f)" title="补/改正确答案">
                {{ f.correct_answer ? '✓ 已修复' : '+ 写正确答案' }}
              </button>
              <div class="muted" style="margin-top:4px">{{ f.labeled_at?.slice(0, 16).replace('T', ' ') }}</div>
            </span>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 标注弹层 -->
    <div v-if="labelingId !== null" class="modal-scrim" @click.self="labelingId = null">
      <div class="modal">
        <h3>标注 + 写正确答案</h3>

        <div v-if="labelingItem" class="context-block">
          <div class="ctx-label">AI 当时的错误回复：</div>
          <div class="ctx-text bad">{{ labelingItem.message_content || '—' }}</div>
        </div>

        <div class="field-label">问题标签 *</div>
        <div class="tag-suggestions">
          <button
            v-for="t in TAG_SUGGESTIONS"
            :key="t"
            class="suggest"
            @click="labelInput += (labelInput ? ',' : '') + t"
          >+ {{ t }}</button>
        </div>
        <input
          v-model="labelInput"
          placeholder="多个标签用逗号分隔"
        />

        <div class="field-label">正确答案（可选）<span class="hint">填了就能直接进训练集 → JSONL is_training_ready=true</span></div>
        <textarea
          v-model="correctAnswer"
          rows="5"
          placeholder="如果你能写出正确回复，这条 bad case 就变成有效训练样本。留空则只是 review 候选。"
        ></textarea>

        <div class="modal-actions">
          <button class="ghost" @click="labelingId = null">取消</button>
          <button class="primary" @click="submitLabel(labelingId, pickedTags())">保存</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.admin {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-xxl) var(--space-lg);
}
.head { display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-lg); }
h1 { font-size: 22px; font-weight: 500; margin: 0; }
.meta { color: var(--color-muted); font-size: 13px; }
.meta strong { color: var(--color-error); }
.ok-pill { background: var(--color-success); color: white; padding: 1px 8px; border-radius: 10px; font-size: 12px; font-weight: 600; }
.spacer { flex: 1; }
.export {
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  color: var(--color-primary);
  font-size: 13px;
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.export:hover { border-color: var(--color-primary); }
.export:disabled { opacity: 0.6; cursor: not-allowed; }
.stats { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); margin-bottom: var(--space-lg); }
.stat-block { background: var(--color-canvas); border: 1px solid var(--color-hairline); border-radius: var(--radius-md); padding: var(--space-md); }
.stat-block h3 { font-size: 13px; font-weight: 600; margin: 0 0 var(--space-xs); color: var(--color-muted); }
.stat-block ul { list-style: none; padding: 0; margin: 0; }
.stat-block li { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--color-hairline-soft); font-size: 13px; }
.src-name { font-family: var(--font-mono); }
.src-count { color: var(--color-primary); font-weight: 600; }
.tabs { display: flex; gap: var(--space-xs); margin-bottom: var(--space-md); }
.tabs button { background: var(--color-canvas); border: 1px solid var(--color-hairline); padding: 6px 14px; font-size: 13px; cursor: pointer; border-radius: var(--radius-sm); }
.tabs button.active { background: var(--color-primary); color: white; border-color: var(--color-primary); }
.state { text-align: center; padding: var(--space-xxl); color: var(--color-muted); background: var(--color-surface-soft); border-radius: var(--radius-md); }
.error { color: var(--color-error); margin-bottom: var(--space-base); }
.table { width: 100%; border-collapse: collapse; background: var(--color-canvas); border: 1px solid var(--color-hairline); border-radius: var(--radius-md); overflow: hidden; }
.table th, .table td { padding: var(--space-md); text-align: left; border-bottom: 1px solid var(--color-hairline-soft); font-size: 13px; vertical-align: top; }
.table th { background: var(--color-surface-soft); font-weight: 600; }
.msg-content { color: var(--color-muted); max-width: 300px; }
.reason { max-width: 200px; }
.muted { color: var(--color-muted); font-size: 12px; }
.badge { padding: 2px 8px; border-radius: var(--radius-sm); font-size: 11px; font-family: var(--font-mono); }
.src-manual { background: #ffd; color: #663; }
.src-auto_transfer { background: #fee; color: #933; }
.src-auto_lowconf { background: #e0f2fe; color: #075985; }
.tag { display: inline-block; padding: 2px 8px; margin: 2px 4px 2px 0; background: var(--color-surface-soft); border-radius: var(--radius-sm); font-size: 11px; }
.action { background: var(--color-primary); color: white; border: none; border-radius: var(--radius-sm); padding: 4px 12px; font-size: 12px; cursor: pointer; }
.modal-scrim {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.modal {
  background: var(--color-canvas); border-radius: var(--radius-md);
  padding: var(--space-xl); width: 640px; max-width: 92vw; max-height: 88vh; overflow-y: auto;
}
.modal h3 { margin: 0 0 var(--space-md); }
.context-block { margin-bottom: var(--space-md); }
.ctx-label { font-size: 12px; color: var(--color-muted); margin-bottom: 4px; }
.ctx-text { padding: 8px 12px; border-radius: var(--radius-sm); font-size: 13px; max-height: 120px; overflow-y: auto; }
.ctx-text.bad { background: #fef2f2; border: 1px solid #fecaca; color: #7f1d1d; }
.field-label { font-size: 12px; color: var(--color-muted); margin: var(--space-md) 0 6px; }
.field-label .hint { color: var(--color-success); font-weight: normal; }
.tag-suggestions { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; }
.suggest { background: var(--color-surface-soft); border: 1px solid var(--color-hairline); padding: 4px 10px; font-size: 12px; cursor: pointer; border-radius: 4px; }
.suggest:hover { background: var(--color-primary); color: white; border-color: var(--color-primary); }
.modal input { width: 100%; padding: 8px 12px; border: 1px solid var(--color-hairline); border-radius: var(--radius-sm); font-size: 14px; box-sizing: border-box; }
.modal textarea { width: 100%; padding: 8px 12px; border: 1px solid var(--color-hairline); border-radius: var(--radius-sm); font-size: 14px; font-family: inherit; resize: vertical; box-sizing: border-box; }
.modal-actions { display: flex; justify-content: flex-end; gap: var(--space-xs); margin-top: var(--space-md); }
.modal-actions button { padding: 6px 16px; font-size: 13px; border-radius: var(--radius-sm); cursor: pointer; }
.modal-actions .ghost { background: transparent; border: 1px solid var(--color-hairline); }
.modal-actions .primary { background: var(--color-primary); color: white; border: none; }
.action.ghost { background: transparent; color: var(--color-primary); border: 1px solid var(--color-hairline); }
.action.ghost:hover { border-color: var(--color-primary); background: var(--color-surface-soft); }
</style>
