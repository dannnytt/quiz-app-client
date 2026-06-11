<template>
  <div v-if="loading" class="quiz-loading">
    <div class="loading-spinner"></div>
    <p>Загрузка квиза...</p>
  </div>

  <div v-else-if="error || !quiz" class="quiz-error">
    <p>{{ error || 'Квиз не найден' }}</p>
    <button class="back-btn-large" @click="goHome">← На главную</button>
  </div>

  <template v-else>
    <div class="quiz-wrapper">
      <!-- === HEADER === -->
      <div class="quiz-header">
        <div class="header-left">
          <button class="back-btn" @click="goHome" title="На главную">←</button>
          <div class="quiz-title-mini">{{ quiz.title }}</div>
        </div>
        
        <div class="header-center">
          <div class="question-counter">
            <span class="current-q">{{ current + 1 }}</span>
            <span class="separator">/</span>
            <span class="total-q">{{ quiz.questions?.length || 0 }}</span>
          </div>
        </div>
        
        <div class="header-right">
          <!-- Круговой таймер -->
          <div :class="['timer-circle', { warning: timeLeft <= 5, danger: timeLeft <= 3 }]">
            <svg class="timer-svg" viewBox="0 0 60 60">
              <circle class="timer-bg" cx="30" cy="30" r="26" />
              <circle 
                class="timer-progress" 
                cx="30" cy="30" r="26"
                :style="{ strokeDashoffset: timerOffset }"
              />
            </svg>
            <span class="timer-value">{{ timeLeft }}</span>
          </div>
          
          <!-- Счёт -->
          <div class="score-badge">
            <span class="score-value">Очки: {{ score }}</span>
          </div>
        </div>
      </div>

      <!-- === PROGRESS BAR === -->
      <div class="progress-container">
        <div class="progress-bar" :style="{ width: progress + '%' }"></div>
      </div>

      <!-- === QUESTION CARD === -->
      <div class="question-container" ref="qContainer">
        <div class="question-card">
          
          <!-- Изображение -->
          <div v-if="currentQ?.image" class="question-image-container">
            <img 
              :src="getImageUrl(currentQ.image)" 
              alt="Question image" 
              class="question-image"
              @error="handleImageError"
            />
          </div>
          
          <!-- Текст вопроса -->
          <div class="question-text">{{ currentQ?.q || currentQ?.text }}</div>
          
          <!-- Варианты ответов (сетка 2x2 на десктопе) -->
          <div class="options-grid">
            <button 
              v-for="(opt, i) in currentQ?.options" 
              :key="i"
              :class="[
                'option-btn', 
                `option-${i}`,
                { 
                  correct: answered && i === currentQ.correct, 
                  wrong: answered && selected === i && i !== currentQ.correct, 
                  selected: answered && selected === i,
                  disabled: answered 
                }
              ]"
              @click="selectAnswer(i)"
              :style="{ animationDelay: `${i * 0.08}s` }"
            >
              <span class="option-letter">{{ String.fromCharCode(65 + i) }}</span>
              <span class="option-text">{{ opt }}</span>
              <span v-if="answered && i === currentQ.correct" class="option-icon">✓</span>
              <span v-else-if="answered && selected === i && i !== currentQ.correct" class="option-icon">✗</span>
            </button>
          </div>

          <!-- Пояснение -->
          <transition name="fade">
            <div v-if="answered && currentQ?.explanation" class="explanation">
              <div class="explanation-header">Пояснение</div>
              <div class="explanation-text">{{ currentQ.explanation }}</div>
            </div>
          </transition>
        </div>

        <!-- Кнопка "Далее" -->
        <transition name="fade">
          <div v-if="answered" class="next-btn-container">
            <button class="next-btn" @click="nextQuestion">
              {{ isLast ? 'Завершить' : 'Далее' }}
            </button>
          </div>
        </transition>
      </div>
    </div>
  </template>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { store } from '../composables/useQuizStore'
import { showToast } from '../composables/useToast'
import { getImageUrl } from '../api'

const route = useRoute()
const router = useRouter()

const quiz = ref(null)
const loading = ref(true)
const error = ref(null)

const current = ref(0)
const score = ref(0)
const correctCount = ref(0)
const wrongCount = ref(0)
const timeLeft = ref(30)
const totalTime = ref(0)
const answered = ref(false)
const selected = ref(null)
const qContainer = ref(null)

let questionTimer = null
let totalTimer = null

const currentQ = computed(() => quiz.value?.questions?.[current.value])
const isLast = computed(() => current.value >= (quiz.value?.questions?.length - 1))
const progress = computed(() => {
  if (!quiz.value?.questions?.length) return 0
  return (current.value / quiz.value.questions.length) * 100
})

// ✅ Круговой таймер: смещение stroke-dashoffset
const timerOffset = computed(() => {
  const maxTime = quiz.value?.timePerQuestion || quiz.value?.time_per_question || 30
  const ratio = timeLeft.value / maxTime
  const circumference = 2 * Math.PI * 26 // ~163.36
  return circumference * (1 - ratio)
})

async function loadQuiz() {
  loading.value = true
  error.value = null
  
  try {
    if (store.loading) {
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (!store.loading) { clearInterval(check); resolve() }
        }, 50)
      })
    }
    
    const found = store.getQuiz(route.params.id)
    if (!found) {
      error.value = 'Квиз не найден'
      return
    }
    
    quiz.value = found
    timeLeft.value = found.timePerQuestion || found.time_per_question || 30
    
  } catch (e) {
    console.error('Failed to load quiz:', e)
    error.value = 'Ошибка загрузки: ' + e.message
  } finally {
    loading.value = false
  }
}

function startTimers() {
  totalTimer = setInterval(() => { totalTime.value++ }, 1000)
  questionTimer = setInterval(() => {
    timeLeft.value--
    if (timeLeft.value <= 0) timeUp()
  }, 1000)
}

function stopTimers() {
  if (questionTimer) clearInterval(questionTimer)
  if (totalTimer) clearInterval(totalTimer)
  questionTimer = null
  totalTimer = null
}

function timeUp() {
  if (answered.value || !quiz.value) return
  answered.value = true
  wrongCount.value++
  stopTimers()
  showToast('Время вышло!', 'error')
}

function selectAnswer(index) {
  if (answered.value || !quiz.value) return
  answered.value = true
  selected.value = index
  stopTimers()
  
  const q = currentQ.value
  if (!q) return
  
  if (index === q.correct) {
    correctCount.value++
    const timePerQ = quiz.value.timePerQuestion || quiz.value.time_per_question || 30
    const speedBonus = Math.round((timeLeft.value / timePerQ) * 50)
    score.value += 100 + speedBonus
    showToast('Верно! +' + (100 + speedBonus), 'success')
  } else {
    wrongCount.value++
    showToast('Неверно', 'error')
  }
}

async function nextQuestion() {
  if (!quiz.value) return
  
  if (isLast.value) {
    stopTimers()
    try {
      await store.addResult({
        quiz_id: quiz.value.id,
        quiz_name: quiz.value.title,
        emoji: quiz.value.emoji,
        correct: correctCount.value,
        total: quiz.value.questions.length,
        score: score.value,
        time: totalTime.value
      })
      router.push('/results')
    } catch (e) {
      console.error('Failed to save result:', e)
      showToast('Не удалось сохранить результат', 'error')
      router.push('/results')
    }
  } else {
    current.value++
    timeLeft.value = quiz.value.timePerQuestion || quiz.value.time_per_question || 30
    answered.value = false
    selected.value = null
    
    if (qContainer.value) {
      qContainer.value.style.animation = 'none'
      qContainer.value.offsetHeight
      qContainer.value.style.animation = 'slideIn 0.4s ease'
    }
    startTimers()
  }
}

function goHome() {
  stopTimers()
  router.push('/')
}

function handleImageError(e) {
  console.error('Failed to load image:', e.target.src)
  e.target.style.display = 'none'
}

onMounted(async () => {
  await loadQuiz()
  if (quiz.value && !error.value) startTimers()
})

onUnmounted(() => stopTimers())

watch(() => route.params.id, async (newId, oldId) => {
  if (newId !== oldId) {
    stopTimers()
    current.value = 0; score.value = 0; correctCount.value = 0
    wrongCount.value = 0; totalTime.value = 0; answered.value = false; selected.value = null
    await loadQuiz()
    if (quiz.value && !error.value) startTimers()
  }
})
</script>

<style scoped>
/* === LOADING / ERROR === */
.quiz-loading, .quiz-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 70vh;
  text-align: center;
  padding: 40px 20px;
  color: var(--gray);
}
.quiz-error { color: var(--dark); }
.error-icon { font-size: 4rem; margin-bottom: 16px; }

.loading-spinner {
  width: 56px;
  height: 56px;
  border: 4px solid rgba(108, 92, 231, 0.15);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 20px;
}
@keyframes spin { to { transform: rotate(360deg); } }

.back-btn-large {
  margin-top: 20px;
  padding: 12px 24px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

/* === WRAPPER === */
.quiz-wrapper {
  min-height: 100vh;
  background: var(--bg);
  display: flex;
  flex-direction: column;
}

/* === HEADER === */
.quiz-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  gap: 16px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 10;
  backdrop-filter: blur(10px);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

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
  transition: all 0.2s;
  flex-shrink: 0;
}
.back-btn:hover {
  background: var(--border);
  transform: translateX(-2px);
}

.quiz-title-mini {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--dark);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-center {
  display: flex;
  align-items: center;
}

.question-counter {
  display: flex;
  align-items: baseline;
  gap: 4px;
  font-size: 1rem;
  color: var(--gray);
}
.current-q {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--primary);
}
.separator {
  color: var(--gray);
  margin: 0 2px;
}
.total-q {
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* === КРУГОВОЙ ТАЙМЕР === */
.timer-circle {
  position: relative;
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.timer-svg {
  position: absolute;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.timer-bg {
  fill: none;
  stroke: var(--border);
  stroke-width: 4;
}

.timer-progress {
  fill: none;
  stroke: var(--primary);
  stroke-width: 4;
  stroke-linecap: round;
  stroke-dasharray: 163.36;
  transition: stroke-dashoffset 1s linear, stroke 0.3s;
}

.timer-circle.warning .timer-progress {
  stroke: var(--warning, #fdcb6e);
}
.timer-circle.danger .timer-progress {
  stroke: var(--danger);
  animation: pulse-stroke 0.5s infinite alternate;
}
@keyframes pulse-stroke {
  from { stroke-width: 4; }
  to { stroke-width: 6; }
}

.timer-value {
  position: relative;
  z-index: 2;
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--dark);
}
.timer-circle.warning .timer-value { color: var(--warning, #f39c12); }
.timer-circle.danger .timer-value { 
  color: var(--danger);
  animation: pulse-value 0.5s infinite alternate;
}
@keyframes pulse-value {
  from { transform: scale(1); }
  to { transform: scale(1.15); }
}

/* === СЧЁТ === */
.score-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  /* background: linear-gradient(135deg, rgba(253, 203, 110, 0.15), rgba(253, 203, 110, 0.05)); */
  /* border: 1px solid; */
  /* border-radius: 20px; */
  font-weight: 700;
}
.score-icon {
  font-size: 1.1rem;
  color: #f39c12;
}
.score-value {
  font-size: 1rem;
  color: var(--dark);
}

/* === PROGRESS BAR === */
.progress-container {
  width: 100%;
  height: 4px;
  background: var(--border);
}
.progress-bar {
  height: 100%;
  background: var(--primary);
  transition: width 0.4s ease;
  box-shadow: 0 0 8px rgba(108, 92, 231, 0.4);
}

/* === QUESTION CONTAINER === */
.question-container {
  flex: 1;
  padding: 32px 24px 40px;
  max-width: 900px;
  width: 100%;
  margin: 0 auto;
  animation: slideIn 0.4s ease;
}

/* === КАРТОЧКА ВОПРОСА === */
.question-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 32px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
}

.question-image-container {
  margin-bottom: 24px;
  text-align: center;
}
.question-image {
  max-width: 100%;
  max-height: 300px;
  object-fit: contain;
  border-radius: 16px;
  border: 1px solid var(--border);
}

.question-text {
  font-size: clamp(1.3rem, 3.5vw, 1.8rem);
  font-weight: 700;
  text-align: center;
  color: var(--dark);
  line-height: 1.4;
  margin-bottom: 32px;
}

/* === СЕТКА ВАРИАНТОВ (2x2 на десктопе) === */
.options-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}

.option-btn {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: var(--card-bg);
  border: 2px solid var(--border);
  border-radius: 16px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--dark);
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  min-height: 64px;
  animation: optionAppear 0.4s ease backwards;
}

@keyframes optionAppear {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.option-btn:hover:not(.disabled) {
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(108, 92, 231, 0.15);
}
.option-btn:active:not(.disabled) {
  transform: scale(0.98);
}

/* Цветные акценты для каждой буквы (как в Kahoot) */
.option-0 { --option-color: #e74c3c; }
.option-1 { --option-color: #3498db; }
.option-2 { --option-color: #f1c40f; }
.option-3 { --option-color: #2ecc71; }

.option-letter {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--option-color);
  color: #fff;
  font-weight: 800;
  font-size: 1.05rem;
  flex-shrink: 0;
  transition: all 0.2s;
}

.option-text {
  flex: 1;
  line-height: 1.3;
}

.option-icon {
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.3rem;
  font-weight: 800;
  animation: popIn 0.3s ease;
}
@keyframes popIn {
  from { transform: translateY(-50%) scale(0); }
  to { transform: translateY(-50%) scale(1); }
}

/* Правильный ответ */
.option-btn.correct {
  background: rgba(46, 204, 113, 0.1);
  border-color: #2ecc71;
}
.option-btn.correct .option-letter {
  background: #2ecc71;
}
.option-btn.correct .option-icon {
  color: #27ae60;
}

/* Неправильный ответ (выбранный) */
.option-btn.wrong {
  background: rgba(231, 76, 60, 0.1);
  border-color: #e74c3c;
}
.option-btn.wrong .option-letter {
  background: #e74c3c;
}
.option-btn.wrong .option-icon {
  color: #c0392b;
}

/* Отключённые */
.option-btn.disabled {
  cursor: default;
  opacity: 0.85;
}
.option-btn.disabled:not(.correct):not(.wrong) {
  opacity: 0.5;
}

/* === ПОЯСНЕНИЕ === */
.explanation {
  margin-top: 24px;
  padding: 20px;
  background: var(--card-bg2);
  border-radius: 16px;
  border: 1px solid rgba(108, 92, 231, 0.15);
}
.explanation-header {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 8px;
}
.explanation-text {
  font-size: 1rem;
  line-height: 1.5;
  color: var(--dark);
}

/* === КНОПКА "ДАЛЕЕ" === */
.next-btn-container {
  margin-top: 24px;
  display: flex;
  justify-content: center;
}
.next-btn {
  padding: 16px 48px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 16px;
  font-size: 1.1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 56px;
  box-shadow: 0 4px 16px rgba(108, 92, 231, 0.3);
}
.next-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(108, 92, 231, 0.4);
}
.next-btn:active {
  transform: scale(0.98);
}

/* === TRANSITIONS === */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@keyframes slideIn {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

/* === МОБИЛЬНАЯ АДАПТАЦИЯ === */
@media (max-width: 768px) {
  .quiz-header {
    padding: 12px 16px;
    gap: 10px;
  }
  .quiz-title-mini {
    font-size: 0.85rem;
    max-width: 100px;
  }
  .question-counter {
    font-size: 0.9rem;
  }
  .current-q {
    font-size: 1.2rem;
  }
  .timer-circle {
    width: 48px;
    height: 48px;
  }
  .timer-value {
    font-size: 1rem;
  }
  .score-badge {
    padding: 6px 12px;
  }
  .score-value {
    font-size: 0.9rem;
  }
  .question-container {
    padding: 20px 16px 32px;
  }
  .question-card {
    padding: 24px 20px;
    border-radius: 20px;
  }
  .question-text {
    margin-bottom: 24px;
  }
  /* На мобильном — одна колонка */
  .options-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  .option-btn {
    padding: 16px 18px;
    min-height: 56px;
  }
  .option-letter {
    width: 32px;
    height: 32px;
    font-size: 0.95rem;
  }
  .next-btn {
    width: 100%;
    padding: 16px;
  }
}

@media (max-width: 480px) {
  .quiz-header {
    padding: 10px 12px;
  }
  .quiz-title-mini {
    display: none; /* Скрываем название на очень маленьких */
  }
  .header-left {
    flex: 0;
  }
  .question-card {
    padding: 20px 16px;
  }
  .question-text {
    font-size: clamp(1.1rem, 5vw, 1.4rem);
    margin-bottom: 20px;
  }
  .option-btn {
    padding: 14px 16px;
    font-size: 0.95rem;
  }
  .explanation {
    padding: 16px;
  }
}
</style>