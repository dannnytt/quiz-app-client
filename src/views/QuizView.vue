<template>
  <div class="quiz-header">
    <div class="quiz-info">
      <button class="back-btn" @click="goHome">←</button>
      <div class="question-counter">Вопрос <span>{{ current + 1 }}</span> / <span>{{ quiz.questions.length }}</span></div>
    </div>
    <div style="display:flex; gap:8px; align-items:center;">
      <div :class="['timer-display', { warning: timeLeft <= 5 }]">⏱ <span>{{ timeLeft }}</span></div>
      <div class="score-display">⭐ <span>{{ score }}</span></div>
    </div>
  </div>

  <div class="progress-container"><div class="progress-bar" :style="{ width: progress + '%' }"></div></div>

  <div class="question-container" ref="qContainer">
    <div class="question-text">{{ currentQ.q }}</div>
    <div class="options-list">
      <button v-for="(opt, i) in currentQ.options" :key="i"
              :class="['option-btn', { correct: answered && i === currentQ.correct, wrong: answered && selected === i && i !== currentQ.correct, disabled: answered }]"
              @click="selectAnswer(i)">
        <span class="option-letter">{{ String.fromCharCode(65 + i) }}</span>
        <span>{{ opt }}</span>
      </button>
    </div>
    <div v-if="answered" class="explanation">💡 {{ currentQ.explanation }}</div>
    <div v-if="answered" class="next-btn-container">
      <button class="next-btn" @click="nextQuestion">{{ isLast ? 'Завершить' : 'Далее →' }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { store } from '../composables/useQuizStore'

const route = useRoute()
const router = useRouter()
const quiz = store.getQuiz(route.params.id)

if (!quiz) router.replace('/')

const current = ref(0)
const score = ref(0)
const correct = ref(0)
const wrong = ref(0)
const timeLeft = ref(quiz.timePerQuestion)
const totalTime = ref(0)
const answered = ref(false)
const selected = ref(null)
const qContainer = ref(null)

let timer = null, totalTimer = null

const currentQ = computed(() => quiz.questions[current.value])
const isLast = computed(() => current.value === quiz.questions.length - 1)
const progress = computed(() => (current.value / quiz.questions.length) * 100)

function startTimers() {
  totalTimer = setInterval(() => totalTime.value++, 1000)
  timer = setInterval(() => {
    if (--timeLeft.value <= 0) timeUp()
  }, 1000)
}

function timeUp() {
  if (answered.value) return
  answered.value = true
  wrong.value++
  clearInterval(timer)
}

function selectAnswer(i) {
  if (answered.value) return
  answered.value = true
  selected.value = i
  clearInterval(timer)

  if (i === currentQ.value.correct) {
    correct.value++
    score.value += 100 + Math.round((timeLeft.value / quiz.timePerQuestion) * 50)
  } else {
    wrong.value++
  }
}

function nextQuestion() {
  if (isLast.value) {
    clearInterval(timer)
    clearInterval(totalTimer)
    store.addResult({ quizId: quiz.id, quizName: quiz.title, emoji: quiz.emoji, correct: correct.value, total: quiz.questions.length, score: score.value, time: totalTime.value })
    router.push('/results')
  } else {
    current.value++
    timeLeft.value = quiz.timePerQuestion
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
  clearInterval(timer)
  clearInterval(totalTimer)
  router.push('/')
}

onMounted(startTimers)
onUnmounted(() => { clearInterval(timer); clearInterval(totalTimer) })
</script>