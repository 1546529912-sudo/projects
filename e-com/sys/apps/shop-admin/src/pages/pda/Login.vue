<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { omsApi } from '@/apis';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const auth = useAuthStore();
const username = ref('warehouse');
const password = ref('');
const loading = ref(false);
const errMsg = ref('');

async function onLogin() {
  if (!username.value || !password.value) { errMsg.value = '请填用户名和密码'; return; }
  loading.value = true; errMsg.value = '';
  try {
    const res: any = await omsApi.adminLogin({ username: username.value, password: password.value });
    const data = res?.data || {};
    auth.login(data.token, { username: data.username, name: data.name, role: data.role });
    router.replace('/pda');
  } catch (e: any) {
    errMsg.value = e?.msg || e?.message || '登录失败';
  } finally { loading.value = false; }
}
</script>

<template>
  <div class="login">
    <div class="brand">📦 WMS PDA</div>
    <div class="form">
      <input class="pda-input" v-model="username" placeholder="用户名" autocomplete="username" />
      <input class="pda-input" v-model="password" type="password" placeholder="密码" autocomplete="current-password" @keyup.enter="onLogin" />
      <button class="pda-big-btn primary" :disabled="loading" @click="onLogin">{{ loading ? '登录中…' : '登 录' }}</button>
      <p v-if="errMsg" class="err">{{ errMsg }}</p>
      <p class="tip">仓库账号：warehouse / wh123</p>
    </div>
  </div>
</template>

<style scoped>
.login { display: flex; flex-direction: column; align-items: center; padding-top: 60px; }
.brand { font-size: 24px; font-weight: 700; color: #FF385C; margin-bottom: 32px; }
.form { width: 100%; max-width: 320px; display: flex; flex-direction: column; gap: 14px; }
.primary { background: #FF385C; color: #FFF; }
.primary:disabled { background: #FFB4C2; }
.err { color: #F56C6C; text-align: center; margin: 4px 0 0; }
.tip { color: #999; text-align: center; font-size: 12px; margin: 0; }
</style>
