<template>
  <div v-if="store.loading" class="loading">Загрузка квизов...</div>
  <div v-else-if="store.error" class="error">{{ store.error }}</div>
  
  <template v-else>
    <!-- ✅ Блок пользователя (если авторизован) -->
    <div v-if="isAuth" class="user-panel">
      <div class="user-info">
        <div class="user-avatar">
          {{ store.currentUser?.nickname?.charAt(0).toUpperCase() || '?' }}
        </div>
        <div class="user-details">
          <div class="user-name">{{ store.currentUser?.nickname }}</div>
          <div class="user-email">{{ store.currentUser?.email }}</div>
        </div>
      </div>
      <button class="logout-btn" @click="logout" title="Выйти из аккаунта">Выйти</button>
    </div>

    <!-- Кнопки действий -->
    <div class="home-actions">
      <template v-if="isAuth">
        <button class="action-btn create-btn" @click="$router.push('/create')">Создать квиз</button>
        <button class="action-btn join-btn" @click="$router.push('/join')">Присоединиться по коду</button>
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

const systemQuizzes = computed(() => store.quizzes?.filter(q => !q.owner_id) || [])
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
/* === USER PANEL === */
.user-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 20px;
  margin-bottom: 24px;
  gap: 16px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  min-width: 0;
}

.user-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
  flex-shrink: 0;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--dark);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-email {
  font-size: 0.85rem;
  color: var(--gray);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logout-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: transparent;
  color: var(--primary);
  border: 1px solid var(--primary);
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.logout-btn:hover {
  background: var(--primary);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(108, 92, 231, 0.2);
}

.logout-icon {
  font-size: 1.1rem;
}

/* === HOME ACTIONS === */
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
  box-shadow: 0 6px 20px rgba(108, 92, 231, 0.3);
}

.join-btn {
  background: var(--primary);
  color: #fff;
}

.join-btn:hover {
  background: var(--primary-dark);
  box-shadow: 0 6px 20px rgba(108, 92, 231, 0.3);
}

.login-btn {
  background: var(--primary);
  color: #fff;
}

.login-btn:hover {
  background: var(--primary-dark);
  box-shadow: 0 6px 20px rgba(108, 92, 231, 0.3);
}

.register-btn {
  background: var(--primary);
  color: #fff;
}

.register-btn:hover {
  background: var(--primary-dark);
  box-shadow: 0 6px 20px rgba(108, 92, 231, 0.3);
}

/* === SECTION TITLE === */
.section-title {
  font-size: 1.3rem;
  font-weight: 700;
  margin: 30px 0 16px 0;
  color: var(--dark);
}

/* === LOADING/ERROR === */
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

/* === MOBILE === */
@media (max-width: 600px) {
  .user-panel {
    flex-direction: column;
    align-items: stretch;
    padding: 16px;
  }
  
  .user-info {
    justify-content: center;
    text-align: center;
  }
  
  .user-avatar {
    width: 48px;
    height: 48px;
    font-size: 1.3rem;
  }
  
  .user-name {
    font-size: 1rem;
  }
  
  .user-email {
    font-size: 0.8rem;
  }
  
  .logout-btn {
    width: 100%;
    justify-content: center;
  }
  
  .home-actions { flex-direction: column; }
  .action-btn { width: 100%; }
}
</style>