<template>
  <div class="quiz-header">
    <div class="quiz-info">
      <button class="back-btn" @click="$router.push('/')">←</button>
      <div class="question-counter">Мои результаты</div>
    </div>
    <button class="back-btn" @click="clearResults" title="Очистить">🗑️</button>
  </div>

  <div v-if="store.loading" class="loading">Загрузка...</div>
  
  <div v-else-if="!store.results?.length" class="no-results">
    <div class="no-results-emoji">📊</div>
    <p>Вы ещё не проходили квизы</p>
  </div>

  <div v-else class="results-list">
    <div v-for="r in normalizedResults" :key="r.id || r._uid" class="result-item">
      <span class="result-emoji">{{ r.emoji || '📝' }}</span>
      <div class="result-info">
        <h4>{{ r.quizName || r.quiz_name || 'Неизвестный квиз' }}</h4>
        <p>
          {{ r.correct ?? 0 }}/{{ r.total ?? 0 }} верных · 
          {{ r.time ?? 0 }}с · 
          {{ formatDate(r.created_at || r.date) }}
        </p>
      </div>
      <div :class="['result-pct', getPctClass(r)]">
        {{ getPercentage(r) }}%
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { store } from '../composables/useQuizStore'
import { showToast } from '../composables/useToast'

const normalizedResults = computed(() => 
  (store.results || []).map(r => ({
    _uid: r.id || r._uid || Date.now() + Math.random(),
    quizName: r.quiz_name || r.quizName,
    quizId: r.quiz_id || r.quizId,
    emoji: r.emoji,
    correct: r.correct ?? 0,
    total: r.total ?? 1,
    score: r.score ?? 0,
    time: r.time ?? 0,
    created_at: r.created_at || r.date,
    _original: r
  }))
)

const formatDate = (d) => {
  if (!d) return ''
  const date = new Date(d)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleDateString('ru-RU', { 
    day: 'numeric', 
    month: 'short', 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

const getPctClass = (r) => {
  const pct = getPercentage(r)
  if (pct >= 70) return 'high'
  if (pct >= 40) return 'mid'
  return 'low'
}

const getPercentage = (r) => {
  const total = r.total ?? 1
  const correct = r.correct ?? 0
  if (total === 0) return 0
  return Math.round((correct / total) * 100)
}

async function clearResults() {
  if (confirm('Очистить всю историю результатов?')) {
    try {
      await store.clearResults()
      showToast('История очищена', 'success')
    } catch (e) {
      console.error('Clear failed:', e)
      showToast('Ошибка при очистке', 'error')
    }
  }
}
</script>

<style scoped>
.loading, .no-results {
  text-align: center;
  padding: 60px 20px;
  color: var(--gray);
}

.no-results-emoji {
  font-size: 3rem;
  margin-bottom: 12px;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.result-item {
  background: var(--card-bg);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: transform 0.2s, box-shadow 0.2s;
}

.result-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.2);
}

.result-emoji {
  font-size: 2rem;
  flex-shrink: 0;
}

.result-info {
  flex: 1;
  min-width: 0;
}

.result-info h4 {
  font-weight: 700;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.result-info p {
  color: var(--gray);
  font-size: 0.85rem;
}

.result-pct {
  font-size: 1.5rem;
  font-weight: 800;
  min-width: 60px;
  text-align: right;
}

.result-pct.high { color: var(--success); }
.result-pct.mid { color: var(--warning); }
.result-pct.low { color: var(--danger); }
</style>