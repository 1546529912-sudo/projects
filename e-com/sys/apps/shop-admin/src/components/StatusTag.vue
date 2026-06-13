<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ status: string }>();

const STATUS_MAP: Record<string, { label: string; type: 'success' | 'warning' | 'info' | 'danger' | 'primary' }> = {
  // OMS 订单
  pending_pay: { label: '待支付', type: 'warning' },
  paid:        { label: '已支付', type: 'primary' },
  picking:     { label: '拣货中', type: 'primary' },
  shipped:     { label: '已发货', type: 'info' },
  completed:   { label: '已完成', type: 'success' },
  cancelled:   { label: '已取消', type: 'info' },
  exception:   { label: '异常',  type: 'danger' },
  // WMS 出库
  pending_alloc: { label: '待分配', type: 'warning' },
  allocated:     { label: '已分配', type: 'primary' },
  picked:        { label: '已拣货', type: 'primary' },
  reviewed:      { label: '已复核', type: 'primary' },
  packed:        { label: '已装箱', type: 'primary' },
  shortage:      { label: '短拣',  type: 'danger' },
  // 通用
  enabled:    { label: '启用', type: 'success' },
  disabled:   { label: '禁用', type: 'info' },
  draft:      { label: '草稿', type: 'info' },
  published:  { label: '已发布', type: 'success' },
  offline:    { label: '已下架', type: 'info' },
  active:     { label: '正常', type: 'success' },
  // WMS 库位状态
  available:  { label: '可用', type: 'success' },
  occupied:   { label: '占用', type: 'warning' },
  locked:     { label: '锁定', type: 'warning' },
  normal:     { label: '正常', type: 'success' },
  // OMS picking 单
  sent:    { label: '已下发', type: 'primary' },
  accepted:{ label: '已受理', type: 'primary' },
  failed:  { label: '失败',  type: 'danger' },
};

const tag = computed(() => STATUS_MAP[props.status] || { label: props.status || '-', type: 'info' });
</script>

<template>
  <el-tag :type="tag.type" size="small">{{ tag.label }}</el-tag>
</template>
