<template>
  <div :class="['quiz-card', { 'my-quiz': isCustom }]" @click="startQuiz">
    <!-- Кнопки действий для кастомных квизов -->
    <div class="card-actions" v-if="isCustom" @click.stop>
      <button @click="viewAnalytics" title="Аналитика">📊</button>
      <button @click="editQuiz" title="Редактировать">✏️</button>
      <button class="delete-btn" @click="deleteQuiz" title="Удалить">🗑️</button>
      <button @click="createOnlineSession" title="Онлайн-игра">🌐</button>
    </div>
    
    <!-- Кнопка онлайн-сессии для дефолтных квизов -->
    <div class="card-actions" v-else @click.stop>
      <button @click="viewAnalytics" title="Аналитика">📊</button>
      <button @click="createOnlineSession" title="Онлайн-игра">🌐</button>
    </div>
    
    <div class="card-top">
      <div>
        <!-- <span class="emoji">{{ quiz.emoji }}</span> -->
        <h3>{{ quiz.title }}</h3>
        <p class="desc">{{ quiz.desc }}</p>
      </div>
    </div>
    <div class="meta">
      <span class="difficulty" :class="quiz.difficulty">{{ getDifficultyLabel(quiz.difficulty) }}</span>
      <span> {{ quiz.questions?.length || 0 }} вопросов</span>
      <span>⏱ {{ getTimePerQuestion(quiz) }}с</span>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue'
import { useRouter } from 'vue-router'
import { store } from '../composables/useQuizStore'
import { showToast } from '../composables/useToast'

// ✅ Локальная константа для меток сложности
const DIFFICULTY_LABELS = {
  easy: 'Лёгкий',
  medium: 'Средний',
  hard: 'Сложный'
}

const viewAnalytics = (event) => {
  if (event) event.stopPropagation()
  router.push({ name: 'QuizAnalytics', params: { quizId: props.quiz.id } })
}

const props = defineProps({ 
  quiz: Object, 
  isCustom: Boolean 
})

const router = useRouter()

// ✅ Функция для получения метки сложности
function getDifficultyLabel(difficulty) {
  return DIFFICULTY_LABELS[difficulty] || difficulty
}

// ✅ Функция для получения времени на вопрос (поддержка snake/camel case)
function getTimePerQuestion(quiz) {
  return quiz.timePerQuestion || quiz.time_per_question || 30
}

// ✅ Запуск одиночной игры
const startQuiz = () => {
  router.push({ name: 'TakeQuiz', params: { id: props.quiz.id } })
}

// ✅ ✅ ✅ ИСПРАВЛЕНИЕ: Функция создания онлайн-сессии
const createOnlineSession = (event) => {
  // Останавливаем всплытие, чтобы не сработал клик по карточке
  if (event) event.stopPropagation()
  
  // Переход на страницу создания сессии
  router.push({ name: 'CreateSession', params: { id: props.quiz.id } })
}

// ✅ Редактирование (только для кастомных)
const editQuiz = () => {
  router.push({ name: 'EditQuiz', params: { id: props.quiz.id } })
}

// ✅ Удаление (только для кастомных)
const deleteQuiz = async () => {
  if (confirm(`Удалить квиз "${props.quiz.title}"?`)) {
    try {
      await store.deleteCustomQuiz(props.quiz.id)
      showToast('Квиз удалён', 'error')
    } catch (e) {
      console.error('Delete failed:', e)
      showToast('Ошибка при удалении', 'error')
    }
  }
}
</script>