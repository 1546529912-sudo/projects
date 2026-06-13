<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { pimApi } from '@/apis';
import { ElMessage, ElMessageBox } from 'element-plus';

interface AttrItem { name: string; code: string; type: 'text' | 'select' | 'number'; options?: string[]; sort: number; required: boolean; }

const list = ref<any[]>([]);
const loading = ref(true);

const dialogVisible = ref(false);
const editing = ref<any>(null);
const form = reactive({ code: '', name: '', desc: '', status: 'enabled', attrs: [] as AttrItem[] });

async function load() {
  loading.value = true;
  try {
    const res: any = await pimApi.templateList();
    list.value = res.data?.list || [];
  } catch (e: any) { ElMessage.error(e?.msg || '加载失败'); }
  finally { loading.value = false; }
}

function onCreate() {
  editing.value = null;
  form.code = ''; form.name = ''; form.desc = ''; form.status = 'enabled';
  form.attrs = [{ name: '', code: '', type: 'text', options: [], sort: 1, required: false }];
  dialogVisible.value = true;
}

function onEdit(row: any) {
  editing.value = row;
  form.code = row.code; form.name = row.name; form.desc = row.desc || ''; form.status = row.status;
  form.attrs = (row.attrs || []).map((a: any) => ({
    name: a.name, code: a.code, type: a.type || 'text',
    options: a.options || [], sort: a.sort || 0, required: !!a.required,
  }));
  dialogVisible.value = true;
}

function addAttr() {
  form.attrs.push({ name: '', code: '', type: 'text', options: [], sort: form.attrs.length + 1, required: false });
}
function removeAttr(i: number) { form.attrs.splice(i, 1); }

async function onSave() {
  if (!form.code || !form.name) { ElMessage.warning('code/name 必填'); return; }
  if (!form.attrs.length) { ElMessage.warning('至少 1 项属性'); return; }
  for (const [i, a] of form.attrs.entries()) {
    if (!a.name || !a.code) { ElMessage.warning(`第 ${i + 1} 项 name/code 必填`); return; }
  }
  try {
    if (editing.value) {
      await pimApi.templateUpdate(editing.value.id, { name: form.name, desc: form.desc, status: form.status, attrs: form.attrs });
      ElMessage.success('已更新');
    } else {
      await pimApi.templateCreate({ code: form.code, name: form.name, desc: form.desc, attrs: form.attrs });
      ElMessage.success('已创建');
    }
    dialogVisible.value = false;
    await load();
  } catch (e: any) { ElMessage.error(e?.msg || '保存失败'); }
}

async function onDelete(row: any) {
  try { await ElMessageBox.confirm(`确认删除「${row.name}」？`, '确认', { type: 'warning' }); }
  catch { return; }
  try {
    await pimApi.templateDelete(row.id);
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
        <h2 class="page-title">属性模板</h2>
        <p class="page-desc">PIM /admin/attribute-template · 复用颜色/尺码/材质等结构化属性，SPU 编辑页可一键应用</p>
      </div>
      <div>
        <el-button type="primary" @click="onCreate">新建模板</el-button>
        <el-button @click="load">刷新</el-button>
      </div>
    </div>

    <el-table :data="list" v-loading="loading" stripe border>
      <el-table-column prop="code" label="code" width="180" />
      <el-table-column prop="name" label="名称" width="180" />
      <el-table-column prop="desc" label="描述" min-width="240" />
      <el-table-column label="属性数" width="100">
        <template #default="{ row }">{{ row.attrs?.length || 0 }}</template>
      </el-table-column>
      <el-table-column label="属性预览" min-width="280">
        <template #default="{ row }">
          <el-tag v-for="a in (row.attrs || []).slice(0, 5)" :key="a.code" size="small" style="margin-right:4px;">
            {{ a.name }}<span v-if="a.type==='select'">·选</span><span v-else-if="a.type==='number'">·数</span>
          </el-tag>
          <span v-if="(row.attrs?.length || 0) > 5">…</span>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'enabled' ? 'success' : 'info'" size="small">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="onEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑模板' : '新建模板'" width="720px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="code">
          <el-input v-model="form.code" :disabled="!!editing" placeholder="唯一识别，如 clothing" />
        </el-form-item>
        <el-form-item label="名称"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="form.desc" type="textarea" :rows="2" /></el-form-item>
        <el-form-item v-if="editing" label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="enabled">启用</el-radio>
            <el-radio value="disabled">停用</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-divider>属性项</el-divider>
        <div v-for="(a, i) in form.attrs" :key="i" class="attr-row">
          <el-input v-model="a.name" placeholder="名称（如 颜色）" style="width:140px;" />
          <el-input v-model="a.code" placeholder="code（如 color）" style="width:140px;" />
          <el-select v-model="a.type" style="width:100px;">
            <el-option label="text" value="text" />
            <el-option label="select" value="select" />
            <el-option label="number" value="number" />
          </el-select>
          <el-input v-if="a.type === 'select'" v-model="(a as any).optionsRaw"
            :model-value="(a.options || []).join(',')"
            @update:model-value="(v: string) => a.options = v.split(',').map(s => s.trim()).filter(Boolean)"
            placeholder="选项 红,蓝,黑" style="width:200px;" />
          <el-input-number v-model="a.sort" :min="0" style="width:100px;" />
          <el-checkbox v-model="a.required">必填</el-checkbox>
          <el-button text type="danger" @click="removeAttr(i)">删除</el-button>
        </div>
        <el-button @click="addAttr" size="small">+ 加属性</el-button>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="onSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }
.attr-row { display: flex; gap: 8px; align-items: center; margin-bottom: 10px; }
</style>
