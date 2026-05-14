// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const routes = [
  { path: '/', name: 'Home', component: HomeView },
  { path: '/create', name: 'CreateQuiz', component: () => import('../views/CreateQuizView.vue') },
  { path: '/edit/:id', name: 'EditQuiz', component: () => import('../views/EditQuizView.vue') },
  { path: '/quiz/:id', name: 'TakeQuiz', component: () => import('../views/QuizView.vue') },
  { path: '/results', name: 'Results', component: () => import('../views/ResultsView.vue') },
  
  // ✅ Мультиплеерные маршруты
  { path: '/session/create/:id', name: 'CreateSession', component: () => import('../views/CreateSessionView.vue') },
  { path: '/join', name: 'JoinSession', component: () => import('../views/JoinSessionView.vue') },
  { path: '/session/:sessionId', name: 'SessionLobby', component: () => import('../views/SessionLobbyView.vue') }, // ← Этот файл теперь есть
  { path: '/session/:sessionId/play', name: 'MultiplayerQuiz', component: () => import('../views/MultiplayerQuizView.vue') },
  { path: '/session/:sessionId/results', name: 'SessionResults', component: () => import('../views/SessionResultsView.vue') },
  { 
    path: '/quiz/:quizId/analytics', 
    name: 'QuizAnalytics', 
    component: () => import('../views/QuizAnalyticsView.vue') 
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

export default router