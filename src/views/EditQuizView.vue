<template>
  <div class="quiz-header">
    <div class="quiz-info">
      <button class="back-btn" @click="$router.push('/')">←</button>
      <div class="question-counter">Редактирование квиза</div>
    </div>
  </div>

  <form @submit.prevent="updateQuiz" v-if="quiz">
    <div class="form-section">
      <h3>📝 Основная информация</h3>
      <div class="form-group"><label>Название</label><input v-model="form.title" required></div>
      <div class="form-group"><label>Описание</label><input v-model="form.desc" required></div>
      <div class="form-row">
        <div class="form-group"><label>Эмодзи</label><input v-model="form.emoji" maxlength="4"></div>
        <div class="form-group">
          <label>Сложность</label>
          <select v-model="form.difficulty">
            <option value="easy">Лёгкий</option><option value="medium">Средний</option><option value="hard">Сложный</option>
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
          <button v-if="form.questions.length > 1" type="button" class="q-remove" @click="form.questions.splice(idx, 1)">✕</button>
        </div>
        <div class="form-group"><label>Текст вопроса</label><input v-model="q.text" required></div>
        <div v-for="(opt, oi) in q.options" :key="oi" class="option-editor">
          <span class="option-label">{{ String.fromCharCode(65 + oi) }}</span>
          <input v-model="q.options[oi]" required>
          <button type="button" :class="['correct-check', { active: q.correct === oi }]" @click="q.correct = oi">✓</button>
        </div>
        <div class="explanation-input"><label>💡 Пояснение</label><textarea v-model="q.explanation"></textarea></div>
      </div>
      <button type="button" class="add-question-btn" @click="form.questions.push({ text: '', options: ['', '', '', ''], correct: -1, explanation: '' })">+ Добавить вопрос</button>
    </div>

    <div class="form-actions">
      <button type="button" class="btn-cancel" @click="$router.push('/')">Отмена</button>
      <button type="submit" class="btn-save">💾 Обновить квиз</button>
    </div>
  </form>
</template>

<script setup>
import { reactive, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { store, diffLabels } from '../composables/useQuizStore'
import { showToast } from '../composables/useToast'

const route = useRoute()
const router = useRouter()
const quiz = store.getQuiz(route.params.id)

if (!quiz?.isCustom) router.replace('/')

const form = reactive({
  id: '', title: '', desc: '', emoji: '', difficulty: '', timePerQuestion: 30,
  questions: []
})

onMounted(() => {
  form.id = quiz.id
  form.title = quiz.title
  form.desc = quiz.desc
  form.emoji = quiz.emoji
  form.difficulty = quiz.difficulty
  form.timePerQuestion = quiz.timePerQuestion
  form.questions = quiz.questions.map(q => ({
    text: q.q,
    options: [...q.options],
    correct: q.correct,
    explanation: q.explanation
  }))
})

function updateQuiz() {
  const valid = form.questions.every(q => q.text && q.options.every(o => o) && q.correct >= 0)
  if (!valid) return showToast('Заполните все поля и отметьте правильный ответ', 'error')

  const updated = {
    ...form,
    difficultyLabel: diffLabels[form.difficulty],
    isCustom: true,
    questions: form.questions.map(q => ({
      q: q.text, options: q.options, correct: q.correct,
      explanation: q.explanation || `Правильный ответ: ${q.options[q.correct]}`
    }))
  }

  store.updateCustomQuiz(updated)
  showToast(`Квиз "${form.title}" обновлён! ✅`, 'success')
  router.push('/')
}
</script>