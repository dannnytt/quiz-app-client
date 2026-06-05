import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { isAdmin } from '../api'

const routes = [
  { path: '/', name: 'Home', component: HomeView },
  
  // ✅ Вход админа (публичный)
  { 
    path: '/admin-login', 
    name: 'AdminLogin', 
    component: () => import('../views/AdminLoginView.vue'),
    meta: { public: true }
  },
  
  // ✅ ПУБЛИЧНЫЕ маршруты (доступны ВСЕМ)
  { path: '/join', name: 'JoinSession', component: () => import('../views/JoinSessionView.vue') },
  { path: '/session/:sessionId', name: 'SessionLobby', component: () => import('../views/SessionLobbyView.vue') },
  { path: '/session/:sessionId/play', name: 'MultiplayerQuiz', component: () => import('../views/MultiplayerQuizView.vue') },
  { path: '/session/:sessionId/results', name: 'SessionResults', component: () => import('../views/SessionResultsView.vue') },
  
  // ✅ Одиночное прохождение и результаты — теперь доступны всем!
  { path: '/quiz/:id', name: 'TakeQuiz', component: () => import('../views/QuizView.vue') },
  { path: '/results', name: 'Results', component: () => import('../views/ResultsView.vue') },
  
  // 🔒 АДМИНСКИЕ маршруты — защищены через beforeEnter
  { 
    path: '/create', 
    name: 'CreateQuiz', 
    component: () => import('../views/CreateQuizView.vue'),
    beforeEnter: requireAdmin
  },
  { 
    path: '/edit/:id', 
    name: 'EditQuiz', 
    component: () => import('../views/EditQuizView.vue'),
    beforeEnter: requireAdmin
  },
  { 
    path: '/session/create/:id',  // Создание мультиплеерной сессии — только админ
    name: 'CreateSession', 
    component: () => import('../views/CreateSessionView.vue'),
    beforeEnter: requireAdmin
  },
  { 
    path: '/quiz/:quizId/analytics', 
    name: 'QuizAnalytics', 
    component: () => import('../views/QuizAnalyticsView.vue'),
    beforeEnter: requireAdmin
  },
]

function requireAdmin(to, from, next) {
  if (isAdmin()) {
    next()
  } else {
    next({ name: 'AdminLogin', query: { redirect: to.fullPath } })
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

export default router