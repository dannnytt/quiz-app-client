const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export { API_BASE }

export function getImageUrl(path) {
  if (!path) {
    console.log('getImageUrl: no path provided')
    return ''
  }
  console.log('getImageUrl input:', path)
  
  // Если уже абсолютный URL
  if (path.startsWith('http://') || path.startsWith('https://')) {
    console.log('getImageUrl: absolute URL, returning as is')
    return path
  }
  
  // Убедитесь, что путь начинается с /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const fullUrl = `${API_BASE}${normalizedPath}`
  console.log('getImageUrl full URL:', fullUrl)
  
  return fullUrl
}


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
  getQuizAnalytics: (quizId) => request(`/api/quizzes/${quizId}/analytics`),
  
  uploadImage: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    
    return fetch(`${API_BASE}/api/upload/image`, {
      method: 'POST',
      body: formData
    }).then(res => {
      if (!res.ok) throw new Error('Upload failed')
      return res.json()
    })
  },
}