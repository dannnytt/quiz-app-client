<template>
  <div v-if="store.loading" class="loading">Загрузка квизов...</div>
  <div v-else-if="store.error" class="error">{{ store.error }}</div>
  
  <template v-else>
    <!-- ✅ Кнопки действий для разных ролей -->
    <div class="home-actions">
      <!-- Для админа -->
      <template v-if="isAdminUser">
        <button class="action-btn create-btn" @click="$router.push('/create')">Создать квиз</button>
        <button class="action-btn join-btn" @click="$router.push('/join')">Присоединиться по коду</button>
        <button class="action-btn logout-btn" @click="logout">Выйти из админки</button>
      </template>
      
      <!-- Для обычного пользователя -->
      <template v-else>
        <button class="action-btn join-btn" @click="$router.push('/join')">Присоединиться по коду</button>
        <button class="action-btn admin-btn" @click="$router.push('/admin-login')">Вход для админа</button>
      </template>
    </div>

    <div class="section-title">Готовые квизы</div>
    <div class="quiz-grid">
      <QuizCard v-for="q in defaultQuizzes" :key="q.id" :quiz="q" />
    </div>

    <!-- ✅ Мои квизы видны только админу -->
    <template v-if="isAdminUser">
      <div class="section-title" v-if="customQuizzes.length">Мои квизы</div>
      <div class="quiz-grid" v-if="customQuizzes.length">
        <QuizCard v-for="q in customQuizzes" :key="q.id" :quiz="q" :is-custom="true" />
      </div>
    </template>
    
    <div v-if="!defaultQuizzes.length && (!isAdminUser || !customQuizzes.length)" class="no-quizzes">
      <p>Квизов пока нет.</p>
    </div>
  </template>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { store } from '../composables/useQuizStore'
import { isAdmin, clearAdminToken } from '../api'
import QuizCard from '../views/QuizCard.vue'

const router = useRouter()

const isAdminUser = computed(() => isAdmin())

const defaultQuizzes = computed(() => store.quizzes?.filter(q => !q.isCustom) || [])
const customQuizzes = computed(() => store.quizzes?.filter(q => q.isCustom) || [])

function logout() {
  clearAdminToken()
  router.push('/')
  setTimeout(() => {
    window.location.reload()
  }, 100)
}
</script>

<style scoped>
.home-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 30px;
  flex-wrap: wrap;
  justify-content: center;
}

.action-btn {
  padding: 14px 28px;
  border-radius: 14px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  border: none;
}

.create-btn {
  background: var(--card-bg);
  color: var(--dark);
  border: 1px solid var(--border);
}

.create-btn:hover {
  background: var(--card-bg2, #f1f2f6);
  border-color: var(--primary);
}

.join-btn {
  background: var(--card-bg);
  color: var(--dark);
  border: 1px solid var(--border);
}

.join-btn:hover {
  background: var(--card-bg2, #f1f2f6);
  border-color: var(--primary);
}

.logout-btn {
  background: var(--card-bg);
  color: var(--dark);
  border: 1px solid var(--border);
}

.logout-btn:hover {
  background: var(--card-bg2, #f1f2f6);
  border-color: var(--primary);
}

.admin-btn {
  background: var(--card-bg);
  border: 1px solid var(--border);
}

.admin-btn:hover {
  background: var(--card-bg2, #f1f2f6);
  border-color: var(--primary);
}

.section-title {
  font-size: 1.3rem;
  font-weight: 700;
  margin: 30px 0 16px 0;
  color: var(--dark);
}
/* 
.quiz-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
} */

.loading, .error, .no-quizzes {
  text-align: center;
  padding: 40px;
  font-size: 1.1rem;
  color: var(--gray);
}

.error {
  color: var(--danger);
}

@media (max-width: 600px) {
  .home-actions {
    flex-direction: column;
  }
  
  .action-btn {
    width: 100%;
  }
  
  .quiz-grid {
    grid-template-columns: 1fr;
  }
}
</style>