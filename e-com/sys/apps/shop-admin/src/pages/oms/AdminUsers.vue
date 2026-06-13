<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { omsApi } from '@/apis';
import { ElMessage, ElMessageBox } from 'element-plus';

const list = ref<any[]>([]);
const total = ref(0);
const loading = ref(true);
const page = ref(1);
const size = ref(20);

// 新增 / 编辑 dialog
const editVisible = ref(false);
const editMode = ref<'create' | 'update'>('create');
const submitting = ref(false);
const form = reactive({
  id: 0, username: '', password: '', name: '', role: 'sales_ops', status: 'enabled',
});

const ROLE_LABEL: Record<string, string> = {
  super_admin: '超级管理员',
  warehouse: '仓管',
  sales_ops: '销售运营',
};

async function load() {
  loading.value = true;
  try {
    const res: any = await omsApi.adminUserList({ page: page.value, size: size.value });
    list.value = res.data?.list || [];
    total.value = res.data?.total || 0;
  } catch (e: any) {
    ElMessage.error(e?.msg || '加载失败');
  } finally { loading.value = false; }
}

function onAdd() {
  editMode.value = 'create';
  Object.assign(form, { id: 0, username: '', password: '', name: '', role: 'sales_ops', status: 'enabled' });
  editVisible.value = true;
}

function onEdit(row: any) {
  editMode.value = 'update';
  Object.assign(form, { id: row.id, username: row.username, password: '', name: row.name, role: row.role, status: row.status });
  editVisible.value = true;
}

async function onSubmit() {
  if (editMode.value === 'create') {
    if (!form.username || !form.password) { ElMessage.warning('用户名 + 密码必填'); return; }
    if (form.password.length < 6) { ElMessage.warning('密码至少 6 位'); return; }
  }
  submitting.value = true;
  try {
    if (editMode.value === 'create') {
      await omsApi.adminUserCreate({ username: form.username, password: form.password, name: form.name || form.username, role: form.role });
      ElMessage.success('已新增');
    } else {
      await omsApi.adminUserUpdate(form.id, { name: form.name, role: form.role, status: form.status });
      ElMessage.success('已更新');
    }
    editVisible.value = false;
    await load();
  } catch (e: any) {
    ElMessage.error(e?.msg || '操作失败');
  } finally { submitting.value = false; }
}

async function onChangePassword(row: any) {
  try {
    const { value } = await ElMessageBox.prompt(`修改 ${row.username} 的密码`, '改密', {
      inputType: 'password',
      inputPlaceholder: '新密码（≥ 6 位）',
      inputValidator: v => (!!v && v.length >= 6) || '至少 6 位',
    });
    await omsApi.adminUserChangePassword(row.id, value);
    ElMessage.success('密码已修改');
  } catch { return; }
}

async function onDelete(row: any) {
  try {
    await ElMessageBox.confirm(`删除 ${row.username}（${ROLE_LABEL[row.role]}）？`, '确认', { type: 'warning' });
  } catch { return; }
  try {
    await omsApi.adminUserDelete(row.id);
    ElMessage.success('已删除');
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '删除失败'); }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">管理员用户</h2>
        <p class="page-desc">OMS /api/v1/admin/user · 仅 super_admin 可访问</p>
      </div>
      <div>
        <el-button type="primary" @click="onAdd">新增管理员</el-button>
        <el-button @click="load">刷新</el-button>
      </div>
    </div>

    <el-table :data="list" v-loading="loading" stripe border>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="username" label="账号" width="160" />
      <el-table-column prop="name" label="姓名" width="160" />
      <el-table-column label="角色" width="140">
        <template #default="{ row }">{{ ROLE_LABEL[row.role] || row.role }}</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100" />
      <el-table-column prop="last_login_at" label="最近登录" width="180" />
      <el-table-column prop="created_at" label="创建时间" width="180" />
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="onEdit(row)">编辑</el-button>
          <el-button size="small" type="warning" @click="onChangePassword(row)">改密</el-button>
          <el-button size="small" type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="page"
      v-model:page-size="size"
      :total="total"
      :page-sizes="[10, 20, 50]"
      layout="total, sizes, prev, pager, next"
      style="margin-top:16px;justify-content:flex-end;"
      @current-change="load"
      @size-change="load"
    />

    <el-dialog v-model="editVisible" :title="editMode === 'create' ? '新增管理员' : '编辑管理员'" width="500px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="账号" required>
          <el-input v-model="form.username" :disabled="editMode === 'update'" placeholder="字母数字下划线" />
        </el-form-item>
        <el-form-item v-if="editMode === 'create'" label="密码" required>
          <el-input v-model="form.password" type="password" show-password placeholder="≥ 6 位" />
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="form.name" placeholder="展示名" />
        </el-form-item>
        <el-form-item label="角色" required>
          <el-select v-model="form.role" style="width:100%;">
            <el-option label="super_admin 超级管理员" value="super_admin" />
            <el-option label="warehouse 仓管" value="warehouse" />
            <el-option label="sales_ops 销售运营" value="sales_ops" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="editMode === 'update'" label="状态">
          <el-select v-model="form.status" style="width:100%;">
            <el-option label="enabled 启用" value="enabled" />
            <el-option label="disabled 禁用" value="disabled" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmit">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }
</style>
