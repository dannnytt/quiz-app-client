<template>
  <div class="results-container">
    <div class="results-emoji">{{ data.emoji || '🏆' }}</div>
    <div class="results-title">{{ title }}</div>
    <div class="results-subtitle">{{ subtitle }}</div>

    <div class="score-circle" :style="{ '--score-pct': pct + '%' }">
      <div class="score-circle-inner">
        <div class="score-number">{{ pct }}%</div>
        <div class="score-label">результат</div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card correct-stat"><div class="stat-value">{{ data.correct }}</div><div class="stat-label">Верных</div></div>
      <div class="stat-card wrong-stat"><div class="stat-value">{{ data.total - data.correct }}</div><div class="stat-label">Ошибок</div></div>
      <div class="stat-card time-stat"><div class="stat-value">{{ data.time }}с</div><div class="stat-label">Время</div></div>
    </div>

    <div class="results-actions">
      <button class="btn-retry" @click="$router.push(`/quiz/${data.quizId}`)">🔄 Пройти снова</button>
      <button class="btn-home" @click="$router.push('/')">🏠 На главную</button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { store } from '../composables/useQuizStore'

const data = computed(() => store.lastResult || { correct: 0, total: 1, time: 0, emoji: '🏆', quizId: '' })
const pct = computed(() => Math.round((data.value.correct / data.value.total) * 100))

const title = computed(() => {
  if (pct.value === 100) return 'Идеально!'
  if (pct.value >= 80) return 'Отлично!'
  if (pct.value >= 60) return 'Хорошо!'
  if (pct.value >= 40) return 'Так себе'
  return 'Не расстраивайся!'
})
const subtitle = computed(() => {
  if (pct.value === 100) return 'Ты ответил на все вопросы верно!'
  if (pct.value >= 80) return 'Потрясающий результат!'
  if (pct.value >= 60) return 'Неплохо, но есть куда расти!'
  if (pct.value >= 40) return 'Попробуй ещё раз!'
  return 'Практика делает мастера!'
})

function launchConfetti() {
  if (pct.value < 70) return
  const colors = ['#6c5ce7', '#fd79a8', '#00cec9', '#fdcb6e', '#e17055', '#00b894']
  for (let i = 0; i < 60; i++) {
    setTimeout(() => {
      const p = document.createElement('div')
      p.className = 'confetti-piece'
      p.style.left = Math.random() * 100 + 'vw'
      p.style.background = colors[Math.floor(Math.random() * colors.length)]
      p.style.width = (Math.random() * 8 + 5) + 'px'
      p.style.height = (Math.random() * 8 + 5) + 'px'
      p.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px'
      p.style.animationDuration = (Math.random() * 2 + 2) + 's'
      document.body.appendChild(p)
      setTimeout(() => p.remove(), 4000)
    }, i * 30)
  }
}

onMounted(launchConfetti)
</script>