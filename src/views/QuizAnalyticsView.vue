<template>
  <div class="analytics-container">
    <!-- Заголовок -->
    <div class="analytics-header">
      <button class="back-btn" @click="$router.push('/')">←</button>
      <h2>Аналитика: {{ analytics?.quiz_title }}</h2>
      <button v-if="analytics" class="btn-export" @click="exportData">
        Экспорт CSV
      </button>
    </div>

    <!-- Загрузка -->
    <div v-if="loading" class="analytics-loading">
      <div class="loading-spinner"></div>
      <p>Загрузка статистики...</p>
    </div>

    <!-- Ошибка -->
    <div v-else-if="error" class="analytics-error">
      <p>{{ error }}</p>
      <button class="back-btn" @click="$router.push('/')">На главную</button>
    </div>

    <!-- Дашборд -->
    <template v-else-if="analytics">
      <!-- Общие метрики -->
      <div class="metrics-grid">
        <div class="metric-card">
          <span class="metric-value">{{ analytics.total_players }}</span>
          <span class="metric-label">Игроков</span>
        </div>
        <div class="metric-card">
          <span class="metric-value">{{ analytics.avg_score }}</span>
          <span class="metric-label">Средний счёт</span>
        </div>
        <div class="metric-card">
          <span class="metric-value">{{ analytics.avg_completion_time }}с</span>
          <span class="metric-label">Среднее время</span>
        </div>
        <div class="metric-card">
          <span class="metric-value">{{ getTotalAccuracy }}%</span>
          <span class="metric-label">Точность</span>
        </div>
      </div>

      <!-- Самый сложный вопрос -->
      <div v-if="hardestQuestion" class="hardest-question">
        <h3>Самый сложный вопрос</h3>
        <div class="question-card">
          <p class="question-text">{{ hardestQuestion.question_text }}</p>
          <div class="question-stats">
            <span>Точность: {{ hardestQuestion.accuracy_rate * 100 }}%</span>
            <span v-if="hardestQuestion.most_chosen_wrong !== null">
              Чаще ошибались на вариант: {{ String.fromCharCode(65 + hardestQuestion.most_chosen_wrong) }}
            </span>
          </div>
          <!-- Мини-диаграмма распределения -->
          <div class="option-bars">
            <div v-for="(count, idx) in hardestQuestion.option_distribution" 
                 :key="idx"
                 :class="['option-bar', { 
                   'is-correct': idx === getCorrectOption(hardestQuestion.question_index),
                   'most-wrong': idx === hardestQuestion.most_chosen_wrong 
                 }]"
                 :style="{ width: getBarWidth(count, hardestQuestion.option_distribution) + '%' }"
            >
              {{ String.fromCharCode(65 + idx) }}: {{ count }}
            </div>
          </div>
        </div>
      </div>

      <!-- Диаграммы -->
      <div class="charts-grid">
        <!-- Точность по вопросам -->
        <div class="chart-card">
          <h4>📈 Точность по вопросам</h4>
          <Bar :data="accuracyChartData" :options="chartOptions" />
        </div>
        
        <!-- Время ответа -->
        <div class="chart-card">
          <h4>⏱ Среднее время ответа</h4>
          <Line :data="timeChartData" :options="timeChartOptions" />
        </div>
      </div>

      <!-- Таблица вопросов -->
      <div class="questions-table">
        <h4>📋 Детали по вопросам</h4>
        <table>
          <thead>
            <tr>
              <th>№</th>
              <th>Вопрос</th>
              <th>Ответов</th>
              <th>Точность</th>
              <th>Среднее время</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="q in analytics.questions" :key="q.question_index">
              <td>{{ q.question_index + 1 }}</td>
              <td class="question-cell">{{ q.question_text }}</td>
              <td>{{ q.total_answers }}</td>
              <td>
                <span :class="['accuracy-badge', getAccuracyClass(q.accuracy_rate)]">
                  {{ q.accuracy_rate * 100 }}%
                </span>
              </td>
              <td>{{ q.avg_response_time || '–' }}с</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api'
import { Bar, Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend)

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref(null)
const analytics = ref(null)

async function loadAnalytics() {
  try {
    const data = await api.getQuizAnalytics(route.params.quizId)
    analytics.value = data
  } catch (e) {
    console.error('Analytics load failed:', e)
    error.value = e.message || 'Не удалось загрузить аналитику'
  } finally {
    loading.value = false
  }
}

// ✅ ВЫЧИСЛЯЕМЫЕ СВОЙСТВА
const getTotalAccuracy = computed(() => {
  if (!analytics.value?.questions?.length) return 0
  const total = analytics.value.questions.reduce((sum, q) => sum + q.total_answers, 0)
  const correct = analytics.value.questions.reduce((sum, q) => sum + q.correct_count, 0)
  return total ? Math.round((correct / total) * 100) : 0
})

const hardestQuestion = computed(() => {
  if (!analytics.value?.questions?.length) return null
  return analytics.value.questions
    .filter(q => q.total_answers > 0)
    .reduce((min, q) => q.accuracy_rate < min.accuracy_rate ? q : min, analytics.value.questions[0])
})

// ✅ ДИАГРАММЫ (исправлены синтаксические ошибки)
const accuracyChartData = computed(() => ({
  labels: analytics.value?.questions?.map((_, i) => `В${i + 1}`) || [],
  datasets: [{
    label: 'Точность, %',
    data: analytics.value?.questions?.map(q => q.accuracy_rate * 100) || [],  // ✅ Добавлен ключ "data:"
    backgroundColor: analytics.value?.questions?.map(q => {
      const rate = q.accuracy_rate * 100
      return rate >= 80 ? 'rgba(0, 184, 148, 0.7)' : rate >= 50 ? 'rgba(253, 203, 110, 0.7)' : 'rgba(225, 112, 85, 0.7)'
    }),
    borderRadius: 6,
    borderSkipped: false
  }]
}))

const timeChartData = computed(() => ({
  labels: analytics.value?.questions?.map((_, i) => `В${i + 1}`) || [],
  datasets: [{
    label: 'Среднее время, с',
    data: analytics.value?.questions?.map(q => q.avg_response_time || 0) || [],  // ✅ Исправлено: "data:" + "analytics.value"
    borderColor: 'rgba(108, 92, 231, 1)',
    backgroundColor: 'rgba(108, 92, 231, 0.1)',
    fill: true,
    tension: 0.4,
    pointRadius: 4,
    pointHoverRadius: 6
  }]
}))

const timeChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value) => `${value}s`,
        maxTicksLimit: 8
      },
      suggestedMax: 60 // Если вопросы обычно решаются до 60 секунд
    }
  }
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { 
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (context) => `${context.dataset.label}: ${context.parsed.y}%`
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      // ✅ Убираем stepSize, пусть Chart.js считает сам
      // ✅ Добавляем форматирование значений
      ticks: {
        callback: (value) => `${value}%`,
        // Ограничиваем кол-во делений
        maxTicksLimit: 10
      },
      // ✅ Ограничиваем максимальное значение оси (опционально)
      suggestedMax: 100
    },
    x: {
      ticks: {
        maxRotation: 0,
        minRotation: 0
      }
    }
  }
}

// ✅ ФУНКЦИИ-УТИЛИТЫ
const getBarWidth = (value, arr) => {
  const max = Math.max(...arr, 1)
  return (value / max) * 100
}

const getCorrectOption = (questionIndex) => {
  // Пока бэкенд не возвращает correct_index, возвращаем null
  // Для полной работы добавьте "correct_index: question.correct" в ответ бэкенда
  return null
}

const getAccuracyClass = (rate) => {
  if (rate >= 0.8) return 'high'
  if (rate >= 0.5) return 'medium'
  return 'low'
}

function exportData() {
  if (!analytics.value) return
  
  const rows = [['Вопрос', 'Ответов', 'Верных', 'Точность', 'Среднее время']]
  analytics.value.questions.forEach(q => {
    rows.push([
      `"${q.question_text.replace(/"/g, '""')}"`,
      q.total_answers,
      q.correct_count,
      `${q.accuracy_rate * 100}%`,
      `${q.avg_response_time || '–'}с`
    ])
  })
  
  const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `analytics-${analytics.value.quiz_id}-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(loadAnalytics)
</script>

<style scoped>
.analytics-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.analytics-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 30px;
  flex-wrap: wrap;
  gap: 12px;
}

.analytics-header h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--dark);
}

.btn-export {
  padding: 10px 20px;
  background: rgba(0, 184, 148, 0.12);
  border: 1px solid var(--success);
  border-radius: 10px;
  color: #00896b;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-export:hover {
  background: rgba(0, 184, 148, 0.2);
}

.analytics-loading,
.analytics-error {
  text-align: center;
  padding: 60px 20px;
  color: var(--gray);
}
.analytics-error { color: var(--danger); }

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Метрики */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 30px;
}

.metric-card {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  border: 1px solid var(--border);
  box-shadow: 0 2px 6px rgba(0,0,0,0.04);
}

.metric-value {
  display: block;
  font-size: 2rem;
  font-weight: 800;
  color: var(--primary);
}

.metric-label {
  font-size: 0.85rem;
  color: var(--gray);
}

/* Самый сложный вопрос */
.hardest-question {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 30px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.hardest-question h3 {
  margin-bottom: 16px;
  color: var(--dark);
  display: flex;
  align-items: center;
  gap: 8px;
}

.question-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
}

.question-text {
  font-weight: 600;
  margin-bottom: 12px;
  line-height: 1.4;
  color: var(--dark);
}

.question-stats {
  display: flex;
  gap: 16px;
  font-size: 0.9rem;
  color: var(--gray);
  margin-bottom: 12px;
}

.option-bars {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.option-bar {
  height: 28px;
  border-radius: 8px;
  background: var(--card-bg2);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--dark);
  transition: width 0.3s ease;
  white-space: nowrap;
  overflow: hidden;
}

.option-bar.is-correct {
  background: linear-gradient(90deg, var(--success), #00a388);
  color: #fff !important;
  border-color: transparent;
}

.option-bar.most-wrong {
  background: linear-gradient(90deg, var(--danger), #d65c4a);
  color: #fff !important;
  border: 2px solid rgba(255,255,255,0.3);
}

/* Диаграммы */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.chart-card {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid var(--border);
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  
  /* ✅ Ключевые свойства для Chart.js */
  position: relative;
  height: 300px;
  min-height: 250px;
}

.chart-card h4 {
  margin-bottom: 16px;
  font-size: 1.1rem;
  color: var(--dark);
}

.chart-card :deep(canvas) {
  width: 100% !important;
  height: 100% !important;
  max-height: 100%;
}

/* Таблица */
.questions-table {
  background: var(--card-bg);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid var(--border);
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  overflow-x: auto;
}

.questions-table h4 {
  margin-bottom: 16px;
  font-size: 1.1rem;
  color: var(--dark);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  text-align: left;
  padding: 12px 16px;
  font-weight: 600;
  color: var(--gray);
  border-bottom: 1px solid var(--border);
}

td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  color: var(--dark);
}

.question-cell {
  max-width: 300px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--dark);
}

.accuracy-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}
.accuracy-badge.high { 
  background: rgba(0, 184, 148, 0.12); 
  color: #00896b; 
}
.accuracy-badge.medium { 
  background: rgba(253, 203, 110, 0.15); 
  color: #d49e00; 
}
.accuracy-badge.low { 
  background: rgba(225, 112, 85, 0.12); 
  color: #c05030; 
}

/* Адаптив */
@media (max-width: 768px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
  .analytics-header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>