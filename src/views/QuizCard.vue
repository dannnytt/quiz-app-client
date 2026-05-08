<template>
  <div :class="['quiz-card', { 'my-quiz': isCustom }]" @click="startQuiz">
    <div class="card-actions" v-if="isCustom" @click.stop>
      <button @click="editQuiz" title="Редактировать">✏️</button>
      <button class="delete-btn" @click="deleteQuiz" title="Удалить">🗑️</button>
    </div>
    <div class="card-top">
      <div>
        <span class="emoji">{{ quiz.emoji }}</span>
        <h3>{{ quiz.title }}</h3>
        <p class="desc">{{ quiz.desc }}</p>
      </div>
    </div>
    <div class="meta">
      <span class="difficulty" :class="quiz.difficulty">{{ getDifficultyLabel(quiz.difficulty) }}</span>
      <span>📝 {{ quiz.questions?.length || 0 }} вопросов</span>
      <span>⏱ {{ getTimePerQuestion(quiz) }}с</span>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue'
import { useRouter } from 'vue-router'
import { store } from '../composables/useQuizStore'
import { showToast } from '../composables/useToast'

const DIFFICULTY_LABELS = {
  easy: 'Лёгкий',
  medium: 'Средний',
  hard: 'Сложный'
}

const props = defineProps({ 
  quiz: Object, 
  isCustom: Boolean 
})

const router = useRouter()

function getDifficultyLabel(difficulty) {
  return DIFFICULTY_LABELS[difficulty] || difficulty
}

function getTimePerQuestion(quiz) {
  return quiz.timePerQuestion || quiz.time_per_question || 30
}

const startQuiz = () => {
  router.push({ name: 'TakeQuiz', params: { id: props.quiz.id } })
}

const editQuiz = () => {
  router.push({ name: 'EditQuiz', params: { id: props.quiz.id } })
}

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