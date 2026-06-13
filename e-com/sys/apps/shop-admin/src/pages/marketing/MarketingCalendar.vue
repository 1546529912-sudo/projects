<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { omsApi } from '@/apis';
import { ElMessage } from 'element-plus';

const TYPE_META: Record<string, { label: string; color: string; type: any }> = {
  banner: { label: 'Banner', color: '#36A2EB', type: 'primary' },
  featured: { label: '推荐位', color: '#67C23A', type: 'success' },
  topic: { label: '专题', color: '#FF385C', type: 'danger' },
  coupon: { label: '优惠券', color: '#E6A23C', type: 'warning' },
};

const loading = ref(true);
const dateRange = ref<[Date, Date]>([
  new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59),
]);
const events = ref<any[]>([]);
const conflicts = ref<any[]>([]);
const filterType = ref('');
const view = ref<'table' | 'gantt'>('table'); // iter-60 Q41-02 视图切换

function fmtDate(d: Date): string {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

async function load() {
  loading.value = true;
  try {
    const res: any = await omsApi.marketingCalendar({
      start: fmtDate(dateRange.value[0]),
      end: fmtDate(dateRange.value[1]),
    });
    events.value = res.data?.events || [];
    conflicts.value = res.data?.conflicts || [];
  } catch (e: any) { ElMessage.error(e?.msg || '加载失败'); }
  finally { loading.value = false; }
}

const filtered = computed(() =>
  filterType.value ? events.value.filter(e => e.type === filterType.value) : events.value
);

const typeCounts = computed(() => {
  const m: Record<string, number> = {};
  for (const e of events.value) m[e.type] = (m[e.type] || 0) + 1;
  return m;
});

// iter-60 Q41-02 — Gantt 计算位置
const rangeMs = computed(() => {
  const s = dateRange.value[0].getTime();
  const e = dateRange.value[1].getTime();
  return { s, e, span: Math.max(1, e - s) };
});

function ganttStyle(ev: any): Record<string, string> {
  const { s, e, span } = rangeMs.value;
  const evStart = ev.start ? new Date(ev.start).getTime() : s;
  const evEnd = ev.end ? new Date(ev.end).getTime() : e;
  const left = Math.max(0, ((evStart - s) / span) * 100);
  const right = Math.min(100, ((evEnd - s) / span) * 100);
  const width = Math.max(0.5, right - left);
  return {
    left: `${left.toFixed(2)}%`,
    width: `${width.toFixed(2)}%`,
    background: TYPE_META[ev.type]?.color || '#999',
  };
}

const dayTicks = computed(() => {
  const { s, span } = rangeMs.value;
  const days = Math.ceil(span / 86400000);
  const out: { label: string; left: string }[] = [];
  const step = days <= 31 ? 1 : days <= 90 ? 7 : 30;
  for (let i = 0; i <= days; i += step) {
    const d = new Date(s + i * 86400000);
    out.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, left: `${(i / days * 100).toFixed(2)}%` });
  }
  return out;
});

onMounted(load);
</script>

<template>
  <div>
    <div class="page-head">
      <div>
        <h2 class="page-title">营销日历</h2>
        <p class="page-desc">OMS /admin/marketing-calendar · iter-60 Gantt 视图 + 冲突预警</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <el-radio-group v-model="view" size="small">
          <el-radio-button value="table">📋 表格</el-radio-button>
          <el-radio-button value="gantt">📊 甘特图</el-radio-button>
        </el-radio-group>
        <el-date-picker
          v-model="dateRange"
          type="datetimerange"
          range-separator="→"
          start-placeholder="开始"
          end-placeholder="结束"
          value-format="YYYY-MM-DD HH:mm:ss"
          style="width:380px;"
          @change="load"
        />
        <el-button @click="load">刷新</el-button>
      </div>
    </div>

    <div class="legend-row">
      <el-tag
        v-for="(meta, key) in TYPE_META" :key="key"
        :type="meta.type" size="small"
        :effect="filterType === key ? 'dark' : 'plain'"
        @click="filterType = filterType === key ? '' : key"
        style="cursor: pointer; margin-right: 8px;"
      >
        {{ meta.label }}: {{ typeCounts[key] || 0 }}
      </el-tag>
      <el-button v-if="filterType" size="small" text @click="filterType = ''">清除筛选</el-button>
    </div>

    <!-- iter-60 Q41-04 冲突预警条 -->
    <el-alert
      v-if="conflicts.length"
      type="warning" show-icon :closable="false"
      style="margin-bottom: 12px;"
      :title="`⚠️ 发现 ${conflicts.length} 处 banner 同位置时间段冲突`"
    >
      <template #default>
        <div v-for="(c, idx) in conflicts" :key="idx" style="font-size:13px;">
          位置 <b>{{ c.position }}</b> — Banner #{{ c.a }} 与 #{{ c.b }} 时间重叠
        </div>
      </template>
    </el-alert>

    <!-- 表格视图 -->
    <el-table v-if="view === 'table'" :data="filtered" v-loading="loading" stripe border :row-class-name="(r: any) => r.row.conflict ? 'conflict-row' : ''">
      <el-table-column label="类型" width="100">
        <template #default="{ row }">
          <el-tag :type="TYPE_META[row.type]?.type || 'info'" size="small">
            {{ TYPE_META[row.type]?.label || row.type }}
          </el-tag>
          <el-tag v-if="row.conflict" type="danger" size="small" effect="dark" style="margin-left:4px;">⚠️</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="名称" min-width="300" />
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.status === 'enabled' ? 'success' : 'info'" size="small">
            {{ row.status === 'enabled' ? '启用' : '停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="开始" width="180">
        <template #default="{ row }">{{ row.start || '不限' }}</template>
      </el-table-column>
      <el-table-column label="结束" width="180">
        <template #default="{ row }">{{ row.end || '不限' }}</template>
      </el-table-column>
      <el-table-column label="时间条" min-width="240">
        <template #default="{ row }">
          <div class="time-bar" :style="{ background: TYPE_META[row.type]?.color || '#999' }" :title="`${row.start || '不限'} → ${row.end || '不限'}`"></div>
        </template>
      </el-table-column>
    </el-table>

    <!-- iter-60 Q41-02 — 甘特图视图 -->
    <div v-else class="gantt" v-loading="loading">
      <div class="gantt-head">
        <div v-for="t in dayTicks" :key="t.label" class="gantt-tick" :style="{ left: t.left }">{{ t.label }}</div>
      </div>
      <div v-for="ev in filtered" :key="ev.type + ev.id" class="gantt-row" :class="{ 'gantt-conflict': ev.conflict }">
        <div class="gantt-label">
          <el-tag :type="TYPE_META[ev.type]?.type" size="small" effect="plain">{{ TYPE_META[ev.type]?.label }}</el-tag>
          <span style="margin-left: 6px;">{{ ev.name }}</span>
          <el-tag v-if="ev.conflict" type="danger" size="small" effect="dark" style="margin-left:4px;">⚠️</el-tag>
        </div>
        <div class="gantt-track">
          <div class="gantt-bar" :style="ganttStyle(ev)" :title="`${ev.start || '不限'} → ${ev.end || '不限'}`"></div>
        </div>
      </div>
      <div v-if="!filtered.length" class="hint">无事件</div>
    </div>

    <div class="hint" v-if="view === 'table' && !loading && !filtered.length">该时间段内无事件 — 试试调宽时间范围或新建活动</div>
  </div>
</template>

<style scoped>
.page-head { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
.page-title { margin: 0 0 4px; }
.page-desc { color: #717171; margin: 0; font-size: 13px; }
.legend-row { padding: 12px 16px; background: #F7F7F7; border-radius: 6px; margin-bottom: 12px; }
.time-bar { display: inline-block; width: 100%; height: 14px; border-radius: 7px; }
.hint { text-align: center; color: #999; padding: 40px 0; }
:deep(.conflict-row) { background: #FEF0F0 !important; }
.gantt { background: #fff; border: 1px solid #EBEEF5; border-radius: 6px; }
.gantt-head { position: relative; height: 28px; border-bottom: 1px solid #EBEEF5; background: #FAFAFA; }
.gantt-tick { position: absolute; top: 6px; font-size: 11px; color: #909399; transform: translateX(-50%); }
.gantt-row { display: flex; align-items: center; min-height: 36px; border-bottom: 1px dashed #F2F2F2; }
.gantt-row.gantt-conflict { background: #FEF0F0; }
.gantt-label { width: 280px; padding: 6px 12px; font-size: 13px; flex-shrink: 0; word-break: break-all; }
.gantt-track { flex: 1; position: relative; height: 24px; background: #FAFAFA; margin-right: 12px; border-radius: 3px; }
.gantt-bar { position: absolute; top: 4px; height: 16px; border-radius: 3px; opacity: 0.85; }
</style>
