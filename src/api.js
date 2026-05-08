const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function request(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  })
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`)
  return res.status === 204 ? null : res.json()
}

export const api = {
  getQuizzes: () => request('/api/quizzes'),
  createQuiz: (data) => request('/api/quizzes', { method: 'POST', body: JSON.stringify(data) }),
  updateQuiz: (id, data) => request(`/api/quizzes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteQuiz: (id) => request(`/api/quizzes/${id}`, { method: 'DELETE' }),
  saveResult: (data) => request('/api/results', { method: 'POST', body: JSON.stringify(data) }),
  getResults: () => request('/api/results'),
  clearResults: () => request('/api/results', { method: 'DELETE' })
}