import { reactive } from 'vue'
import { api } from '../api'

export const store = reactive({
  quizzes: [],
  results: [],
  loading: false,
  error: null,

  async init() {
    this.loading = true
    this.error = null
    try {
      const quizzes = await api.getQuizzes()
      this.quizzes = quizzes.map(q => ({
        id: q.id,
        title: q.title,
        desc: q.desc,
        emoji: q.emoji,
        difficulty: q.difficulty,
        isCustom: q.is_custom ?? q.isCustom ?? false,
        timePerQuestion: q.time_per_question ?? q.timePerQuestion ?? 30,
        created_at: q.created_at,
        questions: (q.questions || []).map(qs => ({
          q: qs.text || qs.q || '',
          options: Array.isArray(qs.options) ? qs.options : [],
          correct: typeof qs.correct === 'number' ? qs.correct : 0,
          explanation: qs.explanation || ''
        }))
      }))

      
    } catch (e) {
      console.error('Store init error:', e)
      this.error = e.message || 'Не удалось загрузить данные'
    } finally {
      this.loading = false
    }
  },

  async addCustomQuiz(quiz) {
    // ✅ При отправке убираем isCustom, бэкенд сам выставит is_custom=true
    const payload = {
      title: quiz.title,
      desc: quiz.desc,
      emoji: quiz.emoji,
      difficulty: quiz.difficulty,
      time_per_question: quiz.timePerQuestion,
      questions: quiz.questions.map(q => ({
        text: q.q || q.text,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation
      }))
    }
    await api.createQuiz(payload)
    await this.init()
  },

  async updateCustomQuiz(updated) {
    const payload = {
      title: updated.title,
      desc: updated.desc,
      emoji: updated.emoji,
      difficulty: updated.difficulty,
      time_per_question: updated.timePerQuestion,
      questions: updated.questions.map(q => ({
        text: q.text || q.q,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation
      }))
    }
    await api.updateQuiz(updated.id, payload)
    await this.init()
  },

  async deleteCustomQuiz(id) {
    await api.deleteQuiz(id)
    await this.init()
  },

  async addResult(result) {
    // ✅ Явный маппинг в snake_case для FastAPI
    const payload = {
      quiz_id: result.quizId,
      quiz_name: result.quizName,
      emoji: result.emoji,
      correct: result.correct,
      total: result.total,
      score: result.score,
      time: result.time
    }

    try {
      const saved = await api.saveResult(payload)
      this.lastResult = saved
      if (Array.isArray(this.results)) {
        this.results.unshift(saved)
      }
    } catch (e) {
      console.error('Failed to save result:', e)
      // 🔑 Фоллбэк: если API упал (422/500/сеть), показываем локальные данные
      this.lastResult = {
        ...payload,
        id: 'local_' + Date.now(),
        created_at: new Date().toISOString()
      }
    }
  },


  getQuiz(id) {
    return this.quizzes.find(q => q.id === id)
  }
})