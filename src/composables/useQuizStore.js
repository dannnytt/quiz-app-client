import { reactive } from 'vue'
import { api } from '../api'

export const store = reactive({
  quizzes: [],
  results: [],
  lastResult: null,
  loading: false,
  error: null,

  async init() {
    this.loading = true
    this.error = null
    try {
      const [quizzes, results] = await Promise.all([api.getQuizzes(), api.getResults()])
      
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

      this.results = (results || []).map(r => ({
        id: r.id,
        quizName: r.quiz_name || r.quizName,
        quizId: r.quiz_id || r.quizId,
        emoji: r.emoji,
        correct: r.correct ?? 0,
        total: r.total ?? 1,
        score: r.score ?? 0,
        time: r.time ?? 0,
        created_at: r.created_at || r.date
      }))
      
      this.results = results || []
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
    const saved = await api.saveResult(result)
    this.lastResult = saved
    this.results.unshift(saved)
  },

  async clearResults() {
    await api.clearResults()
    this.results = []
    this.lastResult = null
  },

  getQuiz(id) {
    return this.quizzes.find(q => q.id === id)
  }
})