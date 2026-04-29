<template>
  <div class="home-actions">
    <button class="action-btn create-btn" @click="$router.push('/create')">✨ Создать квиз</button>
    <button class="action-btn stats-btn" @click="$router.push('/history')">📊 Мои результаты</button>
  </div>

  <div class="section-title">Готовые квизы</div>
  <div class="quiz-grid">
    <QuizCard v-for="q in defaultQuizzes" :key="q.id" :quiz="q" />
  </div>

  <div class="section-title" v-if="customQuizzes.length">Мои квизы</div>
  <div class="quiz-grid" v-if="customQuizzes.length">
    <QuizCard v-for="q in customQuizzes" :key="q.id" :quiz="q" :is-custom="true" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { store } from '../composables/useQuizStore'

const defaultQuizzes = computed(() => store.quizzes.filter(q => !q.isCustom))
const customQuizzes = computed(() => store.quizzes.filter(q => q.isCustom))
</script>

<script>
import QuizCard from '../views/QuizCard.vue'
export default { components: { QuizCard } }
</script>