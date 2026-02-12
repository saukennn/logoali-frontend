'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import api from '@/lib/api'

interface ItemEstoque {
  id: string
  codigo?: string
  nome: string
  categoria: string
  unidadeMedida: string
  precoCompra?: number
  precoVenda?: number
  ativo: boolean
  tipo?: 'ESTOQUE' | 'PRODUTO'
}

interface Produto {
  id: string
  nome: string
  preco: number
  setor: string
  ativo: boolean
}

type ItemFinanceiro = ItemEstoque | (Produto & { tipo: 'PRODUTO' })

export default function FinanceiroPage() {
  const [itens, setItens] = useState<ItemFinanceiro[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroCategoria, setFiltroCategoria] = useState<string>('')
  const [busca, setBusca] = useState('')
  const [itemEditando, setItemEditando] = useState<ItemFinanceiro | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    precoCompra: '',
    precoVenda: '',
  })

  useEffect(() => {
    loadItens()
  }, [filtroCategoria, busca])

  const loadItens = async () => {
    try {
      setLoading(true)

      // Buscar apenas produtos (menu de vendas)
      const responseProdutos = await api.get('/produtos')

      // Filtrar produtos se houver busca
      let produtosFiltrados = responseProdutos.data
      if (busca) {
        produtosFiltrados = produtosFiltrados.filter((produto: Produto) =>
          produto.nome.toLowerCase().includes(busca.toLowerCase())
        )
      }

      const produtos: ItemFinanceiro[] = produtosFiltrados.map((produto: Produto) => ({
        id: produto.id,
        nome: produto.nome,
        categoria: produto.setor,
        unidadeMedida: '-',
        precoVenda: Number(produto.preco),
        ativo: produto.ativo,
        tipo: 'PRODUTO' as const,
        codigo: undefined,
        precoCompra: undefined
      }))

      // Ordenar produtos por nome
      const todosItens = produtos.sort((a, b) =>
        a.nome.localeCompare(b.nome)
      )

      setItens(todosItens)
    } catch (error) {
      console.error('Erro ao carregar itens:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEditarPrecos = (item: ItemFinanceiro) => {
    setItemEditando(item)
    if (item.tipo === 'PRODUTO') {
      // Para produtos, só permite editar preço de venda
      setFormData({
        precoCompra: '',
        precoVenda: item.precoVenda?.toString() || '',
      })
    } else {
      // Para itens de estoque, permite editar ambos
      setFormData({
        precoCompra: item.precoCompra?.toString() || '',
        precoVenda: item.precoVenda?.toString() || '',
      })
    }
  }

  const handleSalvarPrecos = async () => {
    if (!itemEditando) return

    try {
      if (itemEditando.tipo === 'PRODUTO') {
        // Atualizar produto - apenas preço de venda
        await api.patch(`/produtos/${itemEditando.id}`, {
          preco: formData.precoVenda ? parseFloat(formData.precoVenda) : undefined,
        })
      } else {
        // Atualizar item de estoque
        await api.patch(`/estoque/itens/${itemEditando.id}`, {
          precoCompra: formData.precoCompra ? parseFloat(formData.precoCompra) : undefined,
          precoVenda: formData.precoVenda ? parseFloat(formData.precoVenda) : undefined,
        })
      }
      setItemEditando(null)
      loadItens()
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Erro ao salvar preços')
    }
  }

  const getCategoriaColor = (categoria: string) => {
    const colors: Record<string, string> = {
      BEBIDAS: 'bg-blue-100 text-blue-800',
      ALIMENTOS: 'bg-green-100 text-green-800',
      LIMPEZA: 'bg-yellow-100 text-yellow-800',
      UTENSILIOS: 'bg-purple-100 text-purple-800',
      OUTROS: 'bg-gray-100 text-gray-800',
    }
    return colors[categoria] || colors.OUTROS
  }

  const calcularMargem = (precoCompra?: number, precoVenda?: number): string => {
    if (!precoCompra || !precoVenda) return '-'
    const margem = ((precoVenda - precoCompra) / precoCompra) * 100
    return `${margem.toFixed(1)}%`
  }

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8 text-black">
            Controle <span className="text-orange-500">Financeiro</span>
          </h1>
          <p className="text-gray-600 mb-6">
            Gerencie os preços de compra e venda dos itens do estoque
          </p>

          {/* Filtros */}
          <div className="bg-white border-2 border-black rounded-lg p-4 mb-6 shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2 text-black">Buscar</label>
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Nome ou código..."
                  className="w-full px-3 py-2 border-2 border-black rounded-md focus:outline-none focus:border-orange-500 text-black bg-white placeholder-gray-400"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-black">Categoria</label>
                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded-md focus:outline-none focus:border-orange-500 text-black bg-white"
                >
                  <option value="">Todas</option>
                  <option value="BEBIDAS">Bebidas</option>
                  <option value="ALIMENTOS">Alimentos</option>
                  <option value="LIMPEZA">Limpeza</option>
                  <option value="UTENSILIOS">Utensílios</option>
                  <option value="OUTROS">Outros</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabela de itens */}
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Carregando...</p>
            </div>
          ) : itens.length === 0 ? (
            <div className="bg-white border-2 border-black rounded-lg p-12 text-center shadow-lg">
              <p className="text-gray-600 text-lg">Nenhum item encontrado</p>
            </div>
          ) : (
            <div className="bg-white border-2 border-black rounded-lg shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-black">
                  <thead className="bg-black">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">
                        Código
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">
                        Nome
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">
                        Categoria/Setor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">
                        Preço Compra
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">
                        Preço Venda
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">
                        Margem
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {itens.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                          <span className={`px-2 py-1 text-xs font-bold rounded ${
                            item.tipo === 'PRODUTO' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {item.tipo === 'PRODUTO' ? 'PRODUTO' : 'ESTOQUE'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                          {item.codigo || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                          {item.nome}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-bold rounded ${
                              item.tipo === 'PRODUTO'
                                ? item.categoria === 'CHAPA' 
                                  ? 'bg-orange-100 text-orange-800'
                                  : item.categoria === 'COZINHA'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                                : getCategoriaColor(item.categoria)
                            }`}
                          >
                            {item.categoria}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-black font-medium">
                          {item.precoCompra
                            ? `R$ ${Number(item.precoCompra).toFixed(2)}`
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-black font-medium">
                          {item.precoVenda
                            ? `R$ ${Number(item.precoVenda).toFixed(2)}`
                            : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                          <span
                            className={
                              item.precoCompra && item.precoVenda
                                ? Number(item.precoVenda) >= Number(item.precoCompra)
                                  ? 'text-green-600'
                                  : 'text-red-600'
                                : 'text-gray-500'
                            }
                          >
                            {calcularMargem(item.precoCompra, item.precoVenda)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleEditarPrecos(item)}
                            className="text-orange-500 hover:text-orange-600 font-bold"
                          >
                            {item.tipo === 'PRODUTO' ? 'Editar Preço' : 'Editar Preços'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Edição de Preços */}
      {itemEditando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white border-2 border-black rounded-lg p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 text-black">
              {itemEditando.tipo === 'PRODUTO' ? 'Editar Preço de Venda' : 'Editar Preços'} - {itemEditando.nome}
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              <strong>Tipo:</strong> {itemEditando.tipo === 'PRODUTO' ? 'Produto' : 'Item de Estoque'}
              {itemEditando.codigo && (
                <>
                  <br />
                  <strong>Código:</strong> {itemEditando.codigo}
                </>
              )}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSalvarPrecos()
              }}
              className="space-y-4"
            >
              {itemEditando.tipo === 'ESTOQUE' && (
                <div>
                  <label className="block text-sm font-bold mb-1 text-black">
                    Preço de Compra (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.precoCompra}
                    onChange={(e) =>
                      setFormData({ ...formData, precoCompra: e.target.value })
                    }
                    className="w-full px-3 py-2 border-2 border-black rounded-md text-black bg-white placeholder-gray-400"
                    placeholder="0.00"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-bold mb-1 text-black">
                  Preço de Venda (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.precoVenda}
                  onChange={(e) =>
                    setFormData({ ...formData, precoVenda: e.target.value })
                  }
                  className="w-full px-3 py-2 border-2 border-black rounded-md text-black bg-white placeholder-gray-400"
                  placeholder="0.00"
                  required
                />
              </div>
              {itemEditando.tipo === 'ESTOQUE' && formData.precoCompra && formData.precoVenda && (
                <div className="p-3 bg-gray-50 border-2 border-black rounded-md">
                  <p className="text-sm text-black">
                    <strong>Margem:</strong>{' '}
                    <span
                      className={
                        parseFloat(formData.precoVenda) >= parseFloat(formData.precoCompra)
                          ? 'text-green-600 font-bold'
                          : 'text-red-600 font-bold'
                      }
                    >
                      {calcularMargem(
                        parseFloat(formData.precoCompra),
                        parseFloat(formData.precoVenda),
                      )}
                    </span>
                  </p>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setItemEditando(null)}
                  className="px-6 py-2 border-2 border-black text-black font-bold rounded-md hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-md border-2 border-black"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Erro */}
      {errorMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl border-2 border-black">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-red-600 text-xl font-bold">✕</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro</h3>
                <p className="text-gray-600">{errorMessage}</p>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setErrorMessage(null)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-bold border-2 border-black"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

