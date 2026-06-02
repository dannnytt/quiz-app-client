<template>
  <div class="session-container">
    <div class="session-header">
      <button class="back-btn" @click="$router.push('/')">
        <span class="back-icon">←</span>
      </button>
      <h1 class="session-title">Создать онлайн-сессию</h1>
    </div>

    <div v-if="loading" class="session-loading">
      <div class="loading-spinner"></div>
      <p class="loading-text">Создание сессии...</p>
    </div>
    
    <div v-else-if="error" class="session-error">
      <p>{{ error }}</p>
      <button class="btn-secondary" @click="$router.push('/')">
        На главную
      </button>
    </div>

    <div v-else-if="session" class="session-created">
      
      <div class="code-section">
        <p class="code-label">Код для подключения</p>
        <div class="code-display" @click="copyCode" :class="{ copied: codeCopied }">
          <span class="code-value">{{ session.host_code }}</span>
          <span class="code-hint">
            {{ codeCopied ? '✓ Скопировано!' : 'Нажмите, чтобы скопировать' }}
          </span>
        </div>
      </div>

      <div class="quiz-card">
        <div class="quiz-details">
          <h3 class="quiz-title">{{ quiz?.title }}</h3>
          <p class="quiz-desc">{{ quiz?.desc }}</p>
          <div class="quiz-meta">
            <span class="meta-item">
              {{ quiz?.questions?.length || 0 }} вопросов
            </span>
  
            <span :class="['meta-item', 'difficulty', quiz?.difficulty]">
              {{ getDifficultyLabel(quiz?.difficulty) }}
            </span>
          </div>
        </div>
      </div>

      <div class="players-section">
        <div class="section-header">
          <h4>Игроки</h4>
          <!-- <span class="players-count">{{ players.length }}</span> -->
        </div>
        
        <div class="players-list">
          <div 
            v-for="p in players" 
            :key="p.id || p.nickname" 
            class="player-item"
            :class="{ 'is-you': p.nickname === myNickname }"
          >
            <div class="player-avatar">
              {{ getAvatarLetter(p.nickname) }}
            </div>
            <div class="player-details">
              <span class="player-name">{{ p.nickname }}</span>
              <span v-if="p.isHost" class="player-role">Хост</span>
            </div>
            <span v-if="p.nickname === myNickname" class="badge-you">Вы</span>
          </div>
          
          <div v-for="i in emptySlots" :key="`empty-${i}`" class="player-item empty">
            <div class="player-avatar empty-avatar">?</div>
            <span class="player-name empty-name">Ожидание...</span>
          </div>
        </div>
      </div>

      <div v-if="isHost" class="host-actions">
        <button 
          class="btn-primary" 
          @click="startSession"
          :disabled="players.length < 1 || starting"
        >
          {{ starting ? 'Запуск...' : 'Начать игру' }}
        </button>
      </div>

      <div v-else class="player-waiting">
        <div class="waiting-icon">⏳</div>
        <p>Ожидайте, пока <strong>{{ hostNickname }}</strong> начнёт игру...</p>
        <button class="btn-secondary" @click="leaveSession">
          Выйти из сессии
        </button>
      </div>
    </div>
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
const isHost = ref(true)
const loading = ref(false)
const error = ref(null)
const starting = ref(false)
const codeCopied = ref(false)

let pollInterval = null

const quizTime = computed(() => 
  quiz.value?.timePerQuestion || quiz.value?.time_per_question || 30
)

const hostNickname = computed(() => {
  const host = players.value.find(p => p.isHost)
  return host?.nickname || 'Хост'
})

const emptySlots = computed(() => {
  const filled = players.value.length
  return Math.max(0, Math.min(6 - filled, 4))
})

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
    
    const newSession = await api.createSession(quiz.value.id)
    session.value = newSession
    
    const nickname = `Host_${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    myNickname.value = nickname
    
    const joinResult = await api.joinSession(newSession.host_code, nickname)
    playerToken.value = joinResult.player_token
    
    sessionStorage.setItem('multiplayer_session', JSON.stringify({
      sessionId: newSession.id,
      playerToken: joinResult.player_token,
      nickname: nickname,
      quizId: quiz.value.id,
      isHost: true
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
      
      if (state.status === 'active' && quiz.value) {
        clearInterval(pollInterval)
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
  if (starting.value) return
  starting.value = true
  
  try {
    await api.startSession(session.value.id)
    showToast('Игра началась!', 'success')
  } catch (e) {
    showToast('Ошибка запуска', 'error')
  } finally {
    starting.value = false
  }
}

async function copyCode() {
  try {
    await navigator.clipboard.writeText(session.value.host_code)
    codeCopied.value = true
    showToast('Код скопирован!', 'success')
    setTimeout(() => { codeCopied.value = false }, 2000)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = session.value.host_code
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    codeCopied.value = true
    showToast('Код скопирован!', 'success')
    setTimeout(() => { codeCopied.value = false }, 2000)
  }
}

function leaveSession() {
  if (pollInterval) clearInterval(pollInterval)
  sessionStorage.removeItem('multiplayer_session')
  router.push('/')
}

function getAvatarLetter(nickname) {
  return (nickname?.[0] || '?').toUpperCase()
}

function getDifficultyLabel(difficulty) {
  const labels = { easy: 'Лёгкий', medium: 'Средний', hard: 'Сложный' }
  return labels[difficulty] || difficulty
}

onMounted(init)
onUnmounted(() => { if (pollInterval) clearInterval(pollInterval) })
</script>

<style scoped>

.session-container {
  max-width: 520px;
  margin: 0 auto;
  padding: 24px 20px;
}

.session-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
}

.back-btn {
  width: 44px;
  height: 44px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card-bg);
  color: var(--dark);
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.back-btn:hover {
  background: var(--card-bg2);
  border-color: var(--primary);
}

.session-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--dark);
  margin: 0;
}

.session-loading,
.session-error {
  text-align: center;
  padding: 48px 24px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 20px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.04);
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}
@keyframes spin { to { transform: rotate(360deg); } }

.loading-text {
  color: var(--gray);
  margin: 0;
}

.session-error {
  border-color: var(--danger);
}
.error-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
}
.session-error p {
  color: var(--danger);
  margin-bottom: 20px;
}

.code-section {
  margin-bottom: 24px;
}
.code-label {
  text-align: center;
  color: var(--gray);
  font-size: 0.9rem;
  margin-bottom: 12px;
}

.code-display {
  background: linear-gradient(135deg, rgba(108, 92, 231, 0.08), rgba(108, 92, 231, 0.04));
  border: 2px solid rgba(108, 92, 231, 0.3);
  border-radius: 16px;
  padding: 20px 24px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}
.code-display:hover {
  border-color: var(--primary);
  background: rgba(108, 92, 231, 0.12);
}
.code-display.copied {
  border-color: var(--success);
  background: rgba(0, 184, 148, 0.1);
}

.code-value {
  display: block;
  font-size: 2.2rem;
  font-weight: 800;
  letter-spacing: 10px;
  color: var(--dark);
  margin-bottom: 8px;
  font-family: 'Inter', monospace;
}

.code-hint {
  display: block;
  font-size: 0.8rem;
  color: var(--gray);
  transition: color 0.2s;
}
.code-display.copied .code-hint {
  color: var(--success);
  font-weight: 600;
}

.quiz-card {
  display: flex;
  gap: 16px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.quiz-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.quiz-icon-inner {
  font-size: 1.8rem;
}

.quiz-details {
  flex: 1;
  min-width: 0;
}
.quiz-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--dark);
  margin: 0 0 4px 0;
  line-height: 1.4;
}
.quiz-desc {
  color: var(--gray);
  font-size: 0.9rem;
  margin: 0 0 12px 0;
  line-height: 1.4;
}

.quiz-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--gray);
}
.meta-icon {
  font-size: 0.9rem;
}
.difficulty {
  padding: 3px 10px;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.75rem;
}
.difficulty.easy {}
.difficulty.medium {}
.difficulty.hard {}

.players-section {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.section-header h4 {
  margin: 0;
  font-size: 1rem;
  color: var(--dark);
}
.players-count {
  background: var(--card-bg2);
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--primary);
}

.players-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.player-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--card-bg2);
  border: 1px solid var(--border);
  border-radius: 12px;
  transition: all 0.2s;
}
.player-item:hover {
  border-color: var(--primary);
}
.player-item.is-you {
  /* background: rgba(0, 184, 148, 0.08); */
  /* border-color: var(--success); */
}
.player-item.empty {
  opacity: 0.6;
  border-style: dashed;
}

.player-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  color: #fff;
  flex-shrink: 0;
}
.empty-avatar {
  background: var(--card-bg);
  color: var(--gray);
  border: 2px dashed var(--border);
}

.player-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.player-name {
  font-weight: 600;
  color: var(--dark);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.empty-name {
  color: var(--gray);
  font-style: italic;
}
.player-role {
  font-size: 0.75rem;
  color: var(--warning);
  font-weight: 600;
}

.badge-you {
  background: var(--success);
  color: #fff;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
  flex-shrink: 0;
}

.host-actions {
  text-align: center;
}

.btn-primary {
  width: 100%;
  max-width: 280px;
  padding: 14px 28px;
  background: var(--primary);
  border: none;
  border-radius: 14px;
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
}

.hint {
  margin-top: 12px;
  font-size: 0.85rem;
  color: var(--gray);
}

.player-waiting {
  text-align: center;
  padding: 24px;
  background: rgba(253, 203, 110, 0.08);
  border: 1px solid rgba(253, 203, 110, 0.3);
  border-radius: 16px;
}
.waiting-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
.player-waiting p {
  margin-bottom: 20px;
  color: var(--gray);
}

.btn-secondary {
  padding: 10px 24px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--dark);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-secondary:hover {
  background: var(--card-bg2);
  border-color: var(--danger);
  color: var(--danger);
}

@media (max-width: 480px) {
  .session-header {
    flex-direction: column;
    text-align: center;
  }
  
  .quiz-card {
    flex-direction: column;
    text-align: center;
  }
  
  .quiz-meta {
    justify-content: center;
  }
  
  .code-value {
    font-size: 1.8rem;
    letter-spacing: 6px;
  }
}
</style>