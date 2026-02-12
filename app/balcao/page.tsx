'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import api from '@/lib/api'
import { getUser } from '@/lib/auth'

interface Adicional {
  id: string
  nome: string
  preco: number
}

interface Produto {
  id: string
  nome: string
  preco: number
  setor: string
  ativo: boolean
  adicionais?: { adicional: Adicional }[]
}

interface ItemCarrinho {
  produto: Produto
  quantidade: number
  observacao: string
  adicionaisSelecionados: Adicional[]
}

interface PedidoBalcao {
  id: string
  produto: { nome: string }
  quantidade: number
  valorUnitario: number
  observacao: string | null
  status: string
  criadoEm: string
  adicionais: { adicional: { nome: string }; valorUnitario: number }[]
}

export default function BalcaoPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [pedidos, setPedidos] = useState<PedidoBalcao[]>([])
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroSetor, setFiltroSetor] = useState('')
  const [showAdicionaisModal, setShowAdicionaisModal] = useState(false)
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [adicionaisDisponiveis, setAdicionaisDisponiveis] = useState<Adicional[]>([])
  const [adicionaisSel, setAdicionaisSel] = useState<string[]>([])
  const [obsTemp, setObsTemp] = useState('')
  const [qtdTemp, setQtdTemp] = useState(1)
  const [enviando, setEnviando] = useState(false)
  const user = getUser()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [prodRes, pedRes] = await Promise.all([
        api.get('/produtos'),
        api.get('/pedidos/balcao'),
      ])
      setProdutos(prodRes.data.filter((p: Produto) => p.ativo))
      setPedidos(pedRes.data)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelecionarProduto = async (produto: Produto) => {
    setProdutoSelecionado(produto)
    setObsTemp('')
    setQtdTemp(1)
    setAdicionaisSel([])

    try {
      const res = await api.get(`/adicionais?produtoId=${produto.id}`)
      setAdicionaisDisponiveis(res.data)
    } catch {
      setAdicionaisDisponiveis([])
    }

    setShowAdicionaisModal(true)
  }

  const handleConfirmarItem = () => {
    if (!produtoSelecionado) return

    const adicionaisSelecionados = adicionaisDisponiveis.filter((a) =>
      adicionaisSel.includes(a.id)
    )

    setCarrinho((prev) => [
      ...prev,
      {
        produto: produtoSelecionado,
        quantidade: qtdTemp,
        observacao: obsTemp,
        adicionaisSelecionados,
      },
    ])

    setShowAdicionaisModal(false)
    setProdutoSelecionado(null)
  }

  const handleRemoverItem = (index: number) => {
    setCarrinho((prev) => prev.filter((_, i) => i !== index))
  }

  const handleEnviarPedidos = async () => {
    if (carrinho.length === 0) return
    setEnviando(true)

    try {
      for (const item of carrinho) {
        await api.post('/pedidos', {
          produtoId: item.produto.id,
          quantidade: item.quantidade,
          observacao: item.observacao || undefined,
          adicionaisIds: item.adicionaisSelecionados.map((a) => a.id),
        })
      }
      setCarrinho([])
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao enviar pedidos')
    } finally {
      setEnviando(false)
    }
  }

  const handleCancelarPedido = async (pedidoId: string) => {
    const motivo = prompt('Motivo do cancelamento:')
    if (!motivo) return

    try {
      await api.patch(`/pedidos/${pedidoId}/cancelar`, { motivoCancelamento: motivo })
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao cancelar pedido')
    }
  }

  const calcularTotalItem = (item: ItemCarrinho) => {
    const precoAdicionais = item.adicionaisSelecionados.reduce((acc, a) => acc + Number(a.preco), 0)
    return (Number(item.produto.preco) + precoAdicionais) * item.quantidade
  }

  const totalCarrinho = carrinho.reduce((acc, item) => acc + calcularTotalItem(item), 0)

  const produtosFiltrados = produtos.filter((p) => {
    const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase())
    const matchSetor = !filtroSetor || p.setor === filtroSetor
    return matchBusca && matchSetor
  })

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">Carregando...</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-2xl font-bold mb-6">Pedidos Balcao</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Produtos */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border-2 border-black p-4 mb-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Buscar produto..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="flex-1 px-3 py-2 border-2 border-black rounded-md"
                />
                <select
                  value={filtroSetor}
                  onChange={(e) => setFiltroSetor(e.target.value)}
                  className="px-3 py-2 border-2 border-black rounded-md"
                >
                  <option value="">Todos</option>
                  <option value="CHAPA">Chapa</option>
                  <option value="COZINHA">Cozinha</option>
                  <option value="BAR">Bar</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {produtosFiltrados.map((produto) => (
                <button
                  key={produto.id}
                  onClick={() => handleSelecionarProduto(produto)}
                  className="bg-white rounded-lg border-2 border-black p-4 hover:border-orange-500 hover:shadow-md transition text-left"
                >
                  <p className="font-bold text-sm truncate">{produto.nome}</p>
                  <p className="text-orange-600 font-bold mt-1">
                    R$ {Number(produto.preco).toFixed(2)}
                  </p>
                  <span
                    className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${
                      produto.setor === 'CHAPA'
                        ? 'bg-orange-100 text-orange-800'
                        : produto.setor === 'COZINHA'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {produto.setor}
                  </span>
                </button>
              ))}
              {produtosFiltrados.length === 0 && (
                <p className="col-span-full text-center text-gray-500 py-8">
                  Nenhum produto encontrado
                </p>
              )}
            </div>

            {/* Historico pedidos balcao */}
            <div className="bg-white rounded-lg border-2 border-black p-4 mt-6">
              <h2 className="text-lg font-bold mb-3">Pedidos do Dia</h2>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {pedidos.map((pedido) => (
                  <div
                    key={pedido.id}
                    className={`p-3 border-2 rounded-lg flex justify-between items-center ${
                      pedido.status === 'CANCELADO'
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <div>
                      <p className="font-medium">
                        {pedido.quantidade}x {pedido.produto.nome}
                        {pedido.adicionais.length > 0 && (
                          <span className="text-sm text-gray-500 ml-1">
                            (+{pedido.adicionais.map((a) => a.adicional.nome).join(', ')})
                          </span>
                        )}
                      </p>
                      {pedido.observacao && (
                        <p className="text-xs text-gray-500">Obs: {pedido.observacao}</p>
                      )}
                      <p className="text-xs text-gray-400">
                        {new Date(pedido.criadoEm).toLocaleTimeString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-orange-600">
                        R${' '}
                        {(
                          Number(pedido.valorUnitario) * pedido.quantidade +
                          pedido.adicionais.reduce(
                            (acc, a) => acc + Number(a.valorUnitario),
                            0
                          ) *
                            pedido.quantidade
                        ).toFixed(2)}
                      </p>
                      {pedido.status === 'CANCELADO' ? (
                        <span className="text-xs text-red-600 font-medium">CANCELADO</span>
                      ) : (
                        user?.tipo === 'ADMIN' && (
                          <button
                            onClick={() => handleCancelarPedido(pedido.id)}
                            className="text-xs text-red-500 hover:text-red-700 font-medium"
                          >
                            Cancelar
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
                {pedidos.length === 0 && (
                  <p className="text-gray-500 text-center py-4">Nenhum pedido de balcao hoje</p>
                )}
              </div>
            </div>
          </div>

          {/* Carrinho */}
          <div className="bg-white rounded-lg border-2 border-black p-4 h-fit sticky top-20">
            <h2 className="text-lg font-bold mb-3">Carrinho</h2>

            {carrinho.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Selecione produtos para adicionar
              </p>
            ) : (
              <>
                <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
                  {carrinho.map((item, idx) => (
                    <div key={idx} className="p-3 border-2 border-gray-200 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {item.quantidade}x {item.produto.nome}
                          </p>
                          {item.adicionaisSelecionados.length > 0 && (
                            <p className="text-xs text-gray-500">
                              +{item.adicionaisSelecionados.map((a) => a.nome).join(', ')}
                            </p>
                          )}
                          {item.observacao && (
                            <p className="text-xs text-gray-400">Obs: {item.observacao}</p>
                          )}
                        </div>
                        <div className="text-right ml-2">
                          <p className="font-bold text-sm text-orange-600">
                            R$ {calcularTotalItem(item).toFixed(2)}
                          </p>
                          <button
                            onClick={() => handleRemoverItem(idx)}
                            className="text-xs text-red-500 hover:text-red-700"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t-2 border-black pt-3 mb-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">Total:</span>
                    <span className="font-bold text-lg text-orange-600">
                      R$ {totalCarrinho.toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleEnviarPedidos}
                  disabled={enviando}
                  className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition disabled:opacity-50"
                >
                  {enviando ? 'Enviando...' : 'Enviar Pedidos'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal Adicionais/Obs */}
      {showAdicionaisModal && produtoSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border-2 border-black p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-1">{produtoSelecionado.nome}</h2>
            <p className="text-orange-600 font-bold mb-4">
              R$ {Number(produtoSelecionado.preco).toFixed(2)}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Quantidade</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQtdTemp((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 border-2 border-black rounded-md font-bold text-lg hover:bg-gray-100"
                  >
                    -
                  </button>
                  <span className="text-xl font-bold w-8 text-center">{qtdTemp}</span>
                  <button
                    onClick={() => setQtdTemp((q) => q + 1)}
                    className="w-10 h-10 border-2 border-black rounded-md font-bold text-lg hover:bg-gray-100"
                  >
                    +
                  </button>
                </div>
              </div>

              {adicionaisDisponiveis.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-2">Adicionais</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {adicionaisDisponiveis.map((adicional) => (
                      <label
                        key={adicional.id}
                        className="flex items-center justify-between p-2 border rounded-md hover:bg-gray-50 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={adicionaisSel.includes(adicional.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAdicionaisSel((prev) => [...prev, adicional.id])
                              } else {
                                setAdicionaisSel((prev) =>
                                  prev.filter((id) => id !== adicional.id)
                                )
                              }
                            }}
                            className="w-4 h-4 accent-orange-500"
                          />
                          <span className="text-sm">{adicional.nome}</span>
                        </div>
                        <span className="text-sm text-orange-600 font-medium">
                          +R$ {Number(adicional.preco).toFixed(2)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">Observacao (opcional)</label>
                <input
                  type="text"
                  value={obsTemp}
                  onChange={(e) => setObsTemp(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded-md"
                  placeholder="Ex: Sem cebola, bem passado..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAdicionaisModal(false)
                  setProdutoSelecionado(null)
                }}
                className="flex-1 py-2 border-2 border-black rounded-md font-medium hover:bg-gray-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarItem}
                className="flex-1 bg-orange-500 text-white py-2 rounded-md font-bold hover:bg-orange-600 transition"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
