// API配置
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://8.152.170.227:8000'

export const API_ENDPOINTS = {
  // 公开API
  HEALTH: '/',
  LOF_DATA: '/api/lof-data',
  CAPTCHA: '/api/auth/captcha',
  LOGIN: '/api/auth/login',
  REGISTER: '/api/auth/register',

  // 需认证API
  USER_ME: '/api/user/me',
  RULES: '/api/rules',
  TOGGLE_RULE: (id: number) => `/api/rules/${id}/toggle`,
  DELETE_RULE: (id: number) => `/api/rules/${id}`,
} as const

// 辅助函数：构建完整API URL
export const getApiUrl = (endpoint: string): string => {
  return `${API_BASE_URL}${endpoint}`
}

// 辅助函数：带认证的fetch请求
export const fetchWithAuth = async (endpoint: string, options?: RequestInit) => {
  const token = localStorage.getItem('lof_api_token')
  const url = getApiUrl(endpoint)

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': 'Bearer ' + token }),
    ...options?.headers,
  }

  return fetch(url, {
    ...options,
    headers,
  })
}
