import { reactive } from 'vue'
import { api, getCurrentUser } from '../api'

export const store = reactive({
  quizzes: [],
  myQuizzes: [],
  results: [],
  currentUser: getCurrentUser(),
  loading: false,
  error: null,

  async init() {
    this.loading = true
    this.error = null
    try {
      const quizzes = await api.getQuizzes()
      this.quizzes = this._normalizeQuizzes(quizzes)
      
      // Если пользователь авторизован — загружаем его квизы
      if (this.currentUser) {
        try {
          const myQuizzes = await api.getMyQuizzes()
          this.myQuizzes = this._normalizeQuizzes(myQuizzes)
        } catch (e) {
          console.error('Failed to load my quizzes:', e)
        }
      }
    } catch (e) {
      console.error('Store init error:', e)
      this.error = e.message || 'Не удалось загрузить данные'
    } finally {
      this.loading = false
    }
  },

  _normalizeQuizzes(quizzes) {
    return (quizzes || []).map(q => ({
      id: q.id,
      title: q.title,
      desc: q.desc,
      emoji: q.emoji || '📝',
      difficulty: q.difficulty,
      isCustom: q.is_custom ?? q.isCustom ?? false,
      timePerQuestion: q.time_per_question ?? q.timePerQuestion ?? 30,
      created_at: q.created_at,
      cover_image: q.cover_image || null,
      owner_id: q.owner_id || null,
      owner_nickname: q.owner_nickname || null,
      questions: (q.questions || []).map(qs => ({
        q: qs.text || qs.q || '',
        options: Array.isArray(qs.options) ? qs.options : [],
        correct: typeof qs.correct === 'number' ? qs.correct : 0,
        explanation: qs.explanation || '',
        image: qs.image || null
      }))
    }))
  },

  async addCustomQuiz(quiz) {
    const payload = {
      title: quiz.title,
      desc: quiz.desc,
      difficulty: quiz.difficulty,
      time_per_question: quiz.timePerQuestion,
      cover_image: quiz.cover_image,
      questions: quiz.questions.map(q => ({
        text: q.q || q.text,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation,
        image: q.image || null
      }))
    }
    await api.createQuiz(payload)
    await this.init()
  },

  async updateCustomQuiz(updated) {
    const payload = {
      title: updated.title,
      desc: updated.desc,
      difficulty: updated.difficulty,
      time_per_question: updated.timePerQuestion,
      cover_image: updated.cover_image,
      questions: updated.questions.map(q => ({
        text: q.text || q.q,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation,
        image: q.image || null
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
      this.lastResult = {
        ...payload,
        id: 'local_' + Date.now(),
        created_at: new Date().toISOString()
      }
    }
  },

  getQuiz(id) {
    return this.quizzes.find(q => q.id === id)
  },

  // Проверка: является ли текущий пользователь владельцем квиза
  isQuizOwner(quiz) {
    if (!this.currentUser || !quiz) return false
    return quiz.owner_id === this.currentUser.id
  },

  // Проверка: можно ли редактировать квиз
  canEditQuiz(quiz) {
    if (!quiz) return false
    // Системные квизы (без владельца) — нельзя
    if (!quiz.owner_id) return false
    return this.isQuizOwner(quiz)
  }
})