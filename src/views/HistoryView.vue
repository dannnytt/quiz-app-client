<template>
  <div class="quiz-header">
    <div class="quiz-info">
      <button class="back-btn" @click="$router.push('/')">←</button>
      <div class="question-counter">Мои результаты</div>
    </div>
    <button class="back-btn" @click="clearResults" title="Очистить">🗑️</button>
  </div>

  <div v-if="!store.results.length" class="no-results">
    <div class="no-results-emoji">📊</div>
    <p>Вы ещё не проходили квизы</p>
  </div>

  <div v-else class="results-list">
    <div v-for="r in store.results" :key="r.date" class="result-item">
      <span class="result-emoji">{{ r.emoji || '📝' }}</span>
      <div class="result-info">
        <h4>{{ r.quizName }}</h4>
        <p>{{ r.correct }}/{{ r.total }} верных · {{ r.time }}с · {{ formatDate(r.date) }}</p>
      </div>
      <div :class="['result-pct', r.correct/r.total >= 0.7 ? 'high' : r.correct/r.total >= 0.4 ? 'mid' : 'low']">
        {{ Math.round((r.correct / r.total) * 100) }}%
      </div>
    </div>
  </div>
</template>

<script setup>
import { store } from '../composables/useQuizStore'
import { showToast } from '../composables/useToast'

const formatDate = (d) => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

function clearResults() {
  if (confirm('Очистить всю историю результатов?')) {
    store.clearResults()
    showToast('История очищена', 'success')
  }
}
</script>