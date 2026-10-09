import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://cinema-backend-endpoint-f0cfdnhjb7heanfg.z03.azurefd.net'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cinema_access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('cinema_access_token')
      localStorage.removeItem('cinema_user')
    }
    return Promise.reject(error)
  }
)

export const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Something went wrong.'
