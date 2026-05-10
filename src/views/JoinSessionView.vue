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
        {{ loading ? 'Подключение...' : '🎮 Присоединиться' }}
      </button>
    </form>
    
    <div v-if="error" class="error">❌ {{ error }}</div>
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
    
    // 🔑 КЛЮЧЕВОЕ: Сохраняем isHost: false для игроков
    sessionStorage.setItem('multiplayer_session', JSON.stringify({
      sessionId: result.session_id,
      playerToken: result.player_token,
      nickname: result.nickname,
      quizId: result.quiz_id,
      isHost: false  // ✅ Игрок НЕ хост
    }))
    
    // Переходим в лобби
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
/* ... ваши стили без изменений ... */
.join-container { max-width: 400px; margin: 0 auto; padding: 20px; }
.join-form { background: var(--card-bg); border-radius: 20px; padding: 30px; margin-top: 30px; }
.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-weight: 600; margin-bottom: 8px; color: var(--gray); }
.form-group input {
  width: 100%; padding: 14px 16px; background: rgba(255,255,255,0.05);
  border: 2px solid rgba(255,255,255,0.1); border-radius: 12px;
  color: #fff; font-size: 1rem; font-family: 'Inter', sans-serif;
  transition: border-color 0.2s;
}
.form-group input:focus { outline: none; border-color: var(--primary); }
.code-input {
  text-transform: uppercase; letter-spacing: 4px; text-align: center;
  font-size: 1.5rem; font-weight: 700;
}
.btn-join {
  width: 100%; padding: 16px; background: linear-gradient(135deg, var(--primary), var(--accent));
  border: none; border-radius: 14px; color: #fff; font-size: 1.1rem;
  font-weight: 700; cursor: pointer; transition: all 0.3s; margin-top: 10px;
}
.btn-join:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(108, 92, 231, 0.3); }
.btn-join:disabled { opacity: 0.6; cursor: not-allowed; }
.error { margin-top: 20px; text-align: center; color: var(--danger); font-weight: 500; }
</style>