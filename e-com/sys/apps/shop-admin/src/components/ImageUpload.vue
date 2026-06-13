<script setup lang="ts">
import { computed, ref } from 'vue';
import { pimApi } from '@/apis';
import { ElMessage } from 'element-plus';
import ImagePicker from './ImagePicker.vue';

const props = defineProps<{
  modelValue: string | string[]; // 单图传 string，多图传 string[]
  multiple?: boolean;
  max?: number; // 多图最多张数
  enableLibrary?: boolean; // iter-31: 是否允许"从图片库选"
}>();
const emit = defineEmits<{ (e: 'update:modelValue', val: string | string[]): void }>();

const pickerVisible = ref(false);
function onPickerSelect(urls: string[]) {
  if (props.multiple) {
    const exist = new Set(list.value);
    const merged = [...list.value];
    let skipped = 0;
    for (const u of urls) {
      if (exist.has(u)) { skipped++; continue; }
      if (props.max && merged.length >= props.max) { skipped++; continue; }
      merged.push(u);
    }
    emit('update:modelValue', merged);
    ElMessage.success(`已添加 ${urls.length - skipped} 张${skipped ? `（${skipped} 张重复或超额跳过）` : ''}`);
  } else {
    emit('update:modelValue', urls[0]);
    ElMessage.success('已选择');
  }
}

const list = computed<string[]>(() =>
  props.multiple ? (Array.isArray(props.modelValue) ? props.modelValue : []) : (props.modelValue ? [props.modelValue as string] : [])
);

async function handleSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  try {
    const res: any = await pimApi.uploadImage(file);
    const url = res.data?.url;
    if (!url) {
      ElMessage.error('上传响应无 url');
      return;
    }
    if (props.multiple) {
      const next = [...list.value, url];
      if (props.max && next.length > props.max) {
        ElMessage.warning(`最多 ${props.max} 张`);
        return;
      }
      emit('update:modelValue', next);
    } else {
      emit('update:modelValue', url);
    }
    ElMessage.success('上传成功');
  } catch (err: any) {
    ElMessage.error(err?.msg || '上传失败');
  } finally {
    input.value = '';
  }
}

function removeAt(idx: number) {
  if (props.multiple) {
    const next = [...list.value];
    next.splice(idx, 1);
    emit('update:modelValue', next);
  } else {
    emit('update:modelValue', '');
  }
}
</script>

<template>
  <div class="image-upload">
    <div class="thumbs">
      <div v-for="(url, idx) in list" :key="url" class="thumb">
        <img :src="url" :alt="`img-${idx}`" />
        <span class="remove" @click="removeAt(idx)">×</span>
      </div>
      <label class="picker" v-if="!list.length || (multiple && (!max || list.length < max))">
        <input type="file" accept="image/*" @change="handleSelect" hidden />
        <span>+ 上传</span>
      </label>
      <div
        v-if="enableLibrary && (!list.length || (multiple && (!max || list.length < max)))"
        class="picker picker-lib"
        @click="pickerVisible = true"
      >
        <span>从图片库</span>
      </div>
    </div>
    <p class="hint">jpg / png / gif / webp，单张 ≤ 5MB<span v-if="enableLibrary"> · 也可从已上传图片库直接复用</span></p>

    <ImagePicker
      v-if="enableLibrary"
      v-model="pickerVisible"
      :multiple="multiple"
      :max="max ? (max - list.length) : undefined"
      @select="onPickerSelect"
    />
  </div>
</template>

<style scoped>
.thumbs { display: flex; flex-wrap: wrap; gap: 12px; }
.thumb { position: relative; width: 100px; height: 100px; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; }
.thumb img { width: 100%; height: 100%; object-fit: cover; }
.remove {
  position: absolute; top: 2px; right: 2px;
  width: 20px; height: 20px; line-height: 18px; text-align: center;
  background: rgba(0,0,0,.5); color: #fff; border-radius: 50%; cursor: pointer;
  font-size: 14px;
}
.picker {
  display: flex; align-items: center; justify-content: center;
  width: 100px; height: 100px; border: 1px dashed #ddd; border-radius: 4px;
  cursor: pointer; color: #999; font-size: 13px;
}
.picker:hover { color: #FF385C; border-color: #FF385C; }
.picker-lib { color: #FF385C; border-color: #FF385C66; background: #FFF0F3; }
.picker-lib:hover { background: #FFE3EA; }
.hint { margin: 8px 0 0; font-size: 12px; color: #999; }
</style>
