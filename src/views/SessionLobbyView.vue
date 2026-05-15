<template>
  <div class="lobby-container">
    <div class="quiz-header">
      <button class="back-btn" @click="leaveSession">←</button>
      <div class="question-counter">Ожидание начала игры</div>
    </div>

    <!-- Загрузка -->
    <div v-if="loading" class="lobby-loading">
      <div class="loading-spinner"></div>
      <p>Подключение к сессии...</p>
    </div>

    <!-- Ошибка -->
    <div v-else-if="error" class="lobby-error">
      <p>❌ {{ error }}</p>
      <button class="back-btn" @click="$router.push('/')" style="margin-top: 16px;">
        🏠 На главную
      </button>
    </div>

    <!-- Основное лобби -->
    <template v-else>
      <!-- Информация о квизе -->
      <div class="quiz-info-card">
        <span class="quiz-emoji">{{ quiz?.emoji || '🎮' }}</span>
        <h3>{{ quiz?.title }}</h3>
        <p class="quiz-desc">{{ quiz?.desc }}</p>
        <div class="quiz-meta">
          <span>📝 {{ quiz?.questions?.length || 0 }} вопросов</span>
          <span>⏱ {{ quizTime }}с на вопрос</span>
          <span :class="['difficulty', quiz?.difficulty]">
            {{ difficultyLabel }}
          </span>
        </div>
      </div>

      <!-- Код сессии (для хоста) -->
      <div v-if="isHost" class="session-code-card">
        <p>Поделитесь кодом с друзьями:</p>
        <div class="code-display" @click="copyCode">
          {{ hostCode }}
          <span class="copy-hint">📋 Нажми, чтобы скопировать</span>
        </div>
      </div>

      <!-- Список игроков -->
      <div class="players-section">
        <h4>Игроки ({{ players.length }})</h4>
        <div class="players-grid">
          <div 
            v-for="p in players" 
            :key="p.id || p.nickname" 
            :class="['player-card', { 'is-you': p.nickname === myNickname, 'is-host': p.isHost }]"
          >
            <div class="player-avatar">
              {{ getAvatarLetter(p.nickname) }}
            </div>
            <div class="player-info">
              <span class="player-name">{{ p.nickname }}</span>
              <span v-if="p.isHost" class="badge host">🎤 Хост</span>
              <span v-if="p.nickname === myNickname" class="badge you">Вы</span>
            </div>
          </div>
          
          <!-- Пустые слоты для визуализации -->
          <div v-for="i in emptySlots" :key="`empty-${i}`" class="player-card empty">
            <div class="player-avatar">?</div>
            <div class="player-info">
              <span class="player-name">Ожидание...</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Управление для хоста -->
      <div v-if="isHost" class="host-actions">
        <button 
          class="btn-start" 
          @click="startGame"
          :disabled="players.length < 1 || starting"
        >
          {{ starting ? 'Запуск...' : '🚀 Начать игру' }}
        </button>
        <p class="hint">Минимум 1 игрок для старта</p>
      </div>

      <!-- Статус для игроков -->
      <div v-else class="player-status">
        <div class="status-icon">⏳</div>
        <p>Ожидайте, пока <strong>{{ hostNickname }}</strong> начнёт игру...</p>
        <button class="btn-leave" @click="leaveSession">
          🔙 Выйти из сессии
        </button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api'
import { showToast } from '../composables/useToast'
import { store } from '../composables/useQuizStore'

const route = useRoute()
const router = useRouter()

// Состояние
const loading = ref(true)
const error = ref(null)
const starting = ref(false)

// Данные сессии
const sessionId = ref(route.params.sessionId)
const sessionData = ref(null)
const quiz = ref(null)
const players = ref([])
const hostCode = ref('')
const myNickname = ref('')
const playerToken = ref('')
const isHost = ref(false)

// Поллинг
let pollInterval = null

// Вычисляемые
const quizTime = computed(() => 
  quiz.value?.timePerQuestion || quiz.value?.time_per_question || 30
)
const difficultyLabel = computed(() => {
  const labels = { easy: 'Лёгкий', medium: 'Средний', hard: 'Сложный' }
  return labels[quiz.value?.difficulty] || quiz.value?.difficulty || ''
})
const hostNickname = computed(() => {
  const host = players.value.find(p => p.isHost)
  return host?.nickname || 'Хост'
})
const emptySlots = computed(() => {
  // Показываем до 8 слотов всего
  const filled = players.value.length
  return Math.max(0, Math.min(8 - filled, 4))
})

// Инициализация
async function init() {
  try {
    // Получаем данные из sessionStorage (записаны при присоединении)
    const stored = sessionStorage.getItem('multiplayer_session')
    if (!stored) {
      router.push('/join')
      return
    }
    
    const data = JSON.parse(stored)
    
    // Проверка, что мы в правильной сессии
    if (data.sessionId !== sessionId.value) {
      router.push('/join')
      return
    }
    
    myNickname.value = data.nickname
    playerToken.value = data.playerToken
    
    // Загружаем квиз из стора
    if (store.loading) {
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (!store.loading) { clearInterval(check); resolve() }
        }, 50)
      })
    }
    
    quiz.value = store.getQuiz(data.quizId)
    if (!quiz.value) {
      // Если квиза нет в сторе, пробуем загрузить отдельно
      const quizzes = await api.getQuizzes()
      quiz.value = quizzes.find(q => q.id === data.quizId)
    }
    
    if (!quiz.value) {
      error.value = 'Квиз не найден'
      return
    }
    
    // Загружаем состояние сессии
    await loadSessionState()
    
    // Запускаем поллинг
    startPolling()
    
  } catch (e) {
    console.error('Lobby init failed:', e)
    error.value = e.message || 'Ошибка подключения'
  } finally {
    loading.value = false
  }
}

// Загрузка состояния сессии
async function loadSessionState() {
  const state = await api.getSessionState(sessionId.value)
  
  hostCode.value = state.host_code || ''
  
  // Обновляем игроков с флагом isHost
  players.value = (state.players || []).map(p => ({
    ...p,
    isHost: false // Бэкенд не возвращает isHost, определяем по нику
  }))
  
  // Определяем хоста (первый игрок или по нику)
  // В реальной реализации бэкенд должен возвращать host_id
  if (players.value.length > 0 && !players.value[0].isHost) {
    players.value[0].isHost = true
  }
  
  // Проверяем, являемся ли мы хостом
  isHost.value = players.value.some(p => 
    p.nickname === myNickname.value && p.isHost
  )
  
  // Если сессия запущена — переходим в игру
  if (state.status === 'active') {
    router.push({
      name: 'MultiplayerQuiz',
      params: { sessionId: sessionId.value }
    })
  }
  
  // Если сессия завершена — показываем результаты
  if (state.status === 'finished') {
    router.push({
      name: 'SessionResults',
      params: { sessionId: sessionId.value }
    })
  }
}

// Поллинг обновлений
function startPolling() {
  pollInterval = setInterval(async () => {
    try {
      await loadSessionState()
    } catch (e) {
      console.error('Polling error:', e)
    }
  }, 2000)
}

// Запуск игры (только хост)
async function startGame() {
  if (starting.value) return
  
  starting.value = true
  try {
    await api.startSession(sessionId.value)
    showToast('Игра началась! 🎮', 'success')
    // Переход произойдёт автоматически через поллинг
  } catch (e) {
    console.error('Start failed:', e)
    showToast('Не удалось начать игру', 'error')
  } finally {
    starting.value = false
  }
}

// Копирование кода
async function copyCode() {
  try {
    await navigator.clipboard.writeText(hostCode.value)
    showToast('Код скопирован! 📋', 'success')
  } catch {
    // Fallback для старых браузеров
    const textarea = document.createElement('textarea')
    textarea.value = hostCode.value
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    showToast('Код скопирован! 📋', 'success')
  }
}

// Выход из сессии
function leaveSession() {
  if (pollInterval) clearInterval(pollInterval)
  sessionStorage.removeItem('multiplayer_session')
  router.push('/')
}

// Утилиты
function getAvatarLetter(nickname) {
  return (nickname?.[0] || '?').toUpperCase()
}

// Lifecycle
onMounted(init)
onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})
</script>

<style scoped>
.lobby-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
}

/* Загрузка / ошибка */
.lobby-loading,
.lobby-error {
  text-align: center;
  padding: 60px 20px;
  color: var(--gray);
}
.lobby-error { color: var(--danger); }

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(108, 92, 231, 0.2);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Карточка квиза */
.quiz-info-card {
  background: var(--card-bg);
  border-radius: 20px;
  padding: 24px;
  text-align: center;
  margin-bottom: 24px;
  border: 1px solid rgba(255,255,255,0.06);
}

.quiz-emoji {
  font-size: 3rem;
  display: block;
  margin-bottom: 12px;
}

.quiz-info-card h3 {
  font-size: 1.3rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.quiz-desc {
  color: var(--gray);
  margin-bottom: 16px;
  font-size: 0.95rem;
}

.quiz-meta {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 0.85rem;
  color: var(--gray);
}

.difficulty {
  padding: 3px 10px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.75rem;
}
.difficulty.easy { background: rgba(0,184,148,0.15); color: var(--success); }
.difficulty.medium { background: rgba(253,203,110,0.15); color: var(--warning); }
.difficulty.hard { background: rgba(225,112,85,0.15); color: var(--danger); }

/* Код сессии */
/* Код сессии — исправлено для светлой темы */
.session-code-card {
  text-align: center;
  margin-bottom: 24px;
  padding: 20px;
  background: rgba(108, 92, 231, 0.08);
  border: 1px solid rgba(108, 92, 231, 0.2);
  border-radius: 16px;
}

.session-code-card p {
  margin-bottom: 12px;
  color: var(--gray);
  font-size: 0.9rem;
}

.code-display {
  font-size: 2.5rem;
  font-weight: 900;
  letter-spacing: 6px;
  /* ✅ Тёмный текст для светлой темы */
  color: var(--dark, #2d3436) !important;
  -webkit-text-fill-color: var(--dark, #2d3436) !important;
  
  padding: 20px;
  /* ✅ Чуть более светлый фон для контраста */
  background: rgba(108, 92, 231, 0.08);
  border: 2px solid rgba(108, 92, 231, 0.3);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  user-select: all;
}

.code-display:hover {
  background: rgba(108, 92, 231, 0.12);
  border-color: var(--primary);
  transform: scale(1.02);
}

.copy-hint {
  display: block;
  font-size: 0.75rem;
  color: var(--gray);
  margin-top: 8px;
  letter-spacing: normal;
}

/* Игроки */
.players-section h4 {
  margin-bottom: 16px;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.players-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
}

.player-card {
  background: var(--card-bg);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  transition: all 0.2s;
}

.player-card:hover {
  border-color: rgba(108, 92, 231, 0.3);
  transform: translateY(-2px);
}

.player-card.is-you {
  border-color: var(--success);
  background: rgba(0, 184, 148, 0.08);
}

.player-card.is-host {
  border-color: var(--warning);
}

.player-card.empty {
  opacity: 0.5;
  border-style: dashed;
}

.player-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.2rem;
  color: #fff;
}

.player-card.empty .player-avatar {
  background: rgba(255,255,255,0.08);
  color: var(--gray);
}

.player-info {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.player-name {
  font-weight: 600;
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
}
.badge.host {
  background: rgba(253, 203, 110, 0.2);
  color: var(--warning);
}
.badge.you {
  background: rgba(0, 184, 148, 0.2);
  color: var(--success);
}

/* Управление хоста */
.host-actions {
  text-align: center;
  margin-top: 30px;
}

.btn-start {
  width: 100%;
  max-width: 300px;
  padding: 16px 24px;
  background: linear-gradient(135deg, var(--success), #00a388);
  border: none;
  border-radius: 14px;
  color: #fff;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-start:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(0, 184, 148, 0.3);
}

.btn-start:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.hint {
  margin-top: 10px;
  font-size: 0.85rem;
  color: var(--gray);
}

/* Статус игрока */
.player-status {
  text-align: center;
  margin-top: 30px;
  padding: 24px;
  background: rgba(253, 203, 110, 0.08);
  border-radius: 16px;
}

.status-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.player-status p {
  margin-bottom: 20px;
  color: var(--gray);
}

.btn-leave {
  padding: 10px 20px;
  background: rgba(255,255,255,0.08);
  border: none;
  border-radius: 10px;
  color: var(--danger);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-leave:hover {
  background: rgba(225, 112, 85, 0.15);
}

/* Адаптив */
@media (max-width: 500px) {
  .players-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .quiz-meta {
    flex-direction: column;
    gap: 8px;
  }
  
  .code-display {
    font-size: 2rem;
  }
}
</style>