<template>
  <div class="quiz-header">
    <div class="quiz-info">
      <button class="back-btn" @click="$router.push('/')">←</button>
      <div class="question-counter">Создание квиза</div>
    </div>
  </div>

  <form @submit.prevent="saveQuiz">
    <div class="form-section">
      <h3>📝 Основная информация</h3>
      <div class="form-group">
        <label>Название</label>
        <input v-model="form.title" required maxlength="50" placeholder="Например: Космос">
      </div>
      <div class="form-group">
        <label>Описание</label>
        <input v-model="form.desc" required maxlength="100" placeholder="Краткое описание">
      </div>
      <div class="form-row">
        <div class="form-group"><label>Эмодзи</label><input v-model="form.emoji" maxlength="4" value="📝"></div>
        <div class="form-group">
          <label>Сложность</label>
          <select v-model="form.difficulty">
            <option value="easy">Лёгкий</option><option value="medium" selected>Средний</option><option value="hard">Сложный</option>
          </select>
        </div>
        <div class="form-group"><label>Время (сек)</label><input v-model.number="form.timePerQuestion" type="number" min="10" max="120" required></div>
      </div>
    </div>

    <div class="form-section">
      <h3>❓ Вопросы</h3>
      <div v-for="(q, idx) in form.questions" :key="idx" class="question-editor">
        <div class="q-header">
          <span class="q-number">Вопрос {{ idx + 1 }}</span>
          <button v-if="form.questions.length > 1" type="button" class="q-remove" @click="removeQuestion(idx)">✕</button>
        </div>
        <div class="form-group"><label>Текст вопроса</label><input v-model="q.text" required maxlength="200" placeholder="Введите вопрос..."></div>
        <div v-for="(opt, oi) in q.options" :key="oi" class="option-editor">
          <span class="option-label">{{ String.fromCharCode(65 + oi) }}</span>
          <input v-model="q.options[oi]" required maxlength="100" placeholder="Вариант">
          <button type="button" :class="['correct-check', { active: q.correct === oi }]" @click="q.correct = oi">✓</button>
        </div>
        <div class="explanation-input"><label>💡 Пояснение</label><textarea v-model="q.explanation" placeholder="Объяснение (необязательно)"></textarea></div>
      </div>
      <button type="button" class="add-question-btn" @click="addQuestion">+ Добавить вопрос</button>
    </div>

    <div class="form-actions">
      <button type="button" class="btn-cancel" @click="$router.push('/')">Отмена</button>
      <button type="submit" class="btn-save">💾 Сохранить квиз</button>
    </div>
  </form>
</template>

<script setup>
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { store, diffLabels } from '../composables/useQuizStore'
import { showToast } from '../composables/useToast'

const router = useRouter()
const form = reactive({
  title: '', desc: '', emoji: '📝', difficulty: 'medium', timePerQuestion: 30,
  questions: [createEmptyQuestion(), createEmptyQuestion()]
})

function createEmptyQuestion() {
  return { text: '', options: ['', '', '', ''], correct: -1, explanation: '' }
}

const addQuestion = () => form.questions.push(createEmptyQuestion())
const removeQuestion = (idx) => form.questions.splice(idx, 1)

function saveQuiz() {
  const valid = form.questions.every(q => q.text && q.options.every(o => o) && q.correct >= 0)
  if (!valid) return showToast('Заполните все поля и отметьте правильный ответ', 'error')

  const quiz = {
    id: 'custom_' + Date.now(),
    emoji: form.emoji || '📝',
    title: form.title.trim(),
    desc: form.desc.trim(),
    difficulty: form.difficulty,
    difficultyLabel: diffLabels[form.difficulty],
    timePerQuestion: form.timePerQuestion,
    isCustom: true,
    questions: form.questions.map(q => ({
      q: q.text, options: q.options, correct: q.correct,
      explanation: q.explanation || `Правильный ответ: ${q.options[q.correct]}`
    }))
  }

  store.addCustomQuiz(quiz)
  showToast(`Квиз "${quiz.title}" сохранён! ✨`, 'success')
  router.push('/')
}
</script>