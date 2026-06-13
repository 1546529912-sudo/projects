<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import {
  listKnowledge, createKnowledge, updateKnowledge, deleteKnowledge, toggleKnowledge,
  type KnowledgeItem, type KnowledgePayload,
} from '@/api/knowledge'

const items = ref<KnowledgeItem[]>([])
const total = ref(0)
const loading = ref(true)
const keyword = ref('')
const error = ref('')

const showForm = ref(false)
const editing = ref<KnowledgeItem | null>(null)
const form = reactive<KnowledgePayload>({
  title: '', content: '', category: '产品参数', keywords: '', source: '', status: 'active',
})

const CATEGORIES = ['产品参数', '价格政策', '物流', '售后', '应用场景', '其他']

const STATUS_LABEL: Record<string, string> = {
  active: '已上架', disabled: '已下架', draft: '草稿', pending_review: '待审',
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await listKnowledge({ keyword: keyword.value || undefined })
    items.value = res.data.items
    total.value = res.data.total
  } catch (e: any) {
    error.value = e?.response?.data?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

function openNew() {
  editing.value = null
  Object.assign(form, { title: '', content: '', category: '产品参数', keywords: '', source: '', status: 'active' })
  showForm.value = true
}

function openEdit(item: KnowledgeItem) {
  editing.value = item
  Object.assign(form, {
    title: item.title, content: item.content, category: item.category,
    keywords: item.keywords ?? '', source: item.source ?? '', status: item.status,
  })
  showForm.value = true
}

async function save() {
  error.value = ''
  if (!form.title || !form.content) {
    error.value = '标题和内容必填'
    return
  }
  try {
    if (editing.value) {
      await updateKnowledge(editing.value.id, form)
    } else {
      await createKnowledge(form)
    }
    showForm.value = false
    await load()
  } catch (e: any) {
    error.value = e?.response?.data?.message || '保存失败'
  }
}

async function toggle(it: KnowledgeItem) {
  try {
    const res = await toggleKnowledge(it.id)
    it.status = res.data.status as KnowledgeItem['status']
  } catch (e: any) {
    alert(e?.response?.data?.message || '切换失败')
  }
}

async function remove(it: KnowledgeItem) {
  if (!confirm(`确认删除《${it.title}》？`)) return
  try {
    await deleteKnowledge(it.id)
    await load()
  } catch (e: any) {
    alert(e?.response?.data?.message || '删除失败')
  }
}

onMounted(load)
</script>

<template>
  <section class="kb">
    <header>
      <div>
        <h1>知识库</h1>
        <p class="meta">共 {{ total }} 条 · AI 售前回答的语料来源</p>
      </div>
      <button class="cta" @click="openNew">+ 新建知识</button>
    </header>

    <div class="toolbar">
      <input v-model.trim="keyword" placeholder="搜索标题/内容" @keyup.enter="load" />
      <button @click="load">搜索</button>
    </div>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="loading" class="state">载入中…</div>
    <div v-else-if="items.length === 0" class="state">暂无条目，点 + 新建</div>
    <table v-else class="table">
      <thead>
        <tr>
          <th>标题</th>
          <th style="width: 100px">分类</th>
          <th style="width: 160px">来源</th>
          <th style="width: 80px">状态</th>
          <th style="width: 180px">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="it in items" :key="it.id">
          <td>
            <div class="title">{{ it.title }}</div>
            <div class="content">{{ it.content.slice(0, 80) }}{{ it.content.length > 80 ? '…' : '' }}</div>
          </td>
          <td>{{ it.category }}</td>
          <td class="muted">{{ it.source || '-' }}</td>
          <td><span class="badge" :class="it.status">{{ STATUS_LABEL[it.status] || it.status }}</span></td>
          <td>
            <button class="action edit" @click="openEdit(it)">编辑</button>
            <button class="action toggle" @click="toggle(it)">
              {{ it.status === 'active' ? '下架' : '上架' }}
            </button>
            <button class="action del" @click="remove(it)">删</button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 新建/编辑 模态 -->
    <Teleport to="body">
      <div v-if="showForm" class="modal-mask" @click.self="showForm = false">
        <div class="modal">
          <header>
            <h2>{{ editing ? '编辑知识' : '新建知识' }}</h2>
            <button class="x" @click="showForm = false">×</button>
          </header>
          <div class="form">
            <label>
              <span>标题 *</span>
              <input v-model.trim="form.title" placeholder="例：T700 板的密度" />
            </label>
            <label>
              <span>内容 *</span>
              <textarea v-model="form.content" rows="6" placeholder="完整知识正文…"></textarea>
            </label>
            <div class="row">
              <label>
                <span>分类</span>
                <select v-model="form.category">
                  <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
                </select>
              </label>
              <label>
                <span>状态</span>
                <select v-model="form.status">
                  <option value="active">已上架</option>
                  <option value="disabled">已下架</option>
                  <option value="draft">草稿</option>
                </select>
              </label>
            </div>
            <label>
              <span>关键词（逗号分隔）</span>
              <input v-model.trim="form.keywords" placeholder="如 T700,密度,碳纤维板" />
            </label>
            <label>
              <span>来源</span>
              <input v-model.trim="form.source" placeholder="如 T700 规格书 v2.1" />
            </label>
            <p v-if="error" class="error">{{ error }}</p>
            <div class="actions">
              <button class="ghost" @click="showForm = false">取消</button>
              <button class="primary" @click="save">{{ editing ? '保存修改' : '创建' }}</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<style scoped>
.kb { max-width: 1200px; margin: 0 auto; padding: var(--space-xl) var(--space-lg); }

header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: var(--space-lg); }
h1 { font-size: 22px; font-weight: 500; margin: 0; }
.meta { color: var(--color-muted); font-size: 13px; margin: var(--space-xs) 0 0; }

.cta {
  background: var(--color-primary); color: white; padding: 10px 20px;
  border-radius: var(--radius-sm); font-size: 14px; font-weight: 500;
  border: none; cursor: pointer;
}
.cta:hover { background: var(--color-primary-active); }

.toolbar { display: flex; gap: var(--space-sm); margin-bottom: var(--space-base); }
.toolbar input {
  flex: 1; max-width: 320px; height: 36px;
  border: 1px solid var(--color-hairline); border-radius: var(--radius-sm);
  padding: 0 12px; font-size: 14px;
}
.toolbar button {
  height: 36px; background: var(--color-ink); color: white; border: none;
  border-radius: var(--radius-sm); padding: 0 16px; cursor: pointer;
}

.error { color: var(--color-error); font-size: 13px; margin: 0 0 var(--space-sm); }

.state {
  text-align: center; padding: var(--space-xxl); color: var(--color-muted);
  background: var(--color-surface-soft); border-radius: var(--radius-md);
}

.table {
  width: 100%; border-collapse: collapse;
  background: var(--color-canvas); border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md); overflow: hidden; font-size: 13px;
}
.table th, .table td {
  padding: var(--space-sm) var(--space-md); text-align: left;
  border-bottom: 1px solid var(--color-hairline-soft); vertical-align: top;
}
.table th { background: var(--color-surface-soft); font-weight: 600; }

.title { font-weight: 500; color: var(--color-ink); }
.content { color: var(--color-muted); font-size: 12px; margin-top: 2px; line-height: 1.5; }
.muted { color: var(--color-muted); font-size: 12px; }

.badge {
  font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: var(--radius-full);
  background: var(--color-surface-strong); color: var(--color-muted);
}
.badge.active { background: #e7f8ee; color: var(--color-success); }
.badge.disabled { background: var(--color-surface-strong); color: var(--color-muted); }
.badge.draft { background: #fff5e6; color: var(--color-warning); }

.action {
  font-size: 12px; padding: 4px 10px; margin: 2px;
  border-radius: var(--radius-sm); cursor: pointer;
}
.action.edit { background: var(--color-primary); color: white; border: none; }
.action.toggle { background: var(--color-canvas); border: 1px solid var(--color-hairline); color: var(--color-ink); }
.action.del { background: var(--color-canvas); border: 1px solid var(--color-error); color: var(--color-error); }

/* Modal */
.modal-mask {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
  z-index: 200;
}
.modal {
  background: white; border-radius: var(--radius-md); width: 560px; max-width: 90vw;
  max-height: 90vh; overflow-y: auto;
}
.modal header {
  padding: var(--space-base) var(--space-lg);
  border-bottom: 1px solid var(--color-hairline-soft);
  margin-bottom: 0;
}
.modal h2 { font-size: 16px; font-weight: 600; margin: 0; }
.modal .x { background: none; border: none; font-size: 24px; cursor: pointer; color: var(--color-muted); }

.form { padding: var(--space-lg); display: flex; flex-direction: column; gap: var(--space-base); }
.form label { display: flex; flex-direction: column; gap: var(--space-xs); }
.form label span { font-size: 13px; font-weight: 500; }
.form input, .form select, .form textarea {
  border: 1px solid var(--color-hairline); border-radius: var(--radius-sm);
  padding: 10px 12px; font-size: 14px; font-family: inherit;
}
.form textarea { resize: vertical; }
.form .row { display: flex; gap: var(--space-base); }
.form .row label { flex: 1; }

.actions { display: flex; justify-content: flex-end; gap: var(--space-sm); margin-top: var(--space-sm); }
.ghost {
  background: white; border: 1px solid var(--color-hairline); border-radius: var(--radius-sm);
  padding: 10px 18px; cursor: pointer; font-size: 14px;
}
.primary {
  background: var(--color-primary); color: white; border: none; border-radius: var(--radius-sm);
  padding: 10px 24px; cursor: pointer; font-size: 14px; font-weight: 500;
}
.primary:hover { background: var(--color-primary-active); }
</style>
