<template>
  <div v-if="store.loading" class="loading">Загрузка квизов...</div>
  <div v-else-if="store.error" class="error">{{ store.error }}</div>
  
  <template v-else>
    <div class="home-actions">
      <button class="action-btn create-btn" @click="$router.push('/create')">Создать квиз</button>
      <button class="action-btn join-btn" @click="$router.push('/join')">Присоединиться по коду</button>
    </div>

    <div class="section-title">Готовые квизы</div>
    <div class="quiz-grid">
      <QuizCard v-for="q in defaultQuizzes" :key="q.id" :quiz="q" />
    </div>

    <div class="section-title" v-if="customQuizzes.length">Мои квизы</div>
    <div class="quiz-grid" v-if="customQuizzes.length">
      <QuizCard v-for="q in customQuizzes" :key="q.id" :quiz="q" :is-custom="true" />
    </div>
    
    <div v-if="!defaultQuizzes.length && !customQuizzes.length" class="no-quizzes">
      <p>Квизов пока нет.</p>
    </div>
  </template>
</template>

<script setup>
import { computed } from 'vue'
import { store } from '../composables/useQuizStore'
import QuizCard from '../views/QuizCard.vue'

const defaultQuizzes = computed(() => store.quizzes?.filter(q => !q.isCustom) || [])
const customQuizzes = computed(() => store.quizzes?.filter(q => q.isCustom) || [])
</script>

<style scoped>
.loading, .error, .no-quizzes {
  text-align: center;
  padding: 40px;
  font-size: 1.1rem;
  color: var(--gray);
}
.error { color: var(--danger); }
</style>