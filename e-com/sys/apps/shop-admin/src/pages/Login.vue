<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { post } from '@/apis/http';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const auth = useAuthStore();
const form = ref({
  username: 'admin',
  password: 'admin123',
});
const loading = ref(false);

async function onLogin() {
  if (!form.value.username || !form.value.password) {
    ElMessage.warning('请输入账号和密码');
    return;
  }
  loading.value = true;
  try {
    const res: any = await post('/api/oms/admin/login', {
      username: form.value.username,
      password: form.value.password,
    });
    const data = res.data;
    auth.login(data.token, data.user);
    ElMessage.success('登录成功');
    router.push('/dashboard');
  } catch (e: any) {
    ElMessage.error(e?.msg || '登录失败');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-box">
      <h1 class="title">电商商城 · 商家后台</h1>
      <p class="subtitle">默认账号：admin / admin123（管理员）· warehouse / wh123（仓管）· sales / sales123（销售运营）</p>
      <el-form @submit.prevent="onLogin">
        <el-form-item>
          <el-input v-model="form.username" placeholder="账号" size="large" />
        </el-form-item>
        <el-form-item>
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            size="large"
            show-password
            @keyup.enter="onLogin"
          />
        </el-form-item>
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            class="login-btn"
            :loading="loading"
            @click="onLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #FFE9EE 0%, #F7F7F7 100%);
}
.login-box {
  background: #FFFFFF;
  padding: 48px 56px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  width: 400px;
}
.title {
  text-align: center;
  margin: 0 0 8px;
  color: #222222;
  font-size: 22px;
}
.subtitle {
  text-align: center;
  color: #717171;
  font-size: 12px;
  margin: 0 0 32px;
}
.login-btn {
  width: 100%;
  background: #FF385C;
  border-color: #FF385C;
}
.login-btn:hover {
  background: #E31C5F;
  border-color: #E31C5F;
}
</style>
