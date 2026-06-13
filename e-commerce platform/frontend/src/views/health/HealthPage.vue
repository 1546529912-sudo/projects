<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getHealth, type HealthData } from '@/api/health'

const loading = ref(true)
const error = ref<string | null>(null)
const data = ref<HealthData | null>(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const res = await getHealth()
    data.value = res.data
  } catch (e: any) {
    error.value = e?.message ?? '健康检查接口不可达'
  } finally {
    loading.value = false
  }
}

onMounted(load)

function statusLabel(ok: boolean) {
  return ok ? '✅ 正常' : '❌ 异常'
}
</script>

<template>
  <section class="health">
    <h1>系统健康状态</h1>

    <div v-if="loading" class="state loading">检测中...</div>

    <div v-else-if="error" class="state error">
      <p>{{ error }}</p>
      <button @click="load">重试</button>
    </div>

    <div v-else-if="data" class="status-card">
      <div class="meta">
        <p><strong>服务：</strong>{{ data.service }}</p>
        <p><strong>版本：</strong>{{ data.version }}</p>
        <p><strong>时间：</strong>{{ data.timestamp }}</p>
      </div>

      <table class="checks">
        <thead>
          <tr><th>组件</th><th>状态</th><th>详情</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>MySQL</td>
            <td>{{ statusLabel(data.checks.mysql.ok) }}</td>
            <td>{{ data.checks.mysql.error ?? '-' }}</td>
          </tr>
          <tr>
            <td>Redis</td>
            <td>{{ statusLabel(data.checks.redis.ok) }}</td>
            <td>{{ data.checks.redis.error ?? '-' }}</td>
          </tr>
          <tr>
            <td>AI 服务 (FastAPI)</td>
            <td>{{ statusLabel(data.checks.ai_service.ok) }}</td>
            <td>{{ data.checks.ai_service.error ?? data.checks.ai_service.remote ?? '-' }}</td>
          </tr>
        </tbody>
      </table>

      <button @click="load">刷新</button>
    </div>
  </section>
</template>

<style scoped>
.health {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-xxl);
}

h1 {
  font-size: 22px;
  font-weight: 500;
  margin-bottom: var(--space-lg);
}

.state {
  padding: var(--space-lg);
  border-radius: var(--radius-md);
  text-align: center;
}

.state.loading {
  background: var(--color-surface-soft);
  color: var(--color-muted);
}

.state.error {
  background: #fff4f4;
  color: var(--color-error);
}

.status-card {
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  padding: var(--space-lg);
}

.meta p {
  margin: var(--space-xs) 0;
  color: var(--color-body);
}

.checks {
  width: 100%;
  border-collapse: collapse;
  margin-top: var(--space-lg);
}

.checks th, .checks td {
  text-align: left;
  padding: var(--space-md);
  border-bottom: 1px solid var(--color-hairline-soft);
}

button {
  margin-top: var(--space-lg);
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  padding: 12px 24px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
}

button:hover {
  background: var(--color-primary-active);
}
</style>
