import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const routes = [
  { path: '/', name: 'Home', component: HomeView },
  { path: '/create', name: 'CreateQuiz', component: () => import('../views/CreateQuizView.vue') },
  { path: '/edit/:id', name: 'EditQuiz', component: () => import('../views/EditQuizView.vue') },
  { path: '/quiz/:id', name: 'TakeQuiz', component: () => import('../views/QuizView.vue') },
  { path: '/results', name: 'Results', component: () => import('../views/ResultsView.vue') },
  { path: '/history', name: 'History', component: () => import('../views/HistoryView.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})

export default router