<template>
  <!-- Состояние загрузки -->
  <div v-if="loading" class="quiz-loading">
    <div class="loading-spinner"></div>
    <p>Загрузка квиза...</p>
  </div>

  <!-- Ошибка: квиз не найден или не пользовательский -->
  <div v-else-if="error || !quiz" class="quiz-error">
    <p>❌ {{ error || 'Квиз не найден' }}</p>
    <button class="back-btn" @click="$router.push('/')" style="margin-top: 16px;">
      🏠 На главную
    </button>
  </div>

  <!-- Форма редактирования -->
  <template v-else>
    <div class="quiz-header">
      <div class="quiz-info">
        <button class="back-btn" @click="$router.push('/')">←</button>
        <div class="question-counter">Редактирование: {{ quiz.title }}</div>
      </div>
    </div>

    <form @submit.prevent="updateQuiz">
      <div class="form-section">
        <h3>📝 Основная информация</h3>
        
        <div class="form-group">
          <label>Название</label>
          <input v-model="form.title" required maxlength="100" placeholder="Название квиза">
        </div>
        
        <div class="form-group">
          <label>Описание</label>
          <input v-model="form.desc" required maxlength="200" placeholder="Краткое описание">
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Эмодзи</label>
            <input v-model="form.emoji" maxlength="6" placeholder="📝">
          </div>
          
          <div class="form-group">
            <label>Сложность</label>
            <select v-model="form.difficulty">
              <option value="easy">🟢 Лёгкий</option>
              <option value="medium">🟡 Средний</option>
              <option value="hard">🔴 Сложный</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Время на вопрос (сек)</label>
            <input v-model.number="form.timePerQuestion" type="number" min="10" max="300" required>
          </div>
        </div>
      </div>

      <div class="form-section">
        <h3>❓ Вопросы ({{ form.questions.length }})</h3>
        
        <div v-for="(q, idx) in form.questions" :key="q._uid || idx" class="question-editor">
          <div class="q-header">
            <span class="q-number">Вопрос {{ idx + 1 }}</span>
            <button 
              v-if="form.questions.length > 1" 
              type="button" 
              class="q-remove" 
              @click="removeQuestion(idx)"
              title="Удалить вопрос"
            >✕</button>
          </div>
          
          <div class="form-group">
            <label>Текст вопроса</label>
            <input 
              v-model="q.text" 
              required 
              maxlength="300" 
              placeholder="Введите вопрос..."
            >
          </div>
          
          <div v-for="(opt, oi) in q.options" :key="oi" class="option-editor">
            <span class="option-label">{{ String.fromCharCode(65 + oi) }}</span>
            <input 
              v-model="q.options[oi]" 
              required 
              maxlength="100" 
              placeholder="Вариант ответа"
            >
            <button 
              type="button" 
              :class="['correct-check', { active: q.correct === oi }]" 
              @click="setCorrectAnswer(q, oi)"
              title="Правильный ответ"
            >✓</button>
          </div>
          
          <div class="explanation-input">
            <label>💡 Пояснение (необязательно)</label>
            <textarea 
              v-model="q.explanation" 
              placeholder="Объяснение правильного ответа..."
              rows="2"
            ></textarea>
          </div>
        </div>
        
        <button type="button" class="add-question-btn" @click="addQuestion">
          + Добавить вопрос
        </button>
      </div>

      <div class="form-actions">
        <button type="button" class="btn-cancel" @click="$router.push('/')">
          Отмена
        </button>
        <button type="submit" class="btn-save" :disabled="saving">
          {{ saving ? 'Сохранение...' : '💾 Обновить квиз' }}
        </button>
      </div>
    </form>
  </template>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { store } from '../composables/useQuizStore'
import { showToast } from '../composables/useToast'

const route = useRoute()
const router = useRouter()

// Состояния
const loading = ref(true)
const error = ref(null)
const saving = ref(false)
const quiz = ref(null)

// Форма
const form = reactive({
  id: '',
  title: '',
  desc: '',
  emoji: '📝',
  difficulty: 'medium',
  timePerQuestion: 30,
  questions: []
})

// Уникальный счётчик для ключей вопросов
let questionUid = 0

// Загрузка квиза
async function loadQuiz() {
  loading.value = true
  error.value = null
  
  try {
    // Ждём, если стор ещё загружается
    if (store.loading) {
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (!store.loading) {
            clearInterval(check)
            resolve()
          }
        }, 50)
      })
    }
    
    // Ищем квиз в сторе
    const found = store.getQuiz(route.params.id)
    
    if (!found) {
      error.value = 'Квиз не найден в базе данных'
      return
    }
    
    // 🔥 Критично: можно редактировать только пользовательские квизы
    if (!found.isCustom) {
      error.value = 'Редактирование доступно только для созданных вами квизов'
      return
    }
    
    quiz.value = found
    
    // Заполняем форму с поддержкой обоих форматов полей
    form.id = found.id
    form.title = found.title || ''
    form.desc = found.desc || ''
    form.emoji = found.emoji || '📝'
    form.difficulty = found.difficulty || 'medium'
    // Поддержка snake_case и camelCase
    form.timePerQuestion = found.time_per_question || found.timePerQuestion || 30
    
    // Маппим вопросы: бэкенд → фронтенд
    form.questions = (found.questions || []).map(q => ({
      _uid: questionUid++,  // Уникальный ключ для Vue
      text: q.text || q.q || '',  // Поддержка обоих форматов
      options: Array.isArray(q.options) ? [...q.options] : ['', '', '', ''],
      correct: typeof q.correct === 'number' ? q.correct : 0,
      explanation: q.explanation || ''
    }))
    
    // Если вопросов нет — добавляем два пустых
    if (form.questions.length === 0) {
      addQuestion()
      addQuestion()
    }
    
  } catch (e) {
    console.error('Failed to load quiz:', e)
    error.value = 'Ошибка: ' + (e.message || 'Не удалось загрузить квиз')
  } finally {
    loading.value = false
  }
}

// Добавление вопроса
function addQuestion() {
  form.questions.push({
    _uid: questionUid++,
    text: '',
    options: ['', '', '', ''],
    correct: 0,
    explanation: ''
  })
}

// Удаление вопроса
function removeQuestion(idx) {
  if (form.questions.length <= 1) {
    showToast('Должен быть хотя бы один вопрос', 'error')
    return
  }
  form.questions.splice(idx, 1)
}

// Установка правильного ответа
function setCorrectAnswer(question, index) {
  question.correct = index
}

// Валидация формы
function validateForm() {
  if (!form.title.trim()) {
    showToast('Введите название квиза', 'error')
    return false
  }
  if (!form.desc.trim()) {
    showToast('Введите описание', 'error')
    return false
  }
  if (form.questions.length < 1) {
    showToast('Добавьте хотя бы один вопрос', 'error')
    return false
  }
  
  for (let i = 0; i < form.questions.length; i++) {
    const q = form.questions[i]
    if (!q.text.trim()) {
      showToast(`Вопрос #${i + 1}: введите текст`, 'error')
      return false
    }
    if (q.options.some(opt => !opt.trim())) {
      showToast(`Вопрос #${i + 1}: заполните все варианты`, 'error')
      return false
    }
    if (q.correct < 0 || q.correct >= 4) {
      showToast(`Вопрос #${i + 1}: выберите правильный ответ`, 'error')
      return false
    }
  }
  
  return true
}

// Обновление квиза
async function updateQuiz() {
  if (!validateForm() || saving.value) return
  
  saving.value = true
  
  try {
    // 🔥 Формируем payload для бэкенда (snake_case + text вместо q)
    const payload = {
      id: form.id,
      title: form.title.trim(),
      desc: form.desc.trim(),
      emoji: form.emoji || '📝',
      difficulty: form.difficulty,
      time_per_question: form.timePerQuestion,  // ✅ snake_case для бэкенда
      isCustom: true,
      questions: form.questions.map(q => ({
        text: q.text.trim(),        // ✅ text, а не q
        options: q.options.map(o => o.trim()),
        correct: q.correct,
        explanation: q.explanation?.trim() || `Правильный ответ: ${q.options[q.correct]}`
      }))
    }
    
    // Вызываем обновление в сторе
    await store.updateCustomQuiz(payload)
    
    showToast(`Квиз "${form.title}" обновлён! ✅`, 'success')
    router.push('/')
    
  } catch (e) {
    console.error('Update failed:', e)
    showToast('Ошибка при обновлении: ' + (e.message || 'Неизвестная ошибка'), 'error')
  } finally {
    saving.value = false
  }
}

// Lifecycle
onMounted(loadQuiz)
</script>

<style scoped>
.quiz-loading,
.quiz-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  text-align: center;
  padding: 40px 20px;
  color: var(--gray);
}

.quiz-error {
  color: var(--danger);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(108, 92, 231, 0.2);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Стили формы */
.form-section {
  background: var(--card-bg);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 20px;
}

.form-section h3 {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.form-group {
  margin-bottom: 16px;
  flex: 1;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--gray);
  margin-bottom: 6px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 12px 16px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  color: #fff;
  font-size: 0.95rem;
  font-family: 'Inter', sans-serif;
  transition: all 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.15);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}

/* Редактор вопроса */
.question-editor {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 16px;
}

.q-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.q-number {
  font-weight: 700;
  color: var(--primary);
}

.q-remove {
  background: none;
  border: none;
  color: var(--danger);
  cursor: pointer;
  font-size: 1.2rem;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.2s;
}

.q-remove:hover {
  background: rgba(225, 112, 85, 0.15);
}

.option-editor {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.option-label {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(255,255,255,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.8rem;
  flex-shrink: 0;
}

.correct-check {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 2px solid rgba(255,255,255,0.15);
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: transparent;
  transition: all 0.2s;
  flex-shrink: 0;
  font-size: 0.9rem;
}

.correct-check.active {
  border-color: var(--success);
  background: rgba(0, 184, 148, 0.2);
  color: var(--success);
}

.explanation-input textarea {
  resize: vertical;
  min-height: 50px;
}

.add-question-btn {
  width: 100%;
  padding: 14px;
  background: rgba(108, 92, 231, 0.1);
  border: 2px dashed rgba(108, 92, 231, 0.3);
  border-radius: 14px;
  color: var(--primary);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.add-question-btn:hover {
  background: rgba(108, 92, 231, 0.15);
  border-color: var(--primary);
}

/* Кнопки действий */
.form-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 40px;
}

.form-actions button {
  flex: 1;
  padding: 16px;
  border-radius: 14px;
  font-size: 1rem;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  transition: all 0.3s;
  border: none;
}

.btn-cancel {
  background: rgba(255,255,255,0.08);
  color: #fff;
}

.btn-cancel:hover {
  background: rgba(255,255,255,0.15);
}

.btn-save {
  background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  color: #fff;
}

.btn-save:hover:not(:disabled) {
  box-shadow: 0 10px 30px rgba(108, 92, 231, 0.3);
  transform: translateY(-2px);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Адаптив */
@media (max-width: 600px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    flex-direction: column;
  }
}
</style>