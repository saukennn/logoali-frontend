'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import api from '@/lib/api'
import { setToken, setUser } from '@/lib/auth'
import { Button } from '@/components/ui/Button'

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
      setError(err.response?.data?.message || 'Email ou senha incorretos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Painel esquerdo — identidade da marca */}
      <div className="hidden lg:flex lg:w-1/2 bg-brand-500 flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Círculos decorativos */}
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-brand-400 rounded-full opacity-50" />
        <div className="absolute -bottom-16 -right-16 w-96 h-96 bg-brand-600 rounded-full opacity-40" />

        <div className="relative z-10 text-center">
          <h1 className="text-6xl font-black text-white mb-4 tracking-tight">
            Logo<span className="text-brand-900">ali</span>
          </h1>
          <p className="text-brand-100 text-xl font-medium mb-10 max-w-xs leading-relaxed">
            Sistema de gestão completo para o seu bar
          </p>

          {/* Ícones decorativos */}
          <div className="flex gap-8 justify-center mt-8 opacity-70">
            {/* Mesa */}
            <div className="flex flex-col items-center gap-2 text-white">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 10h18M3 10V6a1 1 0 011-1h16a1 1 0 011 1v4M3 10l2 10h14l2-10M9 21v-5m6 5v-5" />
              </svg>
              <span className="text-xs font-semibold uppercase tracking-wider">Mesas</span>
            </div>
            {/* Caixa */}
            <div className="flex flex-col items-center gap-2 text-white">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-semibold uppercase tracking-wider">Caixa</span>
            </div>
            {/* Estoque */}
            <div className="flex flex-col items-center gap-2 text-white">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span className="text-xs font-semibold uppercase tracking-wider">Estoque</span>
            </div>
          </div>
        </div>
      </div>

      {/* Painel direito — formulário */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-surface-alt p-8">
        <div className="w-full max-w-md">
          {/* Logo para mobile */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-4xl font-black text-text">
              Logo<span className="text-brand-500">ali</span>
            </h1>
          </div>

          <div className="bg-surface rounded-2xl shadow-sm border border-border p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-text">Bem-vindo de volta</h2>
              <p className="text-text-subtle text-sm mt-1">Entre com suas credenciais para acessar</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-text-muted mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  {...register('email', { required: 'Email é obrigatório' })}
                  className="w-full px-4 py-2.5 border border-border rounded-lg text-text placeholder-text-subtle bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
                  placeholder="seu@email.com"
                  disabled={loading}
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-text-muted mb-1.5">
                  Senha
                </label>
                <input
                  type="password"
                  {...register('senha', { required: 'Senha é obrigatória' })}
                  className="w-full px-4 py-2.5 border border-border rounded-lg text-text placeholder-text-subtle bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-shadow"
                  placeholder="••••••••"
                  disabled={loading}
                />
                {errors.senha && (
                  <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.senha.message}</p>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-danger-light border border-danger/30 text-danger-dark px-4 py-3 rounded-lg text-sm font-medium">
                  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              <Button type="submit" disabled={loading} fullWidth size="md" className="mt-2">
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Entrando...
                  </>
                ) : 'Entrar'}
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-text-subtle mt-6">
            Logoali — Sistema de gestão para bares
          </p>
        </div>
      </div>
    </div>
  )
}
