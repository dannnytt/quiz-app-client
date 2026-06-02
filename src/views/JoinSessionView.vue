<template>
  <div class="join-container">
    <div class="quiz-header">
      <button class="back-btn" @click="$router.push('/')">←</button>
      <div class="question-counter">Присоединиться к игре</div>
    </div>

    <form @submit.prevent="joinSession" class="join-form">
      <div class="form-group">
        <label>Код сессии</label>
        <input 
          v-model="hostCode" 
          required 
          maxlength="6"
          placeholder="ABC123"
          class="code-input"
          @input="hostCode = hostCode.toUpperCase()"
        >
      </div>
      
      <div class="form-group">
        <label>Ваш никнейм</label>
        <input 
          v-model="nickname" 
          required 
          minlength="2"
          maxlength="50"
          placeholder="Игрок"
        >
      </div>
      
      <button type="submit" class="btn-join" :disabled="loading">
        {{ loading ? 'Подключение...' : 'Присоединиться' }}
      </button>
    </form>
    
    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '../api'
import { showToast } from '../composables/useToast'

const router = useRouter()

const hostCode = ref('')
const nickname = ref('')
const loading = ref(false)
const error = ref(null)

async function joinSession() {
  if (loading.value) return
  
  loading.value = true
  error.value = null
  
  try {
    const result = await api.joinSession(hostCode.value.trim(), nickname.value.trim())
    
    sessionStorage.setItem('multiplayer_session', JSON.stringify({
      sessionId: result.session_id,
      playerToken: result.player_token,
      nickname: result.nickname,
      quizId: result.quiz_id,
      isHost: false
    }))
    
    router.push({
      name: 'SessionLobby',
      params: { sessionId: result.session_id }
    })
    
  } catch (e) {
    console.error('Join failed:', e)
    error.value = e.message || 'Не удалось присоединиться. Проверьте код.'
    showToast('Ошибка подключения', 'error')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.join-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
}

.join-form {
  background: var(--card-bg);
  border-radius: 20px;
  padding: 30px;
  margin-top: 30px;
  border: 1px solid var(--border);
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--gray);
}

.form-group input {
  width: 100%;
  padding: 14px 16px;
  background: var(--input-bg, #f8f9fa);
  border: 2px solid var(--input-border, #dee2e6);
  border-radius: 12px;
  color: var(--dark, #2d3436) !important;
  -webkit-text-fill-color: var(--dark, #2d3436) !important;
  font-size: 1rem;
  font-family: 'Inter', sans-serif;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
  background: #fff;
}

.form-group input::placeholder {
  color: var(--input-placeholder, #adb5bd) !important;
  opacity: 1 !important;
}

.code-input {
  text-transform: uppercase;
  letter-spacing: 4px;
  text-align: center;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--dark, #2d3436) !important;
  background: var(--input-bg, #f8f9fa) !important;
  border-color: var(--input-border, #dee2e6) !important;
}

.code-input:focus {
  background: #fff !important;
  border-color: var(--primary) !important;
}

.form-group input:-webkit-autofill,
.form-group input:-webkit-autofill:hover,
.form-group input:-webkit-autofill:focus {
  -webkit-text-fill-color: var(--dark, #2d3436) !important;
  -webkit-box-shadow: 0 0 0 1000px #fff inset !important;
  box-shadow: 0 0 0 1000px #fff inset !important;
  transition: background-color 5000s ease-in-out 0s;
}

.btn-join {
  width: 100%;
  padding: 16px;
  background: var(--primary);
  border: none;
  border-radius: 14px;
  color: #fff;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  /* transition: all 0.3s; */
  margin-top: 10px;
}

/* .btn-join:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(108, 92, 231, 0.2);
}

.btn-join:disabled {
  opacity: 0.6;
  cursor: not-allowed;
} */

.error {
  margin-top: 20px;
  text-align: center;
  color: var(--danger);
  font-weight: 500;
}
</style>