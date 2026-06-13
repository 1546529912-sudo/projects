import axios, { type AxiosInstance } from 'axios'

const http: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (response) => {
    // iter-18 滑动续期：服务端在临期时通过 X-Refresh-Token 头送来新 token
    const newToken = response.headers?.['x-refresh-token']
    if (newToken) {
      localStorage.setItem('access_token', newToken)
    }
    return response.data
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)

export default http

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}
