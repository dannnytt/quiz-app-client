import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import { isAuthenticated } from '../api'

const routes = [
  { path: '/', name: 'Home', component: HomeView },
  
  // Авторизация (публичные)
  { path: '/login', name: 'Login', component: () => import('../views/LoginView.vue') },
  { path: '/register', name: 'Register', component: () => import('../views/RegisterView.vue') },
  
  // Публичные маршруты
  { path: '/join', name: 'JoinSession', component: () => import('../views/JoinSessionView.vue') },
  { path: '/session/:sessionId', name: 'SessionLobby', component: () => import('../views/SessionLobbyView.vue') },
  { path: '/session/:sessionId/play', name: 'MultiplayerQuiz', component: () => import('../views/MultiplayerQuizView.vue') },
  { path: '/session/:sessionId/results', name: 'SessionResults', component: () => import('../views/SessionResultsView.vue') },
  { path: '/quiz/:id', name: 'TakeQuiz', component: () => import('../views/QuizView.vue') },
  { path: '/results', name: 'Results', component: () => import('../views/ResultsView.vue') },
  
  // Требуют авторизации
  { 
    path: '/create', 
    name: 'CreateQuiz', 
    component: () => import('../views/CreateQuizView.vue'),
    beforeEnter: requireAuth
  },
  { 
    path: '/edit/:id', 
    name: 'EditQuiz', 
    component: () => import('../views/EditQuizView.vue'),
    beforeEnter: requireAuth
  },
  { 
    path: '/session/create/:id', 
    name: 'CreateSession', 
    component: () => import('../views/CreateSessionView.vue'),
    beforeEnter: requireAuth
  },
  { 
    path: '/quiz/:quizId/analytics', 
    name: 'QuizAnalytics', 
    component: () => import('../views/QuizAnalyticsView.vue'),
    beforeEnter: requireAuth
  },
]

function requireAuth(to, from, next) {
  if (isAuthenticated()) {
    next()
  } else {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

export default router