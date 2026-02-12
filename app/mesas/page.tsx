'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import api from '@/lib/api'
import { getUser } from '@/lib/auth'

interface Conta {
  id: string
  apelido: string
  status: string
}

interface Mesa {
  id: string
  numero: number
  status: 'LIVRE' | 'OCUPADA' | 'FECHADA'
  sessoes?: Array<{
    id: string
    garcom: {
      id: string
      nome: string
    }
    contas: Conta[]
  }>
}

export default function MesasPage() {
  const router = useRouter()
  const user = getUser()
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [loading, setLoading] = useState(true)

  const loadMesas = useCallback(async () => {
    try {
      const response = await api.get('/mesas')
      setMesas(response.data)
    } catch (error) {
      console.error('Erro ao carregar mesas:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMesas()
    const interval = setInterval(loadMesas, 30000)
    return () => clearInterval(interval)
  }, [loadMesas])

  const handleAbrirMesa = async (mesaId: string) => {
    try {
      const response = await api.post('/sessoes-mesa', {
        mesaId,
        garcomId: user?.id,
      })
      router.push(`/mesas/${response.data.id}`)
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao abrir mesa')
    }
  }

  const handleClickMesa = (mesa: Mesa) => {
    if (mesa.status === 'OCUPADA' && mesa.sessoes && mesa.sessoes.length > 0) {
      router.push(`/mesas/${mesa.sessoes[0].id}`)
    } else if (mesa.status === 'LIVRE') {
      handleAbrirMesa(mesa.id)
    }
  }

  const livres = mesas.filter((m) => m.status === 'LIVRE').length
  const ocupadas = mesas.filter((m) => m.status === 'OCUPADA').length

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg font-medium text-gray-500">Carregando mesas...</div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
          <h1 className="text-2xl font-bold">Mesas</h1>
          <div className="flex gap-4 text-sm font-semibold">
            <span className="bg-green-500 text-white px-3 py-1 rounded">
              Livres: {livres}
            </span>
            <span className="bg-orange-500 text-white px-3 py-1 rounded">
              Ocupadas: {ocupadas}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {mesas.map((mesa) => {
            const sessao = mesa.sessoes?.[0]
            const qtdContas = sessao?.contas?.length || 0

            return (
              <div
                key={mesa.id}
                onClick={() => handleClickMesa(mesa)}
                className={`
                  rounded-lg border-2 border-black p-4 cursor-pointer
                  transition-all hover:scale-105 hover:shadow-lg
                  flex flex-col items-center justify-center min-h-[140px]
                  ${mesa.status === 'LIVRE'
                    ? 'bg-green-500 text-white'
                    : mesa.status === 'OCUPADA'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-300 text-gray-600 cursor-default'
                  }
                `}
              >
                <span className="text-3xl font-black">{mesa.numero}</span>
                <span className="text-xs font-semibold mt-1 uppercase tracking-wide opacity-90">
                  {mesa.status}
                </span>

                {mesa.status === 'OCUPADA' && sessao && (
                  <div className="mt-2 text-center text-xs leading-tight">
                    <div className="font-semibold">{sessao.garcom?.nome}</div>
                    <div className="opacity-80">
                      {qtdContas} {qtdContas === 1 ? 'conta' : 'contas'}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </Layout>
  )
}
