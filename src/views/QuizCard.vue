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
      <span class="difficulty" :class="quiz.difficulty">{{ diffLabels[quiz.difficulty] }}</span>
      <span>📝 {{ quiz.questions.length }} вопросов</span>
      <span>⏱ {{ quiz.timePerQuestion }}с</span>
    </div>
  </div>
</template>

<script setup>
import { defineProps } from 'vue'
import { useRouter } from 'vue-router'
import { store, diffLabels } from '../composables/useQuizStore'
import { showToast } from '../composables/useToast'

const props = defineProps({ quiz: Object, isCustom: Boolean })
const router = useRouter()

const startQuiz = () => router.push({ name: 'TakeQuiz', params: { id: props.quiz.id } })
const editQuiz = () => router.push({ name: 'EditQuiz', params: { id: props.quiz.id } })
const deleteQuiz = () => {
  if (confirm(`Удалить квиз "${props.quiz.title}"?`)) {
    store.deleteCustomQuiz(props.quiz.id)
    showToast('Квиз удалён', 'error')
  }
}
</script>