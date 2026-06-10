const API_BASE = import.meta.env.VITE_API_URL || ''

export { API_BASE }

// ========== АВТОРИЗАЦИЯ ==========

export function getToken() {
  return localStorage.getItem('auth_token') || ''
}

export function setToken(token) {
  localStorage.setItem('auth_token', token)
}

export function clearToken() {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('auth_user')
}

export function getCurrentUser() {
  const user = localStorage.getItem('auth_user')
  return user ? JSON.parse(user) : null
}

export function setCurrentUser(user) {
  localStorage.setItem('auth_user', JSON.stringify(user))
}

export function isAuthenticated() {
  return !!getToken()
}

// ========== БАЗОВЫЙ REQUEST ==========

async function request(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  
  const token = getToken()
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers,
    ...options
  })
  
  // Если токен невалиден — выходим
  if (res.status === 401 || res.status === 403) {
    clearToken()
    if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
      window.location.href = '/login'
    }
    throw new Error('Требуется авторизация')
  }
  
  if (!res.ok) {
    const errorText = await res.text()
    
    let message = errorText
    try {
      const err = JSON.parse(errorText)
      message = err.detail || err.message || errorText
    } catch {
    }
    
    throw new Error(message || `API ${res.status}: ${res.statusText}`)
  }
  
  return res.status === 204 ? null : res.json()
}

// ========== УТИЛИТЫ ==========

export function getImageUrl(path) {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${API_BASE}${path.startsWith('/') ? path : '/' + path}`
}

// ========== API ==========

export const api = {
  // --- Авторизация ---
  register: (email, nickname, password) => request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, nickname, password })
  }),
  login: (email, password) => request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }),
  getMe: () => request('/api/auth/me'),
  
  // --- Квизы ---
  getQuizzes: () => request('/api/quizzes'),
  getMyQuizzes: () => request('/api/quizzes/my'),
  createQuiz: (data) => request('/api/quizzes', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateQuiz: (id, data) => request(`/api/quizzes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteQuiz: (id) => request(`/api/quizzes/${id}`, {
    method: 'DELETE'
  }),
  
  // --- Результаты ---
  saveResult: (data) => request('/api/results', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  // --- Изображения ---
  uploadImage: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const token = getToken()
    return fetch(`${API_BASE}/api/upload/image`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData
    }).then(res => {
      if (!res.ok) throw new Error('Upload failed')
      return res.json()
    })
  },
  
  // --- Сессии ---
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