const API_BASE = import.meta.env.VITE_API_URL || ''

export { API_BASE }

// ✅ Токен админа теперь берётся из localStorage
export function getAdminToken() {
  return localStorage.getItem('admin_token') || ''
}

export function setAdminToken(token) {
  localStorage.setItem('admin_token', token)
}

export function clearAdminToken() {
  localStorage.removeItem('admin_token')
}

// ✅ Админ тот, у кого есть сохранённый токен
export function isAdmin() {
  return !!getAdminToken()
}

export function getImageUrl(path) {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  return `${API_BASE}${path.startsWith('/') ? path : '/' + path}`
}

async function request(endpoint, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  
  // ✅ Добавляем токен админа для защищённых эндпоинтов
  const token = getAdminToken()
  if (token && needsAdminToken(endpoint, options.method)) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers,
    ...options
  })
  
  // ✅ Если токен невалиден — выходим из админки
  if (res.status === 401 || res.status === 403) {
    clearAdminToken()
    if (window.location.pathname !== '/admin-login') {
      window.location.href = '/admin-login'
    }
    throw new Error('Требуется авторизация администратора')
  }
  
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`API ${res.status}: ${errorText || res.statusText}`)
  }
  
  return res.status === 204 ? null : res.json()
}

// ✅ Определяем, каким эндпоинтам нужен токен
function needsAdminToken(endpoint, method = 'GET') {
  // POST /api/quizzes — создание квиза (только админ)
  if (method === 'POST' && endpoint === '/api/quizzes') {
    return true
  }
  // PUT/DELETE /api/quizzes/... (только админ)
  if ((method === 'PUT' || method === 'DELETE') && endpoint.includes('/api/quizzes')) {
    return true
  }
  // GET /api/quizzes/.../analytics (только админ)
  if (endpoint.includes('/analytics')) {
    return true
  }
  // ✅ POST /api/results убран — теперь доступен всем для сохранения результатов одиночного прохождения
  return false
}

export const api = {
  // ... все ваши существующие методы остаются без изменений ...
  
  // ✅ НОВЫЙ метод: проверка токена админа
  verifyAdminToken: (token) => {
    return fetch(`${API_BASE}/api/auth/verify`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.ok)
  },
  
  getQuizzes: () => request('/api/quizzes'),
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
  saveResult: (data) => request('/api/results', { 
    method: 'POST', 
    body: JSON.stringify(data) 
  }),
  uploadImage: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    const token = getAdminToken()
    return fetch(`${API_BASE}/api/upload/image`, {
      method: 'POST',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      body: formData
    }).then(res => {
      if (!res.ok) throw new Error('Upload failed')
      return res.json()
    })
  },
  createSession: (quizId) => request('/api/sessions', { 
    method: 'POST', 
    body: JSON.stringify({ quiz_id: quizId }) 
  }),
  joinSession: (hostCode, nickname) => request('/api/sessions/join', {
    method: 'POST',
    body: JSON.stringify({ host_code: hostCode, nickname })
  }),
  getSessionState: (sessionId) => request(`/api/sessions/${sessionId}`),
  startSession: (sessionId) => request(`/api/sessions/${sessionId}/start`, { 
    method: 'POST' 
  }),
  nextQuestion: (sessionId) => request(`/api/sessions/${sessionId}/next`, { 
    method: 'POST' 
  }),
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
  finishSession: (sessionId) => request(`/api/sessions/${sessionId}/finish`, { 
    method: 'POST' 
  }),
  getLeaderboard: (sessionId) => request(`/api/sessions/${sessionId}/leaderboard`),
  getSessionPlayers: (sessionId) => request(`/api/sessions/${sessionId}/players`),
  getQuizAnalytics: (quizId) => request(`/api/quizzes/${quizId}/analytics`)
}