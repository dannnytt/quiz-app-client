<template>
  <div v-if="loading" class="quiz-loading">
    <div class="loading-spinner"></div>
    <p>Подготовка игры...</p>
  </div>

  <div v-else-if="error" class="quiz-error">
    <p>❌ {{ error }}</p>
    <button class="back-btn" @click="leaveSession" style="margin-top: 16px;">🏠 На главную</button>
  </div>

  <template v-else>
    <!-- Шапка -->
    <div class="quiz-header">
      <div class="quiz-info">
        <button class="back-btn" @click="leaveSession">←</button>
        <div class="question-counter">
          Вопрос <span>{{ currentQuestionIndex + 1 }}</span> / <span>{{ totalQuestions }}</span>
        </div>
      </div>
      
      <div class="header-right">
        <!-- ✅ Никнейм игрока -->
        <span class="current-nickname" :title="myNickname">
          {{ myNickname || 'Игрок' }}
        </span>
        
        <div class="role-badge" :class="isHost ? 'badge-host' : 'badge-player'">
          {{ isHost ? '🎤 Хост' : '👤 Игрок' }}
        </div>
        <div class="score-display">⭐ {{ myScore }}</div>
      </div>
    </div>

    <div class="progress-container">
      <div class="progress-bar" :style="{ width: progress + '%' }"></div>
    </div>

    <!-- === 🟣 ИНТЕРФЕЙС ХОСТА === -->
    <div v-if="isHost && sessionStatus === 'active'" class="host-panel">
      <div class="question-preview">
        <h3 class="question-text">{{ currentQuestion?.q || currentQuestion?.text || 'Загрузка...' }}</h3>
        <div class="options-preview">
          <div v-for="(opt, i) in currentQuestion?.options" :key="i" class="option-preview">
            <span class="option-letter">{{ String.fromCharCode(65 + i) }}</span>
            <span>{{ opt }}</span>
            <span v-if="i === currentQuestion?.correct" class="correct-indicator">✅</span>
          </div>
        </div>
      </div>

      <div class="host-controls">
        <div class="player-counter">
          <span class="counter-icon">👥</span>
          <span>Игроков: {{ players.length }}</span>
        </div>
        <button class="btn-next-host" @click="nextQuestionHost" :disabled="advancing">
          {{ advancing ? 'Переход...' : (isLastQuestion ? '🏁 Завершить игру' : '➡️ Следующий вопрос') }}
        </button>
        <p class="host-hint">💡 Хост управляет игрой. Игроки отвечают самостоятельно.</p>
      </div>
    </div>

    <!-- === 🔵 ИНТЕРФЕЙС ИГРОКА === -->
    <div v-else-if="!isHost && sessionStatus === 'active'" class="player-panel">
      <div class="question-container" ref="qContainer">
        <div class="question-text">{{ currentQuestion?.q || currentQuestion?.text }}</div>
        
        <div class="options-list">
          <button 
            v-for="(opt, i) in currentQuestion?.options" 
            :key="i"
            :class="['option-btn', { 
              correct: answered && i === currentQuestion.correct, 
              wrong: answered && selected === i && i !== currentQuestion.correct,
              disabled: answered || !canAnswer
            }]"
            @click="selectAnswer(i)"
            :disabled="answered || !canAnswer"
          >
            <span class="option-letter">{{ String.fromCharCode(65 + i) }}</span>
            <span>{{ opt }}</span>
          </button>
        </div>

        <div v-if="answered" class="explanation">💡 {{ currentQuestion?.explanation }}</div>
        <div v-if="answered" class="waiting-next">
          <p>✅ Ответ принят! Ожидайте, пока хост нажмёт «Далее»...</p>
        </div>
      </div>

      <div class="game-sidebar">
        <div v-if="!answered" :class="['timer-display', { warning: timeLeft <= 5 }]">
          ⏱ {{ timeLeft }}с
        </div>
        <div v-if="leaderboard.length" class="mini-leaderboard">
          <h4>🏆 Топ-3</h4>
          <div v-for="(p, i) in leaderboard.slice(0, 3)" :key="p.nickname" class="leader-item">
            <span class="rank">#{{ i + 1 }}</span>
            <span class="name">{{ p.nickname }}</span>
            <span class="score">{{ p.score }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Ожидание старта -->
    <div v-if="sessionStatus === 'waiting'" class="waiting-start">
      <div class="waiting-icon">⏳</div>
      <p v-if="isHost">Нажмите «Начать игру» в лобби, чтобы запустить квиз.</p>
      <p v-else>Ожидайте начала игры...</p>
    </div>
  </template>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api'
import { store } from '../composables/useQuizStore'
import { showToast } from '../composables/useToast'

const route = useRoute()
const router = useRouter()

// Состояние
const loading = ref(true)
const error = ref(null)
const advancing = ref(false)

// Сессия
const sessionId = ref(route.params.sessionId)
const sessionStatus = ref('waiting')
const players = ref([])
const leaderboard = ref([])

// Игрок
const playerToken = ref('')
const myNickname = ref('')
const isHost = ref(false)
const myScore = ref(0)

// Квиз
const quiz = ref(null)
const questions = ref([])
const totalQuestions = ref(0)
const currentQuestionIndex = ref(0)
const lastProcessedQuestionIndex = ref(-1) // 🔑 Отслеживает смену вопроса

// Игра
const timeLeft = ref(30)
const answered = ref(false)
const selected = ref(null)
const canAnswer = ref(true)

let gameTimer = null
let pollInterval = null

const currentQuestion = computed(() => questions.value[currentQuestionIndex.value])
const isLastQuestion = computed(() => currentQuestionIndex.value >= totalQuestions.value - 1)
const progress = computed(() => totalQuestions.value ? (currentQuestionIndex.value / totalQuestions.value) * 100 : 0)
const quizTime = computed(() => quiz.value?.timePerQuestion || quiz.value?.time_per_question || 30)

async function init() {
  try {
    const stored = sessionStorage.getItem('multiplayer_session')
    if (!stored) { router.push('/join'); return }
    
    const data = JSON.parse(stored)
    playerToken.value = data.playerToken
    myNickname.value = data.nickname
    isHost.value = data.isHost || false // 🔑 Явно читаем флаг хоста
    
    if (store.loading) {
      await new Promise(resolve => {
        const check = setInterval(() => { if (!store.loading) { clearInterval(check); resolve() } }, 50)
      })
    }
    
    await loadQuiz(data.quizId)
    if (!quiz.value || questions.value.length === 0) {
      error.value = 'Не удалось загрузить вопросы'
      return
    }
    totalQuestions.value = questions.value.length
    timeLeft.value = quizTime.value
    
    await loadSessionState()
    startPolling()
    
  } catch (e) {
    console.error('Multiplayer init failed:', e)
    error.value = e.message || 'Ошибка загрузки игры'
  } finally {
    loading.value = false
  }
}

async function loadQuiz(quizId) {
  let q = store.getQuiz(quizId)
  if (!q) {
    const quizzes = await api.getQuizzes()
    q = quizzes.find(qz => qz.id === quizId)
  }
  if (!q) throw new Error('Квиз не найден')
  
  quiz.value = q
  questions.value = (q.questions || []).map(qs => ({
    q: qs.text || qs.q || '',
    options: Array.isArray(qs.options) ? qs.options : [],
    correct: typeof qs.correct === 'number' ? qs.correct : 0,
    explanation: qs.explanation || ''
  }))
}

async function loadSessionState() {
  const state = await api.getSessionState(sessionId.value)
  sessionStatus.value = state.status
  players.value = state.players || []
  
  // Обновляем лидерборд
  if (state.status === 'active' || state.status === 'finished') {
    try {
      const lb = await api.getLeaderboard(sessionId.value)
      leaderboard.value = lb.leaderboard || []
      const me = leaderboard.value.find(p => p.nickname === myNickname.value)
      if (me) myScore.value = me.score
    } catch (e) { console.error('Leaderboard error:', e) }
  }
  
  // 🔑 КЛЮЧЕВОЕ: Обрабатываем смену вопроса
  const newIdx = state.current_question ?? 0
  if (newIdx !== lastProcessedQuestionIndex.value) {
    lastProcessedQuestionIndex.value = newIdx
    currentQuestionIndex.value = newIdx
    
    // Сбрасываем состояние для нового вопроса
    answered.value = false
    selected.value = null
    canAnswer.value = true
    timeLeft.value = quizTime.value
    
    // Запускаем таймер ТОЛЬКО у игроков
    if (!isHost.value && state.status === 'active') {
      startQuestionTimer()
    }
  }
  
  if (state.status === 'finished') {
    clearInterval(pollInterval)
    showFinalResults()
  }
}

function startPolling() {
  pollInterval = setInterval(async () => {
    try { await loadSessionState() } catch (e) { console.error('Polling error:', e) }
  }, 1500)
}

function startQuestionTimer() {
  stopQuestionTimer()
  gameTimer = setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) timeUp()
  }, 1000)
}

function stopQuestionTimer() {
  if (gameTimer) { clearInterval(gameTimer); gameTimer = null }
}

function timeUp() {
  if (isHost.value || answered.value) return
  answered.value = true
  canAnswer.value = false
  stopQuestionTimer()
  showToast('Время вышло! ⏰', 'error')
  submitAnswerToServer(-1)
}

function selectAnswer(index) {
  if (isHost.value || answered.value || !canAnswer.value) return
  answered.value = true
  selected.value = index
  canAnswer.value = false
  stopQuestionTimer()
  submitAnswerToServer(index)
}

async function submitAnswerToServer(optionIndex) {
  try {
    await api.submitAnswer(sessionId.value, playerToken.value, currentQuestionIndex.value, optionIndex)
  } catch (e) { console.error('Submit answer failed:', e) }
}

async function nextQuestionHost() {
  if (advancing.value) return
  advancing.value = true
  
  try {
    if (isLastQuestion.value) {
      await api.finishSession(sessionId.value)
      showFinalResults()
    } else {
      await api.nextQuestion(sessionId.value)
      showToast('Следующий вопрос! 🎯', 'success')
    }
  } catch (e) {
    console.error('Next question failed:', e)
    showToast('Ошибка перехода', 'error')
  } finally {
    advancing.value = false
  }
}

function showFinalResults() {
  stopQuestionTimer()
  router.push({ name: 'SessionResults', params: { sessionId: sessionId.value } })
}

function leaveSession() {
  stopQuestionTimer()
  if (pollInterval) clearInterval(pollInterval)
  sessionStorage.removeItem('multiplayer_session')
  router.push('/')
}

onMounted(init)
onUnmounted(() => { stopQuestionTimer(); if (pollInterval) clearInterval(pollInterval) })
</script>

<style scoped>
/* Базовые стили */
.quiz-loading, .quiz-error { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 400px; text-align: center; padding: 40px 20px; color: var(--gray); }
.quiz-error { color: var(--danger); }
.loading-spinner { width: 40px; height: 40px; border: 3px solid rgba(108, 92, 231, 0.2); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px; }
@keyframes spin { to { transform: rotate(360deg); } }

.role-badge { padding: 6px 12px; border-radius: 20px; font-weight: 600; font-size: 0.85rem; }
.badge-host { background: rgba(253, 203, 110, 0.2); color: var(--warning); border: 1px solid rgba(253, 203, 110, 0.4); }
.badge-player { background: rgba(0, 184, 148, 0.2); color: var(--success); border: 1px solid rgba(0, 184, 148, 0.4); }

/* Хост */
.host-panel { max-width: 600px; margin: 30px auto; text-align: center; }
.question-preview { background: var(--card-bg); border-radius: 20px; padding: 24px; margin-bottom: 24px; text-align: left; border: 1px solid rgba(255,255,255,0.06); }
.options-preview { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 16px; }
.option-preview { display: flex; align-items: center; gap: 12px; padding: 14px; background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); }
.correct-indicator { margin-left: auto; font-size: 1.2rem; }
.host-controls { display: flex; flex-direction: column; align-items: center; gap: 16px; }
.player-counter { display: flex; align-items: center; gap: 8px; color: var(--gray); font-size: 0.95rem; }
.btn-next-host { width: 100%; max-width: 400px; padding: 16px; background: linear-gradient(135deg, var(--primary), var(--accent)); border: none; border-radius: 14px; color: #fff; font-size: 1.1rem; font-weight: 700; cursor: pointer; transition: all 0.3s; }
.btn-next-host:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 30px rgba(108, 92, 231, 0.3); }
.btn-next-host:disabled { opacity: 0.6; cursor: not-allowed; }
.host-hint { font-size: 0.85rem; color: var(--gray); margin-top: 8px; }

/* Игрок */
.waiting-next { margin-top: 20px; padding: 16px; background: rgba(0, 184, 148, 0.1); border-radius: 12px; text-align: center; color: var(--success); }
.game-sidebar { position: fixed; right: 20px; top: 100px; width: 200px; display: flex; flex-direction: column; gap: 15px; z-index: 10; }
.mini-leaderboard { background: var(--card-bg); border-radius: 16px; padding: 15px; border: 1px solid rgba(255,255,255,0.06); }
.mini-leaderboard h4 { margin: 0 0 10px 0; font-size: 0.9rem; }
.leader-item { display: flex; justify-content: space-between; padding: 6px 0; font-size: 0.85rem; border-bottom: 1px solid rgba(255,255,255,0.05); }
.leader-item:last-child { border-bottom: none; }
.leader-item .rank { font-weight: 700; color: var(--primary); }
.leader-item .name { flex: 1; margin: 0 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.leader-item .score { font-weight: 600; }
.waiting-start { text-align: center; padding: 60px 20px; color: var(--gray); }
.waiting-icon { font-size: 3rem; margin-bottom: 16px; animation: pulse 2s infinite; }
@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }

@media (max-width: 768px) {
  .game-sidebar { position: static; width: 100%; flex-direction: row; justify-content: space-between; margin: 20px 0; }
  .options-preview { grid-template-columns: 1fr; }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.current-nickname {
  font-weight: 600;
  font-size: 0.85rem;
  color: #fff;
  background: linear-gradient(135deg, rgba(108, 92, 231, 0.2), rgba(253, 121, 168, 0.2));
  border: 1px solid rgba(108, 92, 231, 0.3);
  padding: 6px 12px;
  border-radius: 20px;
  white-space: nowrap;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Адаптив для мобильных */
@media (max-width: 600px) {
  .quiz-header {
    flex-wrap: wrap;
    gap: 12px;
  }
  .header-right {
    width: 100%;
    justify-content: flex-start;
  }
  .current-nickname {
    order: -1; /* Никнейм первым на мобилке */
  }
}

</style>