import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/styles.css'
import { store } from './composables/useQuizStore'

// Инициализация данных при старте
store.init()

createApp(App).use(router).mount('#app')