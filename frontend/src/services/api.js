const API_BASE = import.meta.env.VITE_API_URL || '/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('ai_study_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

export const api = {
  // Auth
  login: async (email, password, expectedRole) => {
    const payload = { email, password };
    if (expectedRole) payload.expectedRole = expectedRole;
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Login failed');
    return res.json();
  },
  register: async (userData) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Registration failed');
    return res.json();
  },
  getMe: async () => {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to fetch user profile');
    return res.json();
  },
  switchRole: async () => {
    const res = await fetch(`${API_BASE}/auth/switch-role`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to toggle role');
    return res.json();
  },

  // Seed / Demo
  seedDemo: async () => {
    const res = await fetch(`${API_BASE}/seed/demo`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to seed demo data');
    return res.json();
  },

  // Spaces
  getSpaces: async () => {
    const res = await fetch(`${API_BASE}/spaces`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load spaces');
    return res.json();
  },
  createSpace: async (spaceData) => {
    const res = await fetch(`${API_BASE}/spaces`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(spaceData)
    });
    if (!res.ok) throw new Error('Failed to create space');
    return res.json();
  },
  getSpace: async (spaceId) => {
    const res = await fetch(`${API_BASE}/spaces/${spaceId}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load space');
    return res.json();
  },

  // Projects
  getProjects: async (spaceId) => {
    const url = spaceId ? `${API_BASE}/projects?spaceId=${spaceId}` : `${API_BASE}/projects`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load projects');
    return res.json();
  },
  createProject: async (projectData) => {
    const res = await fetch(`${API_BASE}/projects`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(projectData)
    });
    if (!res.ok) throw new Error('Failed to create project');
    return res.json();
  },
  getProjectDashboard: async (projectId) => {
    const res = await fetch(`${API_BASE}/projects/${projectId}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load project dashboard');
    return res.json();
  },

  // Materials & PDF Upload
  uploadMaterial: async (projectId, file) => {
    const token = localStorage.getItem('ai_study_token');
    const formData = new FormData();
    formData.append('projectId', projectId);
    formData.append('file', file);

    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/materials/upload`, {
      method: 'POST',
      headers,
      body: formData
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Upload failed');
    return res.json();
  },
  getMaterials: async (projectId) => {
    const res = await fetch(`${API_BASE}/materials/project/${projectId}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load materials');
    return res.json();
  },
  retryMaterial: async (materialId) => {
    const res = await fetch(`${API_BASE}/materials/${materialId}/retry`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to retry processing');
    return res.json();
  },
  createTextMaterial: async (projectId, title, content) => {
    const res = await fetch(`${API_BASE}/materials/text`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ projectId, title, content })
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to create notes');
    return res.json();
  },

  // AI Tutor
  getConversation: async (projectId) => {
    const res = await fetch(`${API_BASE}/tutor/conversation/${projectId}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load conversation');
    return res.json();
  },
  sendTutorMessage: async (projectId, message) => {
    const res = await fetch(`${API_BASE}/tutor/message/${projectId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ message })
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to send message');
    return res.json();
  },
  streamTutorMessage: async (projectId, message, onToken) => {
    const res = await fetch(`${API_BASE}/tutor/stream/${projectId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ message })
    });
    if (!res.ok || !res.body) {
      throw new Error('Streaming unavailable');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let donePayload = null;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';
      for (const event of events) {
        const line = event.split('\n').find((l) => l.startsWith('data: '));
        if (!line) continue;
        const payload = JSON.parse(line.slice(6));
        if (payload.type === 'token' && onToken) onToken(payload.token);
        if (payload.type === 'done') donePayload = payload;
        if (payload.type === 'error') throw new Error(payload.error);
      }
    }
    return donePayload;
  },
  clearConversation: async (projectId) => {
    const res = await fetch(`${API_BASE}/tutor/conversation/${projectId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  // Adaptive Quizzes
  generateQuiz: async (projectId) => {
    const res = await fetch(`${API_BASE}/quizzes/generate/${projectId}`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to generate quiz');
    return res.json();
  },
  submitQuiz: async (projectId, quizId, answers) => {
    const res = await fetch(`${API_BASE}/quizzes/submit/${projectId}/${quizId}`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ answers })
    });
    if (!res.ok) throw new Error('Failed to submit quiz');
    return res.json();
  },
  getQuizHistory: async (projectId) => {
    const res = await fetch(`${API_BASE}/quizzes/history/${projectId}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load quiz history');
    return res.json();
  },

  // Mastery & Recommendations
  getMastery: async (projectId) => {
    const res = await fetch(`${API_BASE}/mastery/${projectId}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load mastery data');
    return res.json();
  },
  getRecommendations: async (projectId) => {
    const res = await fetch(`${API_BASE}/mastery/${projectId}/recommendations`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load recommendations');
    return res.json();
  },
  completeRecommendation: async (recId) => {
    const res = await fetch(`${API_BASE}/mastery/recommendations/${recId}/complete`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return res.json();
  },
  triggerGrowthAnalysis: async (projectId) => {
    const res = await fetch(`${API_BASE}/mastery/${projectId}/growth-analysis`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  // Analytics
  getProjectAnalytics: async (projectId) => {
    const res = await fetch(`${API_BASE}/analytics/project/${projectId}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load project analytics');
    return res.json();
  },
  getGlobalAnalytics: async () => {
    const res = await fetch(`${API_BASE}/analytics/global`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load global analytics');
    return res.json();
  },

  // Admin Dashboard
  getAdminOverview: async () => {
    const res = await fetch(`${API_BASE}/admin/overview`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load admin overview');
    return res.json();
  },
  getAdminUsers: async () => {
    const res = await fetch(`${API_BASE}/admin/users`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load users');
    return res.json();
  },
  inspectUser: async (userId) => {
    const res = await fetch(`${API_BASE}/admin/users/${userId}`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to inspect user');
    return res.json();
  },
  getAIObservability: async () => {
    const res = await fetch(`${API_BASE}/admin/observability`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load observability data');
    return res.json();
  },
  getBackgroundJobs: async (status = '') => {
    const url = status ? `${API_BASE}/admin/jobs?status=${status}` : `${API_BASE}/admin/jobs`;
    const res = await fetch(url, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load background jobs');
    return res.json();
  },
  retryJob: async (jobId) => {
    const res = await fetch(`${API_BASE}/admin/jobs/${jobId}/retry`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    return res.json();
  },
  runAIEvalSuite: async () => {
    const res = await fetch(`${API_BASE}/admin/evaluation/run`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to run AI evaluation');
    return res.json();
  },
  getAIEvalHistory: async () => {
    const res = await fetch(`${API_BASE}/admin/evaluation/history`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load evaluation history');
    return res.json();
  },

  // AI Configuration & Testing
  getAIConfig: async () => {
    const res = await fetch(`${API_BASE}/admin/ai-config`, { headers: getAuthHeaders() });
    if (!res.ok) throw new Error('Failed to load AI configuration');
    return res.json();
  },
  updateAIConfig: async (config) => {
    const res = await fetch(`${API_BASE}/admin/ai-config`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(config)
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to update AI configuration');
    return res.json();
  },
  testAIConnection: async (data = {}) => {
    const res = await fetch(`${API_BASE}/admin/ai-config/test`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  }
};
