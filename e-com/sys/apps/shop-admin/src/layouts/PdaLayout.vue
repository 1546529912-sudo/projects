<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { computed } from 'vue';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const showBack = computed(() => route.path !== '/pda' && route.path !== '/pda/');
const title = computed(() => (route.meta?.pdaTitle as string) || 'PDA');

function back() { router.back(); }
function logout() { auth.logout(); router.push('/pda/login'); }
function home() { router.push('/pda'); }
</script>

<template>
  <div class="pda-shell">
    <header class="pda-header">
      <button v-if="showBack" class="pda-back" @click="back">‹</button>
      <h1 class="pda-title">{{ title }}</h1>
      <button v-if="auth.isLogin && showBack" class="pda-home" @click="home">⌂</button>
      <button v-if="auth.isLogin && !showBack" class="pda-logout" @click="logout">退出</button>
    </header>
    <main class="pda-main">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.pda-shell { display: flex; flex-direction: column; height: 100vh; background: #F7F7F7; }
.pda-header {
  background: #FF385C; color: #FFF;
  height: 56px; padding: 0 12px;
  display: flex; align-items: center; gap: 12px;
  position: sticky; top: 0; z-index: 100;
}
.pda-title { flex: 1; margin: 0; font-size: 18px; font-weight: 600; text-align: center; }
.pda-back, .pda-home, .pda-logout {
  background: rgba(255,255,255,0.15); color: #FFF; border: none;
  height: 36px; min-width: 36px; padding: 0 10px;
  border-radius: 6px; font-size: 18px; cursor: pointer;
}
.pda-logout { font-size: 14px; }
.pda-main { flex: 1; overflow-y: auto; padding: 12px; }
:deep(.pda-card) {
  background: #FFF; border-radius: 8px; padding: 14px;
  margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
:deep(.pda-big-btn) {
  width: 100%; height: 52px; font-size: 17px; font-weight: 600;
  border-radius: 8px; border: none; cursor: pointer;
}
:deep(.pda-input) {
  width: 100%; height: 44px; padding: 0 12px;
  border: 1.5px solid #DDD; border-radius: 8px;
  font-size: 16px; outline: none; box-sizing: border-box;
}
:deep(.pda-input:focus) { border-color: #FF385C; }
</style>
