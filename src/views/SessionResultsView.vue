<template>
  <div class="results-container">
    <div v-if="loading" class="results-loading">
      <div class="loading-spinner"></div>
      <p>Подсчёт результатов...</p>
    </div>

    <div v-else-if="error" class="results-error">
      <p>{{ error }}</p>
      <button class="back-btn" @click="$router.push('/')" style="margin-top: 16px;">
        На главную
      </button>
    </div>

    <template v-else>
      <div class="results-header">
        <h1 class="results-title">Игра завершена!</h1>
      </div>


      <div class="leaderboard-section">
        <h3>Таблица лидеров</h3>
        <div class="leaderboard">
          <div 
            v-for="(player, index) in leaderboard" 
            :key="player.nickname"
            :class="['leaderboard-item', { 'is-you': player.nickname === myNickname, 'top-3': index < 3 }]"
          >
            <span class="rank" :class="getRankClass(index)">
              {{ index + 1 }}
            </span>
            
            <div class="player-cell">
              <div class="player-avatar-small">
                {{ getAvatarLetter(player.nickname) }}
              </div>
              <span class="player-name">{{ player.nickname }}</span>
              <span v-if="player.nickname === myNickname" class="badge-you">Вы</span>
            </div>
            
            <div class="score-cell">
              <span class="score-value">{{ player.score }}</span>
              <span class="score-label">очков</span>
            </div>
            
            <div class="correct-cell">
              <span :class="['correct-value', getCorrectClass(player, quiz)]">
                {{ player.correct }}/{{ quiz?.questions?.length || 0 }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="myResult" class="my-stats">
        <h3>Ваша статистика</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-value">{{ myResult.correct }}</span>
            <span class="stat-label">Правильных</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ quiz?.questions?.length - myResult.correct }}</span>
            <span class="stat-label">Ошибок</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ myResult.score }}</span>
            <span class="stat-label">Очков</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ getPercentage(myResult) }}%</span>
            <span class="stat-label">Точность</span>
          </div>
        </div>
      </div>

      <div class="results-actions">
        <button class="btn-home" @click="$router.push('/')">
          На главную
        </button>
        <button v-if="isHost" class="btn-new-session" @click="createNewSession">
          Новая сессия
        </button>
      </div>

    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '../api'
import { store } from '../composables/useQuizStore'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref(null)

const sessionId = ref(route.params.sessionId)
const quiz = ref(null)
const leaderboard = ref([])
const myNickname = ref('')
const playerToken = ref('')

const myResult = computed(() => 
  leaderboard.value.find(p => p.nickname === myNickname.value)
)

const isHost = computed(() => {
  const stored = sessionStorage.getItem('multiplayer_session')
  if (!stored) return false
  const data = JSON.parse(stored)
  return data.isHost || false
})

async function init() {
  try {
    const stored = sessionStorage.getItem('multiplayer_session')
    if (!stored) {
      router.push('/')
      return
    }
    
    const data = JSON.parse(stored)
    myNickname.value = data.nickname
    playerToken.value = data.playerToken
    
    if (store.loading) {
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (!store.loading) { clearInterval(check); resolve() }
        }, 50)
      })
    }
    
    quiz.value = store.getQuiz(data.quizId)
    if (!quiz.value) {
      const quizzes = await api.getQuizzes()
      quiz.value = quizzes.find(q => q.id === data.quizId)
    }
    
    const lb = await api.getLeaderboard(sessionId.value)
    leaderboard.value = lb.leaderboard || []
    
  } catch (e) {
    console.error('Results load failed:', e)
    error.value = e.message || 'Не удалось загрузить результаты'
  } finally {
    loading.value = false
  }
}

function getAvatarLetter(nickname) {
  return (nickname?.[0] || '?').toUpperCase()
}


function getRankClass(index) {
  if (index === 0) return 'gold'
  if (index === 1) return 'silver'
  if (index === 2) return 'bronze'
  return ''
}

function getCorrectClass(player, quiz) {
  if (!quiz?.questions?.length) return ''
  const pct = player.correct / quiz.questions.length
  if (pct >= 0.8) return 'excellent'
  if (pct >= 0.6) return 'good'
  if (pct >= 0.4) return 'average'
  return 'poor'
}

function getPercentage(result) {
  if (!result || !quiz.value?.questions?.length) return 0
  return Math.round((result.correct / quiz.value.questions.length) * 100)
}

function createNewSession() {
  if (quiz.value) {
    router.push({ name: 'CreateSession', params: { id: quiz.value.id } })
  } else {
    router.push('/')
  }
}

onMounted(init)
</script>

<style scoped>
.results-container {
  max-width: 700px;
  margin: 0 auto;
  padding: 20px;
  text-align: center;
}

.results-loading,
.results-error {
  padding: 60px 20px;
  color: var(--gray);
}
.results-error { color: var(--danger); }

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}
@keyframes spin { to { transform: rotate(360deg); } }

.results-header {
  margin-bottom: 30px;
}

.results-emoji {
  font-size: 4rem;
  margin-bottom: 10px;
  animation: bounce 1s ease infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.results-title {
  font-size: 1.8rem;
  font-weight: 800;
  margin-bottom: 8px;
  color: var(--dark);
}

.results-subtitle {
  color: var(--gray);
  font-size: 1.1rem;
}

.winner-card {
  /* background: linear-gradient(135deg, rgba(253, 203, 110, 0.12), rgba(108, 92, 231, 0.08)); */
  /* border: 2px solid rgba(253, 203, 110, 0.4); */
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 30px;
  display: flex;
  align-items: center;
  gap: 16px;
  text-align: left;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.winner-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  /* background: linear-gradient(135deg, var(--warning), #f6ad55); */
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.5rem;
  color: #fff;
  flex-shrink: 0;
}

.winner-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.winner-name {
  font-weight: 700;
  font-size: 1.2rem;
  color: var(--dark);
}

.winner-score {
  font-weight: 600;
  color: #b48600;
}

.winner-correct {
  font-size: 0.9rem;
  color: #00896b;
}

.leaderboard-section {
  background: var(--card-bg);
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 30px;
  text-align: left;
  border: 1px solid var(--border);
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.leaderboard-section h3 {
  margin-bottom: 16px;
  font-size: 1.2rem;
  color: var(--dark);
}

.leaderboard {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.leaderboard-item {
  display: grid;
  grid-template-columns: 60px 1fr 80px 60px;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--card-bg2);
  border: 1px solid var(--border);
  border-radius: 12px;
  transition: all 0.2s;
}

.leaderboard-item:hover {
  background: var(--card-bg);
  border-color: var(--primary);
}

.leaderboard-item.is-you {
  /* background: rgba(0, 184, 148, 0.08); */
  /* border: 1px solid var(--success); */
}

.leaderboard-item.top-3 {
  /* background: rgba(253, 203, 110, 0.08); */
  /* border-color: rgba(253, 203, 110, 0.3); */
}

.rank {
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--dark);
}
/* .rank.gold { color: #b48600; }
.rank.silver { color: #757575; }
.rank.bronze { color: #9c6b3f; } */

.player-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.player-avatar-small {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.8rem;
  color: #fff;
  flex-shrink: 0;
}

.player-name {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--dark);
}

.badge-you {
  background: var(--success);
  color: #fff;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 600;
  flex-shrink: 0;
}

.score-cell {
  text-align: right;
}

.score-value {
  display: block;
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--dark);
}

.score-label {
  font-size: 0.75rem;
  color: var(--gray);
}

.correct-cell {
  text-align: center;
}

.correct-value {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--dark);
}
/* .correct-value.excellent { color: #00896b; }
.correct-value.good { color: #1976d2; }
.correct-value.average { color: #b48600; }
.correct-value.poor { color: #c05030; } */

.my-stats {
  background: var(--card-bg);
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 30px;
  text-align: left;
  border: 1px solid var(--border);
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.my-stats h3 {
  margin-bottom: 16px;
  font-size: 1.2rem;
  color: var(--dark);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.stat-card {
  background: var(--card-bg2);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px 12px;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 800;
  /* color: var(--primary); */
}

.stat-label {
  font-size: 0.75rem;
  color: var(--gray);
}

/* Кнопки — ✅ ИСПРАВЛЕНО для светлой темы */
/* .results-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.results-actions button {
  width: 100%;
  max-width: 300px;
  margin: 0 auto;
  padding: 14px 24px;
  border-radius: 14px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  border: none;
} */

/* .btn-retry {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: #fff;
}
.btn-retry:hover {
  box-shadow: 0 10px 30px rgba(108, 92, 231, 0.2);
  transform: translateY(-2px);
} */

.btn-home {
  background: var(--card-bg);
  color: var(--dark);
  border: 1px solid var(--border);
}

.btn-new-session {
  background: var(--primary);
  color: #fff;
}


.share-section {
  margin-top: 10px;
}

.btn-share {
  padding: 12px 24px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--gray);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-share:hover {
  background: var(--card-bg2);
  border-color: var(--primary);
  color: var(--dark);
}

@media (max-width: 600px) {
  .leaderboard-item {
    grid-template-columns: 40px 1fr 70px 50px;
    gap: 8px;
    padding: 10px 12px;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .winner-card {
    flex-direction: column;
    text-align: center;
  }
  
  .winner-info {
    align-items: center;
  }
}
</style>