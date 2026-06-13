<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  adminListFailedJobs, adminRetryFailedJob, adminDeleteFailedJob, adminClearFailedJobs,
  type FailedJob,
} from '@/api/admin-failed-job'

const items = ref<FailedJob[]>([])
const total = ref(0)
const page = ref(1)
const lastPage = ref(1)
const perPage = ref(20)
const keyword = ref('')
const loading = ref(true)
const acting = ref<string | null>(null)
const expanded = ref<string | null>(null)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const r = await adminListFailedJobs({
      perPage: perPage.value,
      page: page.value,
      keyword: keyword.value,
    })
    items.value = r.data.items
    total.value = r.data.total
    lastPage.value = r.data.last_page
    page.value = r.data.page
  } catch (e: any) {
    error.value = e?.response?.data?.message || '加载失败'
  } finally {
    loading.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    load()
  }, 300)
}

function gotoPage(p: number) {
  if (p < 1 || p > lastPage.value || p === page.value) return
  page.value = p
  load()
}

async function retry(uuid: string) {
  acting.value = uuid
  try {
    await adminRetryFailedJob(uuid)
    await load()
  } catch (e: any) {
    alert(e?.response?.data?.message || '重试失败')
  } finally {
    acting.value = null
  }
}

async function destroy(uuid: string) {
  if (!confirm('删除这条失败作业？')) return
  acting.value = uuid
  try {
    await adminDeleteFailedJob(uuid)
    await load()
  } catch (e: any) {
    alert(e?.response?.data?.message || '删除失败')
  } finally {
    acting.value = null
  }
}

async function clearAll() {
  if (!confirm(`确认清空全部 ${total.value} 条失败作业？此操作不可撤销。`)) return
  try {
    await adminClearFailedJobs()
    await load()
  } catch (e: any) {
    alert(e?.response?.data?.message || '清空失败')
  }
}

onMounted(load)
</script>

<template>
  <section class="admin">
    <header class="head">
      <h1>死信队列</h1>
      <span class="meta">共 <strong>{{ total }}</strong> 条失败作业</span>
      <span class="spacer"></span>
      <input
        v-model="keyword"
        class="search"
        type="text"
        placeholder="搜索：作业类 / 异常 / 队列名"
        @input="onSearchInput"
      />
      <button v-if="total > 0" class="danger" @click="clearAll">🗑 清空全部</button>
    </header>

    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="loading" class="state loading">载入中…</div>
    <div v-else-if="items.length === 0" class="state empty">✓ 没有失败作业</div>
    <table v-else class="table">
      <thead>
        <tr>
          <th>失败时间</th>
          <th>作业类</th>
          <th>队列</th>
          <th>UUID</th>
          <th>异常摘要</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="j in items" :key="j.uuid">
          <tr>
            <td>{{ j.failed_at?.slice(0, 19).replace('T', ' ') }}</td>
            <td class="mono">{{ j.job_class }}</td>
            <td>{{ j.queue }}</td>
            <td class="mono uuid" @click="expanded = expanded === j.uuid ? null : j.uuid">
              {{ j.uuid.slice(0, 8) }}…
            </td>
            <td class="exc">{{ j.exception_excerpt.slice(0, 80) }}<span v-if="j.exception_excerpt.length > 80">…</span></td>
            <td>
              <button class="retry" :disabled="acting === j.uuid" @click="retry(j.uuid)">重试</button>
              <button class="del" :disabled="acting === j.uuid" @click="destroy(j.uuid)">删除</button>
            </td>
          </tr>
          <tr v-if="expanded === j.uuid" class="detail">
            <td colspan="6">
              <pre>{{ j.exception_excerpt }}</pre>
            </td>
          </tr>
        </template>
      </tbody>
    </table>

    <div v-if="!loading && lastPage > 1" class="pager">
      <button :disabled="page <= 1" @click="gotoPage(page - 1)">‹ 上一页</button>
      <span class="pager-info">第 <strong>{{ page }}</strong> / {{ lastPage }} 页</span>
      <button :disabled="page >= lastPage" @click="gotoPage(page + 1)">下一页 ›</button>
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
.spacer { flex: 1; }
.state { text-align: center; padding: var(--space-xxl); color: var(--color-muted); background: var(--color-surface-soft); border-radius: var(--radius-md); }
.error { color: var(--color-error); margin-bottom: var(--space-base); }
.table { width: 100%; border-collapse: collapse; background: var(--color-canvas); border: 1px solid var(--color-hairline); border-radius: var(--radius-md); overflow: hidden; }
.table th, .table td { padding: var(--space-md); text-align: left; border-bottom: 1px solid var(--color-hairline-soft); font-size: 13px; }
.table th { background: var(--color-surface-soft); font-weight: 600; }
.mono { font-family: var(--font-mono); font-size: 12px; }
.uuid { cursor: pointer; color: var(--color-primary); }
.uuid:hover { text-decoration: underline; }
.exc { color: var(--color-error); max-width: 320px; }
.detail { background: #fef2f2; }
.detail pre { font-size: 11px; color: #7f1d1d; padding: var(--space-md); margin: 0; max-height: 240px; overflow-y: auto; white-space: pre-wrap; }
.retry { background: var(--color-primary); color: white; border: none; border-radius: var(--radius-sm); padding: 4px 12px; font-size: 12px; cursor: pointer; margin-right: 4px; }
.del { background: var(--color-canvas); color: var(--color-error); border: 1px solid var(--color-error); border-radius: var(--radius-sm); padding: 4px 12px; font-size: 12px; cursor: pointer; }
.danger { background: var(--color-error); color: white; border: none; border-radius: var(--radius-sm); padding: 6px 14px; font-size: 13px; cursor: pointer; }
button:disabled { opacity: 0.5; cursor: not-allowed; }

.search {
  padding: 6px 12px;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-sm);
  font-size: 13px;
  width: 260px;
  background: var(--color-canvas);
}
.search:focus { outline: none; border-color: var(--color-primary); }

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-md);
  padding: var(--space-md) 0;
}
.pager button {
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
  border-radius: var(--radius-sm);
}
.pager button:hover:not(:disabled) { border-color: var(--color-primary); color: var(--color-primary); }
.pager-info { font-size: 13px; color: var(--color-muted); }
.pager-info strong { color: var(--color-text, #111); }
</style>
