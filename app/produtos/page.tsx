'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import api from '@/lib/api'
import { useForm } from 'react-hook-form'

interface Produto {
  id: string
  nome: string
  preco: number
  setor: string
  ativo: boolean
}

interface ProdutoForm {
  nome: string
  preco: number
  setor: string
}

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProdutoForm>()

  useEffect(() => {
    loadProdutos()
  }, [])

  const loadProdutos = async () => {
    try {
      const response = await api.get('/produtos')
      setProdutos(response.data)
    } catch (error) {
      console.error('Erro ao carregar produtos:', error)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: ProdutoForm) => {
    try {
      await api.post('/produtos', data)
      reset()
      loadProdutos()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao criar produto')
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
        <h1 className="text-2xl font-bold mb-6">Produtos</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Novo Produto</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome</label>
                <input
                  type="text"
                  {...register('nome', { required: 'Nome é obrigatório' })}
                  className="w-full px-3 py-2 border rounded-md"
                />
                {errors.nome && (
                  <p className="text-red-500 text-sm mt-1">{errors.nome.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Preço</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('preco', { required: 'Preço é obrigatório', min: 0.01 })}
                  className="w-full px-3 py-2 border rounded-md"
                />
                {errors.preco && (
                  <p className="text-red-500 text-sm mt-1">{errors.preco.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Setor</label>
                <select
                  {...register('setor', { required: 'Setor é obrigatório' })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Selecione...</option>
                  <option value="CHAPA">Chapa</option>
                  <option value="COZINHA">Cozinha</option>
                  <option value="BAR">Bar</option>
                </select>
                {errors.setor && (
                  <p className="text-red-500 text-sm mt-1">{errors.setor.message}</p>
                )}
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
              >
                Criar Produto
              </button>
            </form>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Lista de Produtos</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {produtos.map((produto) => (
                <div key={produto.id} className="p-3 border rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{produto.nome}</p>
                      <p className="text-sm text-gray-600">R$ {Number(produto.preco).toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded text-xs ${
                        produto.setor === 'CHAPA' ? 'bg-orange-100 text-orange-800' :
                        produto.setor === 'COZINHA' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {produto.setor}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {produtos.length === 0 && (
                <p className="text-gray-500 text-center py-4">Nenhum produto cadastrado</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}



