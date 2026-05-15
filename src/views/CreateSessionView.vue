<template>
  <div class="session-container">
    <div class="quiz-header">
      <button class="back-btn" @click="$router.push('/')">←</button>
      <div class="question-counter">Создать онлайн-сессию</div>
    </div>

    <div v-if="loading" class="loading">Создание сессии...</div>
    
    <div v-else-if="session" class="session-created">
      <div class="session-code">
        <div class="code-display">{{ session.host_code }}</div>
        <p>Поделитесь этим кодом с друзьями</p>
      </div>
      
      <div class="session-info">
        <h3>{{ quiz?.title }}</h3>
        <p>{{ quiz?.questions?.length }} вопросов · {{ quizTime }}с на вопрос</p>
      </div>
      
      <div class="players-list">
        <h4>Игроки ({{ players.length }})</h4>
        <div v-for="p in players" :key="p.id || p.nickname" class="player-item">
          <span>{{ p.nickname }}</span>
          <span v-if="p.nickname === myNickname" class="badge">Вы</span>
        </div>
      </div>
      
      <button 
        v-if="isHost" 
        class="btn-start" 
        @click="startSession"
        :disabled="players.length < 1"
      >
        🚀 Начать игру (мин. 1 игрок)
      </button>
      
      <div v-if="!isHost" class="waiting-message">
        <p>🎮 Ожидайте, пока хост начнёт игру...</p>
      </div>
    </div>
    
    <div v-else-if="error" class="error">❌ {{ error }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { store } from '../composables/useQuizStore'
import { api } from '../api'
import { showToast } from '../composables/useToast'

const route = useRoute()
const router = useRouter()

const quiz = ref(null)
const session = ref(null)
const players = ref([])
const myNickname = ref('')
const playerToken = ref('')
const isHost = ref(true) // 🔑 По умолчанию хост
const loading = ref(false)
const error = ref(null)

let pollInterval = null

const quizTime = computed(() => 
  quiz.value?.timePerQuestion || quiz.value?.time_per_question || 30
)

async function init() {
  loading.value = true
  
  try {
    if (store.loading) {
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (!store.loading) { clearInterval(check); resolve() }
        }, 50)
      })
    }
    
    quiz.value = store.getQuiz(route.params.id)
    if (!quiz.value) {
      error.value = 'Квиз не найден'
      return
    }
    
    // Создаём сессию
    const newSession = await api.createSession(quiz.value.id)
    session.value = newSession
    
    // Генерируем ник хоста
    const nickname = `Host_${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    myNickname.value = nickname
    
    // Присоединяем хоста к сессии
    const joinResult = await api.joinSession(newSession.host_code, nickname)
    playerToken.value = joinResult.player_token
    
    // 🔑 КЛЮЧЕВОЕ: Сохраняем ВСЕ данные, включая isHost: true
    sessionStorage.setItem('multiplayer_session', JSON.stringify({
      sessionId: newSession.id,
      playerToken: joinResult.player_token,
      nickname: nickname,
      quizId: quiz.value.id,
      isHost: true  // ✅ ОБЯЗАТЕЛЬНО
    }))
    
    startPolling()
    
  } catch (e) {
    console.error('Session creation failed:', e)
    error.value = e.message || 'Не удалось создать сессию'
  } finally {
    loading.value = false
  }
}

function startPolling() {
  pollInterval = setInterval(async () => {
    try {
      const state = await api.getSessionState(session.value.id)
      players.value = state.players || []
      
      // Если сессия запущена — переходим в игру
      if (state.status === 'active' && quiz.value) {
        clearInterval(pollInterval)
        // 🔑 Переходим БЕЗ query-параметров — всё берём из sessionStorage
        router.push({
          name: 'MultiplayerQuiz',
          params: { sessionId: session.value.id }
        })
      }
    } catch (e) {
      console.error('Polling error:', e)
    }
  }, 2000)
}

async function startSession() {
  try {
    await api.startSession(session.value.id)
    showToast('Игра началась! 🎮', 'success')
  } catch (e) {
    showToast('Ошибка запуска', 'error')
  }
}

onMounted(init)

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>

<style scoped>
/* ... ваши стили без изменений ... */
.session-container { max-width: 500px; margin: 0 auto; padding: 20px; }
.session-created { text-align: center; }
.session-code { margin: 30px 0; }
.code-display {
  font-size: 3rem; font-weight: 900; letter-spacing: 8px;
  color: #2d3436; padding: 24px; background: rgba(108, 92, 231, 0.15);
  border: 1px solid rgba(108, 92, 231, 0.3); border-radius: 20px;
  margin-bottom: 10px; cursor: pointer; transition: all 0.2s; user-select: all;
}
.code-display:hover { background: rgba(108, 92, 231, 0.25); transform: scale(1.02); }
.code-display p { color: var(--gray); font-size: 0.9rem; margin-top: 8px; }
.players-list { margin: 20px 0; text-align: left; }
.player-item {
  display: flex; justify-content: space-between; padding: 10px 16px;
  background: rgba(255,255,255,0.05); border-radius: 10px; margin-bottom: 8px;
}
.badge {
  background: var(--success); color: #fff; padding: 2px 10px;
  border-radius: 20px; font-size: 0.75rem; font-weight: 600;
}
.btn-start {
  width: 100%; padding: 16px; background: linear-gradient(135deg, var(--success), #00a388);
  border: none; border-radius: 14px; color: #fff; font-size: 1.1rem;
  font-weight: 700; cursor: pointer; transition: all 0.3s; margin-top: 20px;
}
.btn-start:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(0, 184, 148, 0.3); }
.btn-start:disabled { opacity: 0.5; cursor: not-allowed; }
.waiting-message {
  margin-top: 20px; padding: 16px; background: rgba(253, 203, 110, 0.1);
  border-radius: 12px; color: var(--warning);
}
.loading, .error { text-align: center; padding: 40px; font-size: 1.1rem; }
.error { color: var(--danger); }
</style>