<template>
  <div v-if="loading" class="quiz-loading">
    <div class="loading-spinner"></div>
    <p>Загрузка квиза...</p>
  </div>

  <div v-else-if="error || !quiz" class="quiz-error">
    <p>{{ error || 'Квиз не найден' }}</p>
    <button class="back-btn" @click="goHome" style="margin-top: 16px;">На главную</button>
  </div>

  <template v-else>
    <div class="quiz-header">
      <div class="quiz-info">
        <button class="back-btn" @click="goHome">←</button>
        <div class="question-counter">
          Вопрос <span>{{ current + 1 }}</span> / <span>{{ quiz.questions?.length || 0 }}</span>
        </div>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <div :class="['timer-display', { warning: timeLeft <= 5 }]">
          Таймер: <span>{{ timeLeft }}с</span>
        </div>
        <div class="score-display"><span>{{ score }}</span></div>
      </div>
    </div>

    <div class="progress-container">
      <div class="progress-bar" :style="{ width: progress + '%' }"></div>
    </div>

    <div class="question-container" ref="qContainer">
      <div class="question-text">{{ currentQ?.q || currentQ?.text }}</div>
      
      <div class="options-list">
        <button 
          v-for="(opt, i) in currentQ?.options" 
          :key="i"
          :class="[
            'option-btn', 
            { 
              correct: answered && i === currentQ.correct, 
              wrong: answered && selected === i && i !== currentQ.correct, 
              disabled: answered 
            }
          ]"
          @click="selectAnswer(i)"
        >
          <span class="option-letter">{{ String.fromCharCode(65 + i) }}</span>
          <span>{{ opt }}</span>
        </button>
      </div>

      <div v-if="answered" class="explanation">
        {{ currentQ?.explanation }}
      </div>

      <div v-if="answered" class="next-btn-container">
        <button class="next-btn" @click="nextQuestion">
          {{ isLast ? 'Завершить' : 'Далее →' }}
        </button>
      </div>
    </div>
  </template>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { store } from '../composables/useQuizStore'
import { showToast } from '../composables/useToast'

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
    // ✅ Поддержка обоих форматов времени
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
    showToast('✅ Верно! +' + (100 + speedBonus), 'success')
  } else {
    wrongCount.value++
    showToast('❌ Неверно', 'error')
  }
}

async function nextQuestion() {
  if (!quiz.value) return
  
  if (isLast.value) {
    stopTimers()
    try {
      await store.addResult({
        quiz_id: quiz.value.id,  // ✅ snake_case для бэкенда
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
.quiz-loading, .quiz-error {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 300px; text-align: center; padding: 40px 20px; color: var(--gray);
}
.quiz-error { color: var(--danger); }
.loading-spinner {
  width: 40px; height: 40px; border: 3px solid rgba(108, 92, 231, 0.2);
  border-top-color: var(--primary); border-radius: 50%;
  animation: spin 1s linear infinite; margin-bottom: 16px;
}
@keyframes spin { to { transform: rotate(360deg); } }
.question-container { animation: slideIn 0.4s ease; }
@keyframes slideIn {
  from { opacity: 0; transform: translateX(30px); }
  to { opacity: 1; transform: translateX(0); }
}
@media (max-width: 500px) {
  .quiz-header { flex-direction: column; align-items: flex-start; gap: 12px; }
  .question-text { font-size: 1.15rem; }
  .option-btn { padding: 14px 18px; font-size: 0.95rem; }
}
</style>