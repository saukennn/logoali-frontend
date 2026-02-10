'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import api from '@/lib/api'
import { useForm } from 'react-hook-form'

interface Movimento {
  id: string
  tipo: string
  valor: number
  origem: string
  registradoEm: string
  registradoPor: {
    nome: string
  }
}

interface MovimentoForm {
  tipo: string
  valor: number
  origem: string
}

export default function CaixaPage() {
  const [movimentos, setMovimentos] = useState<Movimento[]>([])
  const [loading, setLoading] = useState(true)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<MovimentoForm>()

  useEffect(() => {
    loadMovimentos()
  }, [])

  const loadMovimentos = async () => {
    try {
      const response = await api.get('/movimentos-caixa')
      setMovimentos(response.data)
    } catch (error) {
      console.error('Erro ao carregar movimentos:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: MovimentoForm) => {
    try {
      await api.post('/movimentos-caixa', data)
      reset()
      loadMovimentos()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao registrar movimento')
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
        <h1 className="text-2xl font-bold mb-6">Caixa</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Novo Movimento</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <select
                  {...register('tipo', { required: 'Tipo é obrigatório' })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Selecione...</option>
                  <option value="DEPOSITO">Depósito</option>
                  <option value="SANGRIA">Sangria</option>
                  <option value="ENTRADA">Entrada</option>
                  <option value="SAIDA">Saída</option>
                </select>
                {errors.tipo && (
                  <p className="text-red-500 text-sm mt-1">{errors.tipo.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Valor</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('valor', { required: 'Valor é obrigatório', min: 0.01 })}
                  className="w-full px-3 py-2 border rounded-md"
                />
                {errors.valor && (
                  <p className="text-red-500 text-sm mt-1">{errors.valor.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Origem</label>
                <input
                  type="text"
                  {...register('origem', { required: 'Origem é obrigatória' })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Ex: Abertura de caixa"
                />
                {errors.origem && (
                  <p className="text-red-500 text-sm mt-1">{errors.origem.message}</p>
                )}
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
              >
                Registrar
              </button>
            </form>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Histórico</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {movimentos.map((movimento) => (
                <div key={movimento.id} className="p-3 border rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{movimento.origem}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(movimento.registradoEm).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${
                        movimento.tipo === 'ENTRADA' || movimento.tipo === 'DEPOSITO'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {movimento.tipo === 'ENTRADA' || movimento.tipo === 'DEPOSITO' ? '+' : '-'}
                        R$ {Number(movimento.valor).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">{movimento.tipo}</p>
                    </div>
                  </div>
                </div>
              ))}
              {movimentos.length === 0 && (
                <p className="text-gray-500 text-center py-4">Nenhum movimento registrado</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}



