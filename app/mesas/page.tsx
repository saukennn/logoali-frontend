'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import api from '@/lib/api'
import { getUser } from '@/lib/auth'

interface Mesa {
  id: string
  numero: number
  status: 'LIVRE' | 'OCUPADA' | 'FECHADA'
  sessoes?: Array<{
    id: string
    garcom: {
      nome: string
    }
  }>
}

export default function MesasPage() {
  const router = useRouter()
  const user = getUser()
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMesas()
  }, [])

  const loadMesas = async () => {
    try {
      const response = await api.get('/mesas')
      setMesas(response.data)
    } catch (error) {
      console.error('Erro ao carregar mesas:', error)
    } finally {
      setLoading(false)
    }
  }

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'LIVRE':
        return 'bg-green-100 text-green-800'
      case 'OCUPADA':
        return 'bg-yellow-100 text-yellow-800'
      case 'FECHADA':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="text-center">Carregando...</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-2xl font-bold mb-6">Mesas</h1>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {mesas.map((mesa) => (
            <div
              key={mesa.id}
              className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition"
              onClick={() => {
                if (mesa.status === 'OCUPADA' && mesa.sessoes && mesa.sessoes.length > 0) {
                  router.push(`/mesas/${mesa.sessoes[0].id}`)
                } else if (mesa.status === 'LIVRE') {
                  handleAbrirMesa(mesa.id)
                }
              }}
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Mesa {mesa.numero}</h2>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(mesa.status)}`}>
                  {mesa.status}
                </span>
              </div>
              {mesa.status === 'OCUPADA' && mesa.sessoes && mesa.sessoes.length > 0 && (
                <p className="text-sm text-gray-600">
                  Garçom: {mesa.sessoes[0].garcom.nome}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  )
}



