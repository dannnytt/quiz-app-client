<template>
  <div v-if="loading" class="quiz-loading">
    <div class="loading-spinner"></div>
    <p>Загрузка квиза...</p>
  </div>

  <div v-else-if="error || !quiz" class="quiz-error">
    <p>{{ error || 'Квиз не найден' }}</p>
    <button class="back-btn" @click="$router.push('/')" style="margin-top: 16px;">
      На главную
    </button>
  </div>

  <template v-else>
    <div class="quiz-header">
      <div class="quiz-info">
        <button class="back-btn" @click="$router.push('/')">←</button>
        <div class="question-counter">Редактирование: {{ quiz.title }}</div>
      </div>
    </div>

    <form @submit.prevent="updateQuiz">
      <div class="form-section">
        <h3>Основная информация</h3>
        
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
            <label>Сложность</label>
            <select v-model="form.difficulty">
              <option value="easy">Лёгкий</option>
              <option value="medium">Средний</option>
              <option value="hard">Сложный</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Время на вопрос (сек)</label>
            <input v-model.number="form.timePerQuestion" type="number" min="10" max="300" required>
          </div>
        </div>
      </div>

      <div class="form-section">
        <h3>Вопросы ({{ form.questions.length }})</h3>
        
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
            <label>Пояснение (необязательно)</label>
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
          {{ saving ? 'Сохранение...' : 'Обновить квиз' }}
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

const loading = ref(true)
const error = ref(null)
const saving = ref(false)
const quiz = ref(null)

const form = reactive({
  id: '',
  title: '',
  desc: '',
  difficulty: 'medium',
  timePerQuestion: 30,
  questions: []
})

let questionUid = 0

async function loadQuiz() {
  loading.value = true
  error.value = null
  
  try {
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
    
    const found = store.getQuiz(route.params.id)
    
    if (!found) {
      error.value = 'Квиз не найден в базе данных'
      return
    }
    
    if (!found.isCustom) {
      error.value = 'Редактирование доступно только для созданных вами квизов'
      return
    }
    
    quiz.value = found
    
    form.id = found.id
    form.title = found.title || ''
    form.desc = found.desc || ''
    form.emoji = found.emoji || '📝'
    form.difficulty = found.difficulty || 'medium'
    form.timePerQuestion = found.time_per_question || found.timePerQuestion || 30
    
    form.questions = (found.questions || []).map(q => ({
      _uid: questionUid++,
      text: q.text || q.q || '',
      options: Array.isArray(q.options) ? [...q.options] : ['', '', '', ''],
      correct: typeof q.correct === 'number' ? q.correct : 0,
      explanation: q.explanation || ''
    }))
    
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

function addQuestion() {
  form.questions.push({
    _uid: questionUid++,
    text: '',
    options: ['', '', '', ''],
    correct: 0,
    explanation: ''
  })
}

function removeQuestion(idx) {
  if (form.questions.length <= 1) {
    showToast('Должен быть хотя бы один вопрос', 'error')
    return
  }
  form.questions.splice(idx, 1)
}

function setCorrectAnswer(question, index) {
  question.correct = index
}

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

async function updateQuiz() {
  if (!validateForm() || saving.value) return
  
  saving.value = true
  
  try {
    const payload = {
      id: form.id,
      title: form.title.trim(),
      desc: form.desc.trim(),
      difficulty: form.difficulty,
      time_per_question: form.timePerQuestion,
      isCustom: true,
      questions: form.questions.map(q => ({
        text: q.text.trim(),
        options: q.options.map(o => o.trim()),
        correct: q.correct,
        explanation: q.explanation?.trim() || `Правильный ответ: ${q.options[q.correct]}`
      }))
    }
    
    await store.updateCustomQuiz(payload)
    
    showToast(`Квиз "${form.title}" обновлён!`, 'success')
    router.push('/')
    
  } catch (e) {
    console.error('Update failed:', e)
    showToast('Ошибка при обновлении: ' + (e.message || 'Неизвестная ошибка'), 'error')
  } finally {
    saving.value = false
  }
}

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
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.form-section {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.form-section h3 {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--dark);
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
  background: var(--input-bg, #f8f9fa);
  border: 1px solid var(--input-border, #dee2e6);
  border-radius: 12px;
  color: var(--dark, #2d3436) !important;
  -webkit-text-fill-color: var(--dark, #2d3436) !important;
  font-size: 0.95rem;
  font-family: 'Inter', sans-serif;
  transition: all 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(108, 92, 231, 0.1);
  background: #fff;
}

.form-group input::placeholder,
.form-group textarea::placeholder {
  color: var(--input-placeholder, #adb5bd) !important;
  opacity: 1 !important;
}

.form-group select option {
  background: var(--card-bg);
  color: var(--dark);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
}

.question-editor {
  background: var(--card-bg2);
  border: 1px solid var(--border);
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
  background: rgba(225, 112, 85, 0.1);
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
  background: var(--card-bg);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.8rem;
  flex-shrink: 0;
  color: var(--dark);
}

.option-editor input {
  flex: 1;
  padding: 10px 14px;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 10px;
  color: var(--dark) !important;
  -webkit-text-fill-color: var(--dark) !important;
  font-size: 0.9rem;
  font-family: 'Inter', sans-serif;
}

.option-editor input:focus {
  outline: none;
  border-color: var(--primary);
  background: #fff;
}

.option-editor input::placeholder {
  color: var(--input-placeholder) !important;
  opacity: 1 !important;
}

.correct-check {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 2px solid var(--input-border);
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
  background: rgba(0, 184, 148, 0.1);
  color: var(--success) !important;
  -webkit-text-fill-color: var(--success) !important;
}

.explanation-input {
  margin-top: 10px;
}

.explanation-input textarea {
  width: 100%;
  padding: 10px 14px;
  background: var(--input-bg);
  border: 1px solid var(--input-border);
  border-radius: 10px;
  color: var(--dark) !important;
  -webkit-text-fill-color: var(--dark) !important;
  font-size: 0.85rem;
  font-family: 'Inter', sans-serif;
  resize: vertical;
  min-height: 60px;
}

.explanation-input textarea:focus {
  outline: none;
  border-color: var(--primary);
  background: #fff;
}

.explanation-input textarea::placeholder {
  color: var(--input-placeholder) !important;
  opacity: 1 !important;
}

.explanation-input label {
  display: block;
  font-size: 0.8rem;
  color: var(--gray);
  margin-bottom: 6px;
}

.add-question-btn {
  width: 100%;
  padding: 14px;
  background: rgba(108, 92, 231, 0.05);
  border: 2px dashed rgba(108, 92, 231, 0.3);
  border-radius: 14px;
  color: var(--primary);
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.add-question-btn:hover {
  background: rgba(108, 92, 231, 0.1);
  border-color: var(--primary);
}

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
  border: none;
}

.btn-cancel {
  background: var(--card-bg);
  color: var(--dark);
  border: 1px solid var(--border);
}

.btn-cancel:hover {
  background: var(--card-bg2);
  border-color: var(--danger);
}

.btn-save {
  background: var(--primary);
  color: #fff;
}

/* .btn-save:hover:not(:disabled) {
  box-shadow: 0 10px 30px rgba(108, 92, 231, 0.2);
  transform: translateY(-2px);
}

.btn-save:disabled {
  opacity: 0.6;
  cursor: not-allowed;
} */

@media (max-width: 600px) {
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .form-actions {
    flex-direction: column;
  }
}

.form-group input:-webkit-autofill,
.form-group input:-webkit-autofill:hover,
.form-group input:-webkit-autofill:focus,
.option-editor input:-webkit-autofill,
.explanation-input textarea:-webkit-autofill {
  -webkit-text-fill-color: var(--dark, #2d3436) !important;
  -webkit-box-shadow: 0 0 0 1000px #fff inset !important;
  box-shadow: 0 0 0 1000px #fff inset !important;
  transition: background-color 5000s ease-in-out 0s;
}
</style>