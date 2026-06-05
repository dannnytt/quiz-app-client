<template>
  <div :class="['quiz-card', { 'my-quiz': isCustom }]" @click="startQuiz">
    
    <div v-if="quiz.cover_image" class="card-cover">
      <img 
        :src="getImageUrl(quiz.cover_image)" 
        :alt="quiz.title" 
        class="cover-image"
        @error="handleImageError"
      />
    </div>

    <!-- ✅ Кнопки для админа на кастомных квизах -->
    <div class="card-actions" v-if="isCustom && isAdminUser" @click.stop>
      <button class="action-btn analytics-btn" @click="viewAnalytics" title="Аналитика">
        Аналитика
      </button>
      <button class="action-btn edit-btn" @click="editQuiz" title="Редактировать">
        Изменить
      </button>
      <button class="action-btn delete-btn" @click="deleteQuiz" title="Удалить">
        Удалить
      </button>
      <button class="action-btn online-btn" @click="createOnlineSession" title="Онлайн-игра">
        Онлайн
      </button>
    </div>
    
    <!-- ✅ Кнопки для админа на обычных квизах -->
    <div class="card-actions" v-else-if="isAdminUser" @click.stop>
      <button class="action-btn analytics-btn" @click="viewAnalytics" title="Аналитика">
        Аналитика
      </button>
      <button class="action-btn online-btn" @click="createOnlineSession" title="Онлайн-игра">
        Онлайн
      </button>
    </div>
    
    <!-- ✅ Для обычных пользователей - только кнопка Играть -->
    <!-- <div class="card-actions" v-else @click.stop>
      <button class="action-btn play-btn" @click="startQuiz" title="Играть">
        ▶ Играть
      </button>
    </div> -->
    
    <div class="card-top">
      <div>
        <h3>{{ quiz.title }}</h3>
        <p class="desc">{{ quiz.desc }}</p>
      </div>
    </div>
    
    <div class="meta">
      <span class="difficulty" :class="quiz.difficulty">{{ getDifficultyLabel(quiz.difficulty) }}</span>
      <span>{{ quiz.questions?.length || 0 }} вопросов</span>
    </div>
  </div>
</template>

<script setup>
import { defineProps, computed } from 'vue'
import { useRouter } from 'vue-router'
import { store } from '../composables/useQuizStore'
import { showToast } from '../composables/useToast'
import { getImageUrl, isAdmin } from '../api'

const isAdminUser = computed(() => isAdmin())

function handleImageError(e) {
  console.error('Failed to load image:', e.target.src)
  e.target.style.display = 'none'
}

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

const viewAnalytics = (event) => {
  if (event) event.stopPropagation()
  router.push({ name: 'QuizAnalytics', params: { quizId: props.quiz.id } })
}

const createOnlineSession = (event) => {
  if (event) event.stopPropagation()
  router.push({ name: 'CreateSession', params: { id: props.quiz.id } })
}

const editQuiz = (event) => {
  if (event) event.stopPropagation()
  router.push({ name: 'EditQuiz', params: { id: props.quiz.id } })
}

const deleteQuiz = async (event) => {
  if (event) event.stopPropagation()
  
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

<style scoped>
.card-cover {
  margin: -24px -24px 16px -24px;
  overflow: hidden;
  border-radius: 20px 20px 0 0;
}

.cover-image {
  width: 100%;
  height: 160px;
  object-fit: cover;
  display: block;
}

.quiz-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 24px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.quiz-card:hover {
  border-color: var(--primary);
}

.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 2;
}

.action-btn {
  padding: 8px 14px;
  min-width: 85px;
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--dark);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
}

/* ✅ Стиль для кнопки "Играть" */
.play-btn {
  background: linear-gradient(135deg, var(--primary), var(--accent, #fd79a8));
  color: #fff;
  border: none;
  padding: 10px 18px;
  font-size: 0.85rem;
}

.play-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(108, 92, 231, 0.3);
}

.card-top {
  margin-bottom: 16px;
}

.quiz-card h3 {
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 6px;
  color: var(--dark);
  line-height: 1.4;
}

.quiz-card .desc {
  color: var(--gray);
  font-size: 0.9rem;
  line-height: 1.4;
}

.meta {
  display: flex;
  gap: 12px;
  font-size: 0.8rem;
  color: var(--gray);
  flex-wrap: wrap;
  align-items: center;
}

.difficulty {
  padding: 3px 10px;
  border-radius: 20px;
  font-weight: 600;
}
.difficulty.easy { background: rgba(0, 184, 148, 0.12); }
.difficulty.medium { background: rgba(253, 203, 110, 0.15); }
.difficulty.hard { background: rgba(225, 112, 85, 0.12); }

@media (max-width: 500px) {
  .card-actions {
    position: static;
    margin-bottom: 16px;
    justify-content: flex-end;
  }
  
  .action-btn {
    padding: 6px 12px;
    min-width: 75px;
    font-size: 0.75rem;
  }
  
  .meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
}
</style>