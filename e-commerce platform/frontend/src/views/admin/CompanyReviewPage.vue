<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { adminPendingCompanies, adminReviewCompany, type Company } from '@/api/company'

const items = ref<Company[]>([])
const loading = ref(true)
const reviewing = ref<number | null>(null)
const error = ref('')

async function load() {
  loading.value = true
  try {
    const res = await adminPendingCompanies()
    items.value = res.data.items
  } finally {
    loading.value = false
  }
}

async function approve(id: number) {
  reviewing.value = id
  try {
    await adminReviewCompany(id, 'approve')
    await load()
  } catch (e: any) {
    error.value = e?.response?.data?.message || '审核失败'
  } finally {
    reviewing.value = null
  }
}

async function reject(id: number) {
  const reason = prompt('请输入驳回原因：')
  if (!reason) return
  reviewing.value = id
  try {
    await adminReviewCompany(id, 'reject', reason)
    await load()
  } catch (e: any) {
    error.value = e?.response?.data?.message || '审核失败'
  } finally {
    reviewing.value = null
  }
}

onMounted(load)
</script>

<template>
  <section class="admin">
    <h1>企业认证审核</h1>
    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="loading" class="state loading">载入中…</div>
    <div v-else-if="items.length === 0" class="state empty">暂无待审核条目</div>
    <table v-else class="table">
      <thead>
        <tr>
          <th>提交时间</th>
          <th>企业名称</th>
          <th>统一信用代码</th>
          <th>联系人</th>
          <th>电话</th>
          <th>营业执照</th>
          <th>操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in items" :key="c.id">
          <td>{{ c.created_at.slice(0, 16) }}</td>
          <td>{{ c.name }}</td>
          <td class="mono">{{ c.credit_code }}</td>
          <td>{{ c.contact_name }}</td>
          <td>{{ c.contact_phone }}</td>
          <td>
            <a :href="c.license_url" target="_blank">查看</a>
          </td>
          <td>
            <button
              class="approve"
              :disabled="reviewing === c.id"
              @click="approve(c.id)"
            >通过</button>
            <button
              class="reject"
              :disabled="reviewing === c.id"
              @click="reject(c.id)"
            >驳回</button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.admin {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-xxl) var(--space-lg);
}

h1 {
  font-size: 22px;
  font-weight: 500;
  margin-bottom: var(--space-lg);
}

.state {
  text-align: center;
  padding: var(--space-xxl);
  color: var(--color-muted);
  background: var(--color-surface-soft);
  border-radius: var(--radius-md);
}

.error {
  color: var(--color-error);
  margin-bottom: var(--space-base);
}

.table {
  width: 100%;
  border-collapse: collapse;
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.table th,
.table td {
  padding: var(--space-md);
  text-align: left;
  border-bottom: 1px solid var(--color-hairline-soft);
  font-size: 14px;
}

.table th {
  background: var(--color-surface-soft);
  font-weight: 600;
}

.mono {
  font-family: var(--font-mono);
  font-size: 13px;
}

button.approve,
button.reject {
  border: none;
  border-radius: var(--radius-sm);
  padding: 6px 14px;
  font-size: 13px;
  cursor: pointer;
  margin-right: var(--space-xs);
}

button.approve {
  background: var(--color-success);
  color: white;
}

button.reject {
  background: var(--color-canvas);
  color: var(--color-error);
  border: 1px solid var(--color-error);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
