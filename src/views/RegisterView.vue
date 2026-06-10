<template>
  <div class="auth-container">
    <div class="auth-card">
      <h2>Регистрация</h2>
      
      <form @submit.prevent="register">
        <div class="form-group">
          <label>Email</label>
          <input v-model="email" type="email" required placeholder="your@email.com" />
        </div>
        
        <div class="form-group">
          <label>Никнейм</label>
          <input v-model="nickname" type="text" required minlength="2" maxlength="50" placeholder="Ваш ник" />
        </div>
        
        <div class="form-group">
          <label>Пароль</label>
          <input v-model="password" type="password" required minlength="6" placeholder="Минимум 6 символов" />
        </div>
        
        <div v-if="error" class="error">{{ error }}</div>
        
        <button type="submit" class="btn-submit" :disabled="loading">
          {{ loading ? 'Регистрация...' : 'Зарегистрироваться' }}
        </button>
      </form>
      
      <p class="switch-auth">
        Уже есть аккаунт? 
        <router-link to="/login">Войти</router-link>
      </p>
      
      <button class="btn-back" @click="$router.push('/')">← На главную</button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, setToken, setCurrentUser } from '../api'
import { store } from '../composables/useQuizStore'

const router = useRouter()
const email = ref('')
const nickname = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function register() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  
  try {
    const response = await api.register(email.value, nickname.value, password.value)
    setToken(response.access_token)
    setCurrentUser(response.user)
    store.currentUser = response.user
    await store.init()
    router.push('/')
  } catch (e) {
    error.value = e.message || 'Ошибка регистрации'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
/* Скопируйте стили из LoginView.vue */
.auth-container {
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.auth-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 40px;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.auth-card h2 {
  margin: 0 0 8px 0;
  color: var(--dark);
  font-size: 1.5rem;
}

.hint {
  color: var(--gray);
  font-size: 0.9rem;
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--dark);
  font-size: 0.9rem;
}

.form-group input {
  width: 100%;
  padding: 12px 16px;
  background: var(--input-bg, #f8f9fa);
  border: 1px solid var(--input-border, #dee2e6);
  border-radius: 12px;
  font-size: 1rem;
  color: var(--dark);
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
}

.error {
  color: var(--danger);
  background: rgba(225, 112, 85, 0.1);
  padding: 10px 14px;
  border-radius: 10px;
  margin-bottom: 16px;
  font-size: 0.9rem;
}

.btn-submit {
  width: 100%;
  padding: 14px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.switch-auth {
  text-align: center;
  margin-top: 16px;
  color: var(--gray);
  font-size: 0.9rem;
}

.switch-auth a {
  color: var(--primary);
  font-weight: 600;
  text-decoration: none;
}

.btn-back {
  width: 100%;
  padding: 12px;
  background: transparent;
  color: var(--gray);
  border: 1px solid var(--border);
  border-radius: 12px;
  font-size: 0.9rem;
  cursor: pointer;
  margin-top: 12px;
}
</style>