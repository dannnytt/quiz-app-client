<template>
  <div v-if="store.loading" class="loading">Загрузка квизов...</div>
  <div v-else-if="store.error" class="error">{{ store.error }}</div>
  
  <template v-else>
    <!-- Кнопки действий -->
    <div class="home-actions">
      <template v-if="isAuth">
        <button class="action-btn create-btn" @click="$router.push('/create')">Создать квиз</button>
        <button class="action-btn join-btn" @click="$router.push('/join')">Присоединиться по коду</button>
        <button class="action-btn logout-btn" @click="logout">Выйти ({{ store.currentUser?.nickname }})</button>
      </template>
      <template v-else>
        <button class="action-btn join-btn" @click="$router.push('/join')">Присоединиться по коду</button>
        <button class="action-btn login-btn" @click="$router.push('/login')">Войти</button>
        <button class="action-btn register-btn" @click="$router.push('/register')">Регистрация</button>
      </template>
    </div>

    <!-- Мои квизы (только если авторизован) -->
    <template v-if="isAuth">
      <div class="section-title" v-if="myQuizzes.length">Мои квизы</div>
      <div class="quiz-grid" v-if="myQuizzes.length">
        <QuizCard v-for="q in myQuizzes" :key="q.id" :quiz="q" :is-custom="true" />
      </div>
      <div v-else class="no-quizzes">
        <p>У вас пока нет своих квизов. <a @click="$router.push('/create')">Создайте первый!</a></p>
      </div>
    </template>

    <!-- Готовые квизы (системные, без владельца) -->
    <div class="section-title">Готовые квизы</div>
    <div class="quiz-grid">
      <QuizCard v-for="q in systemQuizzes" :key="q.id" :quiz="q" />
    </div>
    
    <div v-if="!systemQuizzes.length && (!isAuth || !myQuizzes.length)" class="no-quizzes">
      <p>Квизов пока нет.</p>
    </div>
  </template>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { store } from '../composables/useQuizStore'
import { isAuthenticated, clearToken } from '../api'
import QuizCard from '../views/QuizCard.vue'

const router = useRouter()

const isAuth = computed(() => isAuthenticated())

// Системные квизы — без владельца
const systemQuizzes = computed(() => store.quizzes?.filter(q => !q.owner_id) || [])

// Мои квизы — с владельцем = текущий пользователь
const myQuizzes = computed(() => store.quizzes?.filter(q => q.owner_id === store.currentUser?.id) || [])

function logout() {
  clearToken()
  store.currentUser = null
  store.myQuizzes = []
  router.push('/')
  setTimeout(() => window.location.reload(), 100)
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
  background: var(--primary);
  color: #fff;
}

.create-btn:hover {
  background: var(--primary-dark);
  color: #fff;
}

.join-btn {
  background: var(--primary);
  color: #fff;
}

.join-btn:hover {
  background: var(--primary-dark);
  color: #fff;
}

.login-btn {
  background: var(--primary);
  color: #fff;
}

.login-btn:hover {
  background: var(--primary-dark);
  color: #fff;
}

.register-btn {
  background: var(--primary);
  color: #fff;
}

.register-btn:hover {
  background: var(--primary-dark);
  color: #fff;
}

.logout-btn {
  background: var(--primary);
  color: #fff;
}

.logout-btn:hover {
  background: var(--primary-dark);
  color: #fff;
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
}
*/

.loading, .error, .no-quizzes {
  text-align: center;
  padding: 40px;
  font-size: 1.1rem;
  color: var(--gray);
}

.no-quizzes a {
  color: var(--primary);
  cursor: pointer;
  text-decoration: underline;
}

.error { color: var(--danger); }

@media (max-width: 600px) {
  .home-actions { flex-direction: column; }
  .action-btn { width: 100%; }
  .quiz-grid { grid-template-columns: 1fr; }
}
</style>