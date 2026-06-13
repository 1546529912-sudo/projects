<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { pimApi } from '@/apis';
import { ElMessage, ElMessageBox } from 'element-plus';
import StatusTag from '@/components/StatusTag.vue';
import ImageUpload from '@/components/ImageUpload.vue';

const list = ref<any[]>([]);
const loading = ref(true);
const dialogVisible = ref(false);
const isEdit = ref(false);
const submitting = ref(false);
const form = reactive({
  id: 0,
  code: '',
  name: '',
  logo_url: '',
  desc: '',
  sort: 0,
  status: 'enabled',
});

async function load() {
  loading.value = true;
  try {
    const res: any = await pimApi.brandList();
    list.value = res.data?.list || [];
  } catch (e: any) {
    ElMessage.error(e?.msg || '加载失败');
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  Object.assign(form, { id: 0, code: '', name: '', logo_url: '', desc: '', sort: 0, status: 'enabled' });
}

function onAdd() { resetForm(); isEdit.value = false; dialogVisible.value = true; }

function onEdit(row: any) {
  Object.assign(form, {
    id: row.id, code: row.code, name: row.name,
    logo_url: row.logo_url || '', desc: row.desc || '',
    sort: row.sort || 0, status: row.status || 'enabled',
  });
  isEdit.value = true;
  dialogVisible.value = true;
}

async function onSubmit() {
  if (!form.code || !form.name) {
    ElMessage.warning('code 和 name 必填');
    return;
  }
  submitting.value = true;
  try {
    if (isEdit.value) {
      await pimApi.brandUpdate(form.id, {
        name: form.name, logo_url: form.logo_url, desc: form.desc, sort: form.sort, status: form.status,
      });
      ElMessage.success('已更新');
    } else {
      await pimApi.brandCreate({
        code: form.code, name: form.name, logo_url: form.logo_url, desc: form.desc, sort: form.sort,
      });
      ElMessage.success('已创建');
    }
    dialogVisible.value = false;
    await load();
  } catch (e: any) {
    ElMessage.error(e?.msg || '操作失败');
  } finally {
    submitting.value = false;
  }
}

async function onDelete(row: any) {
  try {
    await ElMessageBox.confirm(`确认删除品牌「${row.name}」？`, '确认', { type: 'warning' });
  } catch { return; }
  try {
    await pimApi.brandDelete(row.id);
    ElMessage.success('已删除');
    await load();
  } catch (e: any) {
    ElMessage.error(e?.msg || '删除失败');
  }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">品牌管理</h2>
        <p class="page-desc">PIM /api/v1/brand 增删改查</p>
      </div>
      <div>
        <el-button type="primary" @click="onAdd">新增品牌</el-button>
        <el-button @click="load">刷新</el-button>
      </div>
    </div>

    <el-table :data="list" v-loading="loading" stripe border>
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="code" label="编码" width="140" />
      <el-table-column prop="name" label="名称" width="200" />
      <el-table-column label="Logo" width="80">
        <template #default="{ row }">
          <img v-if="row.logo_url" :src="row.logo_url" style="width:40px;height:40px;object-fit:cover;border-radius:4px;" />
          <span v-else style="color:#bbb;font-size:12px;">无</span>
        </template>
      </el-table-column>
      <el-table-column prop="desc" label="描述" />
      <el-table-column prop="sort" label="排序" width="80" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }"><StatusTag :status="row.status" /></template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="onEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑品牌' : '新增品牌'" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="code" required>
          <el-input v-model="form.code" :disabled="isEdit" placeholder="如 B-APPLE" />
        </el-form-item>
        <el-form-item label="name" required>
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="Logo">
          <ImageUpload v-model="form.logo_url" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.desc" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" />
        </el-form-item>
        <el-form-item label="状态" v-if="isEdit">
          <el-radio-group v-model="form.status">
            <el-radio value="enabled">启用</el-radio>
            <el-radio value="disabled">停用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmit">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }
</style>
