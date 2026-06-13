<script setup lang="ts">
import { onMounted, reactive, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  adminCreateProduct,
  adminGetProduct,
  adminUpdateProduct,
  type AdminProductPayload,
} from '@/api/product'
import { listCategories, type Category } from '@/api/category'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => !!route.params.id)
const productId = computed(() => Number(route.params.id))

const categories = ref<Category[]>([])
const loading = ref(true)
const submitting = ref(false)
const error = ref('')

const form = reactive<AdminProductPayload>({
  category_id: 0,
  name: '',
  model: '',
  keywords: '',
  main_image_url: '',
  description: '',
  status: 'active',
  base_price: 0,
  stock: 0,
  stock_threshold: 10,
})

onMounted(async () => {
  try {
    const c = await listCategories()
    categories.value = c.data
    if (categories.value.length > 0 && !form.category_id) {
      form.category_id = categories.value[0].id
    }
    if (isEdit.value) {
      const p = await adminGetProduct(productId.value)
      Object.assign(form, {
        category_id: p.data.product.category_id,
        name: p.data.product.name,
        model: p.data.product.model,
        keywords: p.data.product.keywords ?? '',
        main_image_url: p.data.product.main_image_url ?? '',
        description: p.data.product.description ?? '',
        status: p.data.product.status,
        base_price: Number(p.data.product.base_price ?? 0),
        stock: p.data.product.stock ?? 0,
        stock_threshold: p.data.product.stock_threshold ?? 10,
      })
    }
  } finally {
    loading.value = false
  }
})

async function submit() {
  error.value = ''
  if (!form.name) return (error.value = '请输入商品名称')
  if (!form.model) return (error.value = '请输入型号')
  if (!form.category_id) return (error.value = '请选择分类')
  if (Number(form.base_price) < 0) return (error.value = '价格不能为负')
  if (Number(form.stock) < 0) return (error.value = '库存不能为负')

  submitting.value = true
  try {
    if (isEdit.value) {
      await adminUpdateProduct(productId.value, form)
    } else {
      await adminCreateProduct(form)
    }
    router.push({ name: 'admin-products' })
  } catch (e: any) {
    error.value = e?.response?.data?.message || '保存失败'
    if (e?.response?.data?.errors) {
      error.value = Object.values(e.response.data.errors).flat().join('；')
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="admin-form">
    <header>
      <h1>{{ isEdit ? '编辑商品' : '新建商品' }}</h1>
      <button class="link" @click="router.push({ name: 'admin-products' })">← 返回列表</button>
    </header>

    <div v-if="loading" class="state">载入中…</div>

    <form v-else class="form" @submit.prevent="submit">
      <div class="row">
        <label class="field">
          <span>商品分类 *</span>
          <select v-model.number="form.category_id">
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </label>
        <label class="field">
          <span>状态</span>
          <select v-model="form.status">
            <option value="active">上架</option>
            <option value="draft">草稿</option>
            <option value="inactive">下架</option>
          </select>
        </label>
      </div>

      <label class="field">
        <span>商品名称 *</span>
        <input v-model.trim="form.name" placeholder="如：T700 标准型碳纤维板 3MM" />
      </label>

      <label class="field">
        <span>型号 *（唯一）</span>
        <input v-model.trim="form.model" placeholder="如：CF-T700-3MM" />
      </label>

      <label class="field">
        <span>搜索关键词（英文逗号分隔）</span>
        <input v-model.trim="form.keywords" placeholder="如：T700,碳纤维板,3mm" />
      </label>

      <label class="field">
        <span>主图 URL（暂用外链）</span>
        <input v-model.trim="form.main_image_url" placeholder="https://..." />
        <small>iter-3 简化版：第一期仅支持外链；iter-4 接 OSS 上传</small>
      </label>

      <div class="row">
        <label class="field">
          <span>单价（元）*</span>
          <input type="number" step="0.01" min="0" v-model.number="form.base_price" />
        </label>
        <label class="field">
          <span>库存 *</span>
          <input type="number" step="1" min="0" v-model.number="form.stock" />
        </label>
        <label class="field">
          <span>低库存阈值</span>
          <input type="number" step="1" min="0" v-model.number="form.stock_threshold" />
          <small>库存降到此值或以下时触发预警 + Webhook</small>
        </label>
      </div>

      <label class="field">
        <span>商品描述</span>
        <textarea v-model="form.description" rows="5"></textarea>
      </label>

      <p v-if="error" class="error">{{ error }}</p>

      <div class="actions">
        <button type="button" class="ghost" @click="router.push({ name: 'admin-products' })">取消</button>
        <button class="primary" :disabled="submitting">
          {{ submitting ? '保存中…' : (isEdit ? '保存修改' : '创建商品') }}
        </button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.admin-form {
  max-width: 720px;
  margin: 0 auto;
  padding: var(--space-xl) var(--space-lg);
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-lg);
}

h1 {
  font-size: 22px;
  font-weight: 500;
  margin: 0;
}

.link {
  background: transparent;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
  font-size: 14px;
}

.state {
  text-align: center;
  padding: var(--space-xxl);
  color: var(--color-muted);
}

.form {
  background: var(--color-canvas);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-md);
  padding: var(--space-xl);
}

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

.field input,
.field select,
.field textarea {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-sm);
  font-size: 14px;
  color: var(--color-ink);
  background: var(--color-canvas);
  box-sizing: border-box;
  font-family: inherit;
}

.field input:focus,
.field select:focus,
.field textarea:focus {
  outline: none;
  border: 2px solid var(--color-ink);
  padding: 11px 13px;
}

.field textarea {
  resize: vertical;
}

.field small {
  display: block;
  margin-top: var(--space-xs);
  color: var(--color-muted);
  font-size: 12px;
}

.row {
  display: flex;
  gap: var(--space-base);
}

.row .field {
  flex: 1;
}

.error {
  color: var(--color-error);
  font-size: 13px;
  margin: 0 0 var(--space-base);
  padding: var(--space-sm);
  background: #fdecec;
  border-radius: var(--radius-sm);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-base);
  margin-top: var(--space-lg);
}

.primary, .ghost {
  height: 44px;
  padding: 0 24px;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.primary {
  background: var(--color-primary);
  color: white;
  border: none;
}

.primary:hover { background: var(--color-primary-active); }
.primary:disabled { background: var(--color-primary-disabled); cursor: not-allowed; }

.ghost {
  background: var(--color-canvas);
  color: var(--color-ink);
  border: 1px solid var(--color-hairline);
}
</style>
