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
  precoCompra?: number
  setor: string
  ativo: boolean
}

type ItemFinanceiro = ItemEstoque

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
        precoCompra: produto.precoCompra ? Number(produto.precoCompra) : undefined,
        ativo: produto.ativo,
        tipo: 'PRODUTO' as const,
        codigo: undefined,
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
      setFormData({
        precoCompra: item.precoCompra?.toString() || '',
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
        await api.patch(`/produtos/${itemEditando.id}`, {
          preco: formData.precoVenda ? parseFloat(formData.precoVenda) : undefined,
          precoCompra: formData.precoCompra ? parseFloat(formData.precoCompra) : undefined,
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
      <div className="py-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-text">Preços</h1>
            <p className="text-sm text-text-subtle mt-0.5">Gerencie os preços de compra e venda dos produtos</p>
          </div>

          {/* Filtros */}
          <div className="bg-surface border border-border rounded-xl p-4 mb-5 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-text-muted">Buscar</label>
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Nome do produto..."
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-text-muted">Categoria</label>
                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-surface"
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
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : itens.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl p-12 text-center shadow-sm">
              <p className="text-text-subtle text-sm">Nenhum item encontrado</p>
            </div>
          ) : (
            <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead className="bg-surface-alt">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-text-subtle uppercase tracking-wide">
                        Tipo
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-text-subtle uppercase tracking-wide">
                        Nome
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-text-subtle uppercase tracking-wide">
                        Categoria/Setor
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-text-subtle uppercase tracking-wide">
                        Preço Compra
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-text-subtle uppercase tracking-wide">
                        Preço Venda
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-text-subtle uppercase tracking-wide">
                        Margem
                      </th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-text-subtle uppercase tracking-wide">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface divide-y divide-border">
                    {itens.map((item) => (
                      <tr key={item.id} className="hover:bg-surface-hover transition-colors">
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                            item.tipo === 'PRODUTO' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {item.tipo === 'PRODUTO' ? 'PRODUTO' : 'ESTOQUE'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm font-medium text-text">
                          {item.nome}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                            item.tipo === 'PRODUTO'
                              ? item.categoria === 'CHAPA'
                                ? 'bg-orange-100 text-orange-800'
                                : item.categoria === 'COZINHA'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                              : getCategoriaColor(item.categoria)
                          }`}>
                            {item.categoria}
                          </span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-sm text-text-muted text-right">
                          {item.precoCompra ? `R$ ${Number(item.precoCompra).toFixed(2)}` : '-'}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-sm font-semibold text-text text-right">
                          {item.precoVenda ? `R$ ${Number(item.precoVenda).toFixed(2)}` : '-'}
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-sm text-right">
                          <span className={`font-medium ${
                            item.precoCompra && item.precoVenda
                              ? Number(item.precoVenda) >= Number(item.precoCompra) ? 'text-green-600' : 'text-red-600'
                              : 'text-text-subtle'
                          }`}>
                            {calcularMargem(item.precoCompra, item.precoVenda)}
                          </span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleEditarPrecos(item)}
                            className="px-2.5 py-1 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-md transition-colors"
                          >
                            Editar Preço
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-text">
                Editar Preço — {itemEditando.nome}
              </h2>
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); handleSalvarPrecos() }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-text-muted">
                  Preço de Compra (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.precoCompra}
                  onChange={(e) => setFormData({ ...formData, precoCompra: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-text-muted">
                  Preço de Venda (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.precoVenda}
                  onChange={(e) => setFormData({ ...formData, precoVenda: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="0.00"
                  required
                />
              </div>
              {formData.precoCompra && formData.precoVenda && (
                <div className="p-3 bg-surface-alt rounded-lg border border-border">
                  <p className="text-sm text-text-muted">
                    Margem:{' '}
                    <span className={`font-bold ${
                      parseFloat(formData.precoVenda) >= parseFloat(formData.precoCompra)
                        ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {calcularMargem(parseFloat(formData.precoCompra), parseFloat(formData.precoVenda))}
                    </span>
                  </p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setItemEditando(null)}
                  className="flex-1 py-2 border border-border rounded-lg text-sm font-medium text-text-muted hover:bg-surface-hover transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <span className="text-red-600 font-bold text-sm">✕</span>
              </div>
              <h3 className="font-semibold text-text">Erro</h3>
            </div>
            <p className="text-sm text-text-muted mb-5">{errorMessage}</p>
            <button
              onClick={() => setErrorMessage(null)}
              className="w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </Layout>
  )
}

