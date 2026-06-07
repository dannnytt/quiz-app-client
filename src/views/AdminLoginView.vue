<template>
  <div class="login-container">
    <div class="login-card">
      <h2>Вход для администратора</h2>
      <p class="hint">Введите секретный токен для доступа к панели управления</p>
      
      <form @submit.prevent="login">
        <div class="form-group">
          <label>Токен администратора</label>
          <input 
            v-model="token" 
            type="password"
            required 
            placeholder="Введите токен"
            autocomplete="off"
          />
        </div>
        
        <div v-if="error" class="error">{{ error }}</div>
        
        <button type="submit" class="btn-login" :disabled="loading">
          {{ loading ? 'Проверка...' : 'Войти' }}
        </button>
      </form>
      
      <button class="btn-back" @click="$router.push('/')">
        ← Вернуться к квизам
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { setAdminToken, api } from '../api'

const router = useRouter()
const token = ref('')
const error = ref('')
const loading = ref(false)

async function login() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  
  try {
    // ✅ Проверяем токен через защищённый эндпоинт /api/auth/verify
    const isValid = await api.verifyAdminToken(token.value)
    
    if (!isValid) {
      throw new Error('Неверный токен')
    }
    
    // Токен верный — сохраняем
    setAdminToken(token.value)
    const redirect = router.currentRoute.value.query.redirect || '/'
    router.push(redirect)
  } catch (e) {
    error.value = 'Неверный токен администратора'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 40px;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
}

.login-card h2 {
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

.btn-login {
  width: 100%;
  padding: 14px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-login:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px rgba(108, 92, 231, 0.3);
}

.btn-login:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
  transition: all 0.2s;
}

.btn-back:hover {
  background: var(--card-bg2);
  color: var(--dark);
}
</style>