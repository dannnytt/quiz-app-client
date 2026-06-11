<template>
  <div v-if="loading" class="quiz-loading">
    <div class="loading-spinner"></div>
    <p>Подготовка игры...</p>
  </div>

  <div v-else-if="error" class="quiz-error">
    <p>{{ error }}</p>
    <button class="back-btn" @click="leaveSession" style="margin-top: 16px;">На главную</button>
  </div>

  <template v-else>
    <div class="quiz-header">
      <div class="quiz-info">
        <button class="back-btn" @click="leaveSession">←</button>
        <div class="question-counter">
          <span>{{ currentQuestionIndex + 1 }}</span> / <span>{{ totalQuestions }}</span>
        </div>
      </div>
      
      <div class="header-right">
        <div v-if="!isHost" class="score-display">★ {{ myScore }}</div>
      </div>
    </div>

    <div class="progress-container">
      <div class="progress-bar" :style="{ width: progress + '%' }"></div>
    </div>

    <!-- ХОСТ -->
    <div v-if="isHost && sessionStatus === 'active'" class="host-panel">
      <div class="question-preview">
        
        <div v-if="currentQuestion?.image" class="question-image-container">
          <img 
            :src="getImageUrl(currentQuestion.image)" 
            alt="Question image" 
            class="question-image"
            @error="handleImageError"
          />
        </div>

        <h3 class="question-text">{{ currentQuestion?.q || currentQuestion?.text || 'Загрузка...' }}</h3>
        <div class="options-preview">
          <div v-for="(opt, i) in currentQuestion?.options" :key="i" class="option-preview">
            <span class="option-letter">{{ String.fromCharCode(65 + i) }}</span>
            <span class="option-text">{{ opt }}</span>
            <span v-if="i === currentQuestion?.correct" class="correct-indicator">✓</span>
          </div>
        </div>
      </div>

      <div class="host-controls">
        <div class="player-counter">
          <span> Игроков: {{ players.length }}</span>
        </div>
        <button class="btn-next-host" @click="nextQuestionHost" :disabled="advancing">
          {{ advancing ? 'Переход...' : (isLastQuestion ? 'Завершить игру' : 'Следующий вопрос →') }}
        </button>
      </div>
    </div>

    <!-- ИГРОК -->
    <div v-else-if="!isHost && sessionStatus === 'active'" class="player-panel">
      <div class="question-container" ref="qContainer">
        
        <div v-if="currentQuestion?.image" class="question-image-container">
          <img 
            :src="getImageUrl(currentQuestion.image)" 
            alt="Question image" 
            class="question-image"
            @error="handleImageError"
          />
        </div>
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
            <span class="option-text">{{ opt }}</span>
          </button>
        </div>

        <div v-if="answered" class="explanation">{{ currentQuestion?.explanation }}</div>
      </div>

      <!-- Sidebar с таймером и лидербордом -->
      <div class="game-sidebar">
        <div v-if="!answered" :class="['timer-display', { warning: timeLeft <= 5 }]">
          ⏱ {{ timeLeft }}с
        </div>
        <div v-if="leaderboard.length" class="mini-leaderboard">
          <h4>Топ-3</h4>
          <div v-for="(p, i) in leaderboard.slice(0, 3)" :key="p.nickname" class="leader-item">
            <span class="rank">#{{ i + 1 }}</span>
            <span class="name">{{ p.nickname }}</span>
            <span class="score">{{ p.score }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Ожидание -->
    <div v-if="sessionStatus === 'waiting'" class="waiting-start">
      <p v-if="isHost">Нажмите «Начать игру» в лобби, чтобы запустить квиз.</p>
      <p v-else>Ожидайте начала игры...</p>
    </div>
  </template>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, getImageUrl } from '../api'
import { store } from '../composables/useQuizStore'
import { showToast } from '../composables/useToast'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref(null)
const advancing = ref(false)

const sessionId = ref(route.params.sessionId)
const sessionStatus = ref('waiting')
const players = ref([])
const leaderboard = ref([])

const playerToken = ref('')
const myNickname = ref('')
const isHost = ref(false)
const myScore = ref(0)

const quiz = ref(null)
const questions = ref([])
const totalQuestions = ref(0)
const currentQuestionIndex = ref(0)
const lastProcessedQuestionIndex = ref(-1)

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
    isHost.value = data.isHost || false
    
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
    explanation: qs.explanation || '',
    image: qs.image || null
  }))
}

async function loadSessionState() {
  try {
    const state = await api.getSessionState(sessionId.value)
    sessionStatus.value = state.status
    players.value = state.players || []
    
    if (state.status === 'active' || state.status === 'finished') {
      try {
        const lb = await api.getLeaderboard(sessionId.value)
        leaderboard.value = lb.leaderboard || []
        const me = leaderboard.value.find(p => p.nickname === myNickname.value)
        if (me) myScore.value = me.score
      } catch (e) { 
        console.error('Leaderboard error:', e) 
      }
    }
    
    const newIdx = state.current_question ?? 0
    if (newIdx !== lastProcessedQuestionIndex.value) {
      lastProcessedQuestionIndex.value = newIdx
      currentQuestionIndex.value = newIdx
      
      answered.value = false
      selected.value = null
      canAnswer.value = true
      timeLeft.value = quizTime.value
      
      if (!isHost.value && state.status === 'active') {
        startQuestionTimer()
      }
    }
    
    if (state.status === 'finished') {
      clearInterval(pollInterval)
      stopQuestionTimer()
      showToast('Игра завершена! Загрузка результатов...', 'success')
      setTimeout(() => {
        showFinalResults()
      }, 1000)
    }
    
  } catch (e) {
    console.error('Session state load failed:', e)
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
  showToast('Время вышло!', 'error')
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
    const safeTimeLeft = Math.max(0, Math.min(timeLeft.value, quizTime.value))
    
    const result = await api.submitAnswer(
      sessionId.value,
      playerToken.value,
      currentQuestionIndex.value,
      optionIndex,
      safeTimeLeft
    )
    
    if (result?.correct) {
      const bonus = Math.round((safeTimeLeft / quizTime.value) * 50)
      showToast(`Верно! +${100 + bonus} очков`, 'success')
      myScore.value = result.score
    } else {
      showToast('Неверно', 'error')
    }
    
  } catch (e) { 
    console.error('Submit answer failed:', e)
    showToast('Ошибка отправки ответа', 'error')
  }
}

async function nextQuestionHost() {
  if (advancing.value) return
  advancing.value = true
  
  try {
    if (isLastQuestion.value) {
      try {
        await api.finishSession(sessionId.value)
        showToast('Игра завершена!', 'success')
      } catch (finishError) {
        console.warn('Finish session error (continuing):', finishError)
        showToast('Игра завершена', 'warning')
      }
      showFinalResults()
    } else {
      await api.nextQuestion(sessionId.value)
      showToast('Следующий вопрос!', 'success')
    }
  } catch (e) {
    console.error('Game progression failed:', e)
    if (isHost.value) {
      showToast('Ошибка перехода', 'error')
    }
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

function handleImageError(e) {
  console.error('Failed to load image:', e.target.src)
  e.target.style.display = 'none'
}

onMounted(init)
onUnmounted(() => { stopQuestionTimer(); if (pollInterval) clearInterval(pollInterval) })
</script>

<style scoped>
.quiz-loading, .quiz-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  padding: 40px 20px;
  color: var(--gray);
}
.quiz-error { color: var(--danger); }

.loading-spinner {
  width: 44px;
  height: 44px;
  border: 3px solid rgba(108, 92, 231, 0.2);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* === HEADER === */
.quiz-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  gap: 12px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);
}

.quiz-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.question-counter {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--dark);
}
.question-counter span { color: var(--primary); }

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.score-display {
  padding: 8px 14px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  background: var(--card-bg2);
  border: 1px solid var(--border);
  white-space: nowrap;
}

/* === PROGRESS BAR === */
.progress-container {
  width: 100%;
  height: 6px;
  background: var(--border);
  border-radius: 3px;
  overflow: hidden;
}
.progress-bar {
  height: 100%;
  background: var(--primary);
  transition: width 0.4s ease;
}

/* === BACK BUTTON === */
.back-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card-bg2);
  border: 1px solid var(--border);
  border-radius: 12px;
  font-size: 1.2rem;
  cursor: pointer;
}

/* === MAIN LAYOUT: Grid с фиксированными зонами === */
.player-panel {
  display: grid;
  grid-template-rows: 1fr auto; /* Вопрос занимает всё место, sidebar фиксирован */
  height: calc(100vh - 120px); /* Вычитаем header + progress */
  overflow: hidden;
}

/* === QUESTION AREA (скроллится внутри) === */
.question-container {
  padding: 20px 16px;
  overflow-y: auto;
  animation: slideIn 0.4s ease;
  position: relative;
}

.question-image-container {
  margin-bottom: 20px;
  text-align: center;
}
.question-image {
  max-width: 100%;
  max-height: 25vh;
  object-fit: contain;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--card-bg2);
}

.question-text {
  font-size: clamp(1.2rem, 5vw, 1.6rem);
  font-weight: 700;
  text-align: center;
  color: var(--dark);
  line-height: 1.4;
  margin-bottom: 24px;
}

/* === OPTIONS === */
.options-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.option-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  background: var(--card-bg);
  border: 2px solid var(--border);
  border-radius: 16px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--dark);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  min-height: 56px;
}
.option-btn:active:not(.disabled) { transform: scale(0.98); }

.option-letter {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--card-bg2);
  font-weight: 800;
  color: var(--primary);
  flex-shrink: 0;
}

.option-btn.correct {
  background: rgba(0, 184, 148, 0.12);
  border-color: #00b894;
  color: #00896b;
}
.option-btn.wrong {
  background: rgba(225, 112, 85, 0.12);
  border-color: #e17055;
  color: #c0392b;
}
.option-btn.disabled {
  opacity: 0.6;
  cursor: default;
  pointer-events: none;
}

/* === EXPLANATION === */
.explanation {
  margin-top: 20px;
  padding: 16px;
  background: rgba(108, 92, 231, 0.08);
  border-radius: 14px;
  border-left: 4px solid var(--primary);
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--dark);
}

/* === WAITING NEXT (overlay поверх вопроса, не двигает layout) === */
.waiting-next {
  position: absolute;
  bottom: 20px;
  left: 16px;
  right: 16px;
  padding: 14px;
  background: rgba(0, 184, 148, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 14px;
  text-align: center;
  color: #fff;
  font-weight: 600;
  font-size: 0.9rem;
  box-shadow: 0 4px 20px rgba(0, 184, 148, 0.3);
  animation: slideUp 0.3s ease;
  z-index: 5;
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* === GAME SIDEBAR (фиксирован внизу, не двигается) === */
.game-sidebar {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--card-bg);
  border-top: 1px solid var(--border);
  gap: 12px;
  /* Фиксированная высота — не меняется при появлении waiting-next */
  min-height: 70px;
  flex-shrink: 0;
}

.timer-display {
  padding: 8px 14px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 700;
  background: var(--card-bg2);
  border: 1px solid var(--border);
  white-space: nowrap;
}
.timer-display.warning {
  background: rgba(225, 112, 85, 0.15);
  color: var(--danger);
  border-color: rgba(225, 112, 85, 0.3);
  animation: pulse-timer 1s infinite;
}
@keyframes pulse-timer { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }

.mini-leaderboard {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  max-width: 60%;
}
.mini-leaderboard h4 {
  margin: 0;
  font-size: 0.85rem;
  color: var(--gray);
  font-weight: 600;
  display: none;
}

.leader-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: var(--card-bg2);
  border-radius: 10px;
  border: 1px solid var(--border);
  font-size: 0.8rem;
  white-space: nowrap;
}
.leader-item .rank { color: var(--primary); font-weight: 800; }
.leader-item .name { color: var(--dark); font-weight: 600; }
.leader-item .score { font-weight: 700; color: var(--dark); }

/* === HOST PANEL === */
.host-panel {
  padding: 20px 16px 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-height: calc(100vh - 120px);
}

.question-preview {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 24px;
  flex: 1;
}

.options-preview {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-top: 20px;
}

.option-preview {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  background: var(--card-bg);
  border: 2px solid var(--border);
  border-radius: 16px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--dark);
  min-height: 56px;
}

.correct-indicator {
  margin-left: auto;
  padding: 4px 12px;
  border: 1px solid rgba(0, 184, 148, 0.4);
  border-radius: 20px;
  color: #00b894;
  font-size: 0.8rem;
  font-weight: 700;
  background: rgba(0, 184, 148, 0.1);
}

.host-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.player-counter {
  text-align: center;
  color: var(--gray);
  font-size: 0.95rem;
  font-weight: 600;
}

.btn-next-host {
  width: 100%;
  padding: 16px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 16px;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 56px;
}
.btn-next-host:active:not(:disabled) { transform: scale(0.98); }
.btn-next-host:disabled { opacity: 0.6; cursor: not-allowed; }

/* === WAITING START === */
.waiting-start {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  padding: 40px 20px;
  color: var(--gray);
}
.waiting-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  animation: pulse 2s infinite;
}
@keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }

/* === MOBILE === */
@media (max-width: 600px) {
  .quiz-header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 10px 12px;
  }
  .quiz-info { justify-content: space-between; }
  .header-right {
    display: flex;
    justify-content: space-between;
    gap: 8px;
  }
  .score-display {
    flex: 1;
    text-align: center;
    padding: 10px;
    font-size: 0.85rem;
  }
  .question-text { margin-bottom: 18px; }
  .option-btn, .option-preview { padding: 14px 16px; }
  .explanation { padding: 14px; font-size: 0.9rem; }
  .waiting-next {
    left: 12px;
    right: 12px;
    bottom: 16px;
    font-size: 0.85rem;
  }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}
</style>