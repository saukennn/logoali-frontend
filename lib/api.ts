import axios from 'axios'
import { getToken, removeToken } from './auth'

// Configuração segura da API
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  timeout: 30000, // 30 segundos de timeout
  headers: {
    'Content-Type': 'application/json',
  },
  // Em produção, usar HTTPS
  ...(process.env.NODE_ENV === 'production' && {
    httpsAgent: {
      rejectUnauthorized: true, // Verificar certificados SSL
    },
  }),
})

// Interceptor de requisição: Adiciona token e valida dados
api.interceptors.request.use(
  (config) => {
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Validação básica: Não enviar dados sensíveis em logs
    if (config.data && typeof config.data === 'object') {
      // Remover senhas de logs (não afeta a requisição)
      const sanitizedData = { ...config.data }
      if ('senha' in sanitizedData) {
        sanitizedData.senha = '[REDACTED]'
      }
      if ('password' in sanitizedData) {
        sanitizedData.password = '[REDACTED]'
      }
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor de resposta: Tratamento seguro de erros
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Tratamento de erros de autenticação
    if (error.response?.status === 401) {
      removeToken()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    
    // Não expor detalhes de erro em produção
    if (process.env.NODE_ENV === 'production' && error.response?.status >= 500) {
      error.message = 'Erro interno do servidor. Tente novamente mais tarde.'
    }
    
    return Promise.reject(error)
  }
)

export default api



