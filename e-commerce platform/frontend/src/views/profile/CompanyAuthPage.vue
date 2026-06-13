<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { fetchMyCompany, submitCompany, uploadLicense, type Company } from '@/api/company'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()

const existing = ref<Company | null>(null)
const loading = ref(true)
const submitting = ref(false)
const uploading = ref(false)
const error = ref('')

const form = reactive({
  name: '',
  credit_code: '',
  contact_name: '',
  contact_phone: '',
  license_url: '',
})

onMounted(async () => {
  try {
    const res = await fetchMyCompany()
    existing.value = res.data.company
    if (existing.value) {
      form.name = existing.value.name
      form.credit_code = existing.value.credit_code
      form.contact_name = existing.value.contact_name
      form.contact_phone = existing.value.contact_phone
      form.license_url = existing.value.license_url
    }
  } finally {
    loading.value = false
  }
})

async function onFile(e: Event) {
  const target = e.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return
  const file = target.files[0]
  if (file.size > 10 * 1024 * 1024) {
    error.value = '文件大小不得超过 10MB'
    return
  }
  uploading.value = true
  error.value = ''
  try {
    const res = await uploadLicense(file)
    form.license_url = res.data.url
  } catch (e: any) {
    error.value = e?.response?.data?.message || '上传失败'
  } finally {
    uploading.value = false
  }
}

async function submit() {
  error.value = ''
  if (!form.name) return (error.value = '请输入企业名称')
  if (!/^[0-9A-HJ-NPQRTUWXY]{18}$/i.test(form.credit_code))
    return (error.value = '请输入 18 位统一社会信用代码')
  if (!form.license_url) return (error.value = '请上传营业执照')
  if (!form.contact_name) return (error.value = '请输入联系人')
  if (!/^1[3-9]\d{9}$/.test(form.contact_phone))
    return (error.value = '请输入正确的联系电话')

  submitting.value = true
  try {
    await submitCompany(form)
    await auth.fetchMe()
    router.push({ name: 'profile' })
  } catch (e: any) {
    error.value = e?.response?.data?.message || '提交失败'
  } finally {
    submitting.value = false
  }
}

const isReadOnly = () => existing.value?.status === 'pending' || existing.value?.status === 'approved'
</script>

<template>
  <section class="auth-shell">
    <div class="auth-card wider">
      <h1>企业认证</h1>
      <p class="subtitle">完成后可使用对公转账、增值税专用发票等</p>

      <div v-if="loading" class="loading">载入中…</div>

      <template v-else>
        <p v-if="existing?.status === 'pending'" class="banner warning">
          审核中（提交于 {{ existing.created_at?.slice(0, 16) }}），1 个工作日内完成
        </p>
        <p v-if="existing?.status === 'approved'" class="banner success">
          已通过认证 ✓
        </p>
        <p v-if="existing?.status === 'rejected'" class="banner error">
          上次提交被驳回：{{ existing.reject_reason }}<br/>请修改后重新提交
        </p>

        <label class="field">
          <span>企业名称</span>
          <input v-model.trim="form.name" :disabled="isReadOnly()" placeholder="营业执照上的全称" />
        </label>

        <label class="field">
          <span>统一社会信用代码（18 位）</span>
          <input
            v-model.trim="form.credit_code"
            :disabled="isReadOnly()"
            maxlength="18"
            placeholder="如 91110000600001234X"
          />
        </label>

        <label class="field">
          <span>营业执照</span>
          <div v-if="!isReadOnly()" class="upload-zone">
            <input type="file" accept="image/jpeg,image/png,application/pdf" @change="onFile" />
            <span v-if="uploading" class="status">上传中…</span>
            <span v-else-if="form.license_url" class="status">
              已上传 · <a :href="form.license_url" target="_blank">查看</a>
            </span>
            <span v-else class="status muted">支持 JPG / PNG / PDF，≤ 10MB</span>
          </div>
          <a v-else-if="form.license_url" :href="form.license_url" target="_blank">查看已上传</a>
        </label>

        <div class="row">
          <label class="field" style="flex:1">
            <span>联系人</span>
            <input v-model.trim="form.contact_name" :disabled="isReadOnly()" />
          </label>
          <label class="field" style="flex:1">
            <span>联系电话</span>
            <input v-model.trim="form.contact_phone" :disabled="isReadOnly()" maxlength="11" />
          </label>
        </div>

        <p v-if="error" class="error">{{ error }}</p>

        <div class="actions">
          <button type="button" class="link" @click="router.push({ name: 'profile' })">返回</button>
          <button v-if="!isReadOnly()" class="primary" :disabled="submitting" @click="submit">
            {{ submitting ? '提交中…' : (existing ? '重新提交' : '提交认证') }}
          </button>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.auth-shell {
  min-height: calc(100vh - 80px);
  display: flex;
  justify-content: center;
  padding: var(--space-section) var(--space-base);
  background: var(--color-surface-soft);
}

.auth-card {
  width: 100%;
  max-width: 420px;
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  padding: var(--space-xxl);
}

.auth-card.wider {
  max-width: 560px;
}

h1 {
  font-size: 22px;
  font-weight: 500;
  margin: 0;
}

.subtitle {
  color: var(--color-muted);
  margin: var(--space-xs) 0 var(--space-lg);
  font-size: 14px;
}

.loading {
  text-align: center;
  color: var(--color-muted);
  padding: var(--space-xl) 0;
}

.banner {
  padding: var(--space-md);
  border-radius: var(--radius-sm);
  font-size: 13px;
  line-height: 1.5;
  margin: 0 0 var(--space-base);
}

.banner.success { background: #e7f8ee; color: var(--color-success); }
.banner.warning { background: #fff5e6; color: var(--color-warning); }
.banner.error { background: #fdecec; color: var(--color-error); }

.field {
  display: block;
  margin-bottom: var(--space-base);
}

.field > span {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-ink);
  margin-bottom: var(--space-xs);
}

.field input {
  width: 100%;
  height: 48px;
  padding: 0 14px;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--color-ink);
  background: var(--color-canvas);
  box-sizing: border-box;
}

.field input:disabled {
  background: var(--color-surface-soft);
  color: var(--color-muted);
}

.field input:focus:not(:disabled) {
  outline: none;
  border: 2px solid var(--color-ink);
  padding: 0 13px;
}

.row {
  display: flex;
  gap: var(--space-base);
}

.upload-zone {
  display: flex;
  align-items: center;
  gap: var(--space-base);
  border: 1px dashed var(--color-hairline);
  border-radius: var(--radius-sm);
  padding: var(--space-md);
  background: var(--color-surface-soft);
}

.upload-zone .status {
  font-size: 13px;
}

.upload-zone .status a {
  color: var(--color-primary);
}

.upload-zone .status.muted {
  color: var(--color-muted);
}

.error {
  color: var(--color-error);
  font-size: 13px;
  margin: var(--space-xs) 0;
}

.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--space-lg);
  gap: var(--space-base);
}

.link {
  background: transparent;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  font-size: 14px;
  padding: 0;
}

.primary {
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  padding: 0 32px;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}

.primary:disabled {
  background: var(--color-primary-disabled);
  cursor: not-allowed;
}

.primary:not(:disabled):hover {
  background: var(--color-primary-active);
}
</style>
