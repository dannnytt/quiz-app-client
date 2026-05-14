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

  createSession: (quizId) => request('/api/sessions', { 
    method: 'POST', 
    body: JSON.stringify({ quiz_id: quizId }) 
  }),
  
  joinSession: (hostCode, nickname) => request('/api/sessions/join', {
    method: 'POST',
    body: JSON.stringify({ host_code: hostCode, nickname })
  }),
  
  getSessionState: (sessionId) => request(`/api/sessions/${sessionId}`),
  
  startSession: (sessionId) => request(`/api/sessions/${sessionId}/start`, { method: 'POST' }),
  
  nextQuestion: (sessionId) => request(`/api/sessions/${sessionId}/next`, { method: 'POST' }),
  
  submitAnswer: (sessionId, playerToken, questionIndex, selectedOption, timeLeft) => 
    request(`/api/sessions/${sessionId}/answers`, {
      method: 'POST',
      body: JSON.stringify({ 
        player_token: playerToken, 
        question_index: questionIndex, 
        selected_option: selectedOption,
        time_left: timeLeft
      })
    }),
  
  finishSession: (sessionId) => request(`/api/sessions/${sessionId}/finish`, { method: 'POST' }),
  
  getLeaderboard: (sessionId) => request(`/api/sessions/${sessionId}/leaderboard`),
  
  getSessionPlayers: (sessionId) => request(`/api/sessions/${sessionId}/players`),
  getQuizAnalytics: (quizId) => request(`/api/quizzes/${quizId}/analytics`)
}