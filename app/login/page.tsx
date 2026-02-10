'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import api from '@/lib/api'
import { setToken, setUser } from '@/lib/auth'

interface LoginForm {
  email: string
  senha: string
}

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.post('/auth/login', data)
      setToken(response.data.access_token)
      setUser(response.data.user)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="bg-white p-10 rounded-lg shadow-2xl w-full max-w-md border-2 border-black">
        <h1 className="text-4xl font-bold mb-8 text-center">
          <span className="text-black">Logo</span>
          <span className="text-orange-500">ali</span>
        </h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-bold mb-2 text-black">Email</label>
            <input
              type="email"
              {...register('email', { required: 'Email é obrigatório' })}
              className="w-full px-4 py-3 border-2 border-black rounded-md focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-black bg-white placeholder-gray-400"
              placeholder="seu@email.com"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1 font-medium">{errors.email.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold mb-2 text-black">Senha</label>
            <input
              type="password"
              {...register('senha', { required: 'Senha é obrigatória' })}
              className="w-full px-4 py-3 border-2 border-black rounded-md focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 text-black bg-white placeholder-gray-400"
              placeholder="••••••••"
            />
            {errors.senha && (
              <p className="text-red-500 text-sm mt-1 font-medium">{errors.senha.message}</p>
            )}
          </div>
          {error && (
            <div className="bg-red-50 border-2 border-red-500 text-red-700 px-4 py-3 rounded font-medium">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-md disabled:opacity-50 transition-colors shadow-lg border-2 border-black"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}



