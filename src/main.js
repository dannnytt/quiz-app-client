import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/styles.css'
import { store } from './composables/useQuizStore'

const app = createApp(App)

async function bootstrap() {
  try {
    await store.init()
  } catch (e) {
    console.error('Failed to load data:', e)
  }
  app.use(router).mount('#app')
}

bootstrap()