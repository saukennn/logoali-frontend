'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import api from '@/lib/api'
import { getUser } from '@/lib/auth'
import { useToast } from '@/components/ui/Toast'
import { statusPedido } from '@/lib/statusPedido'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

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
  nomeCliente: string | null
  status: string
  entregue: boolean
  criadoEm: string
  criadoPorId: string | null
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
  const [nomeCliente, setNomeCliente] = useState('')
  const [enviando, setEnviando] = useState(false)
  const toast = useToast()
  const [pedidoCancelando, setPedidoCancelando] = useState<string | null>(null)
  const [motivoCancelamento, setMotivoCancelamento] = useState('')
  const [cancelando, setCancelando] = useState(false)
  // Pagamento do balcão
  const [showPagamento, setShowPagamento] = useState(false)
  const [pedidosParaPagar, setPedidosParaPagar] = useState<string[]>([])
  const [totalPagar, setTotalPagar] = useState(0)
  const [pagDinheiro, setPagDinheiro] = useState('')
  const [pagPix, setPagPix] = useState('')
  const [pagCartao, setPagCartao] = useState('')
  const [pagando, setPagando] = useState(false)
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
      const idsCriados: string[] = []
      for (const item of carrinho) {
        const res = await api.post('/pedidos', {
          produtoId: item.produto.id,
          quantidade: item.quantidade,
          observacao: item.observacao || undefined,
          nomeCliente: nomeCliente.trim() || undefined,
          adicionaisIds: item.adicionaisSelecionados.map((a) => a.id),
        })
        idsCriados.push(res.data.id)
      }
      // Abre o modal de pagamento com os pedidos recém-criados
      setPedidosParaPagar(idsCriados)
      setTotalPagar(totalCarrinho)
      setPagDinheiro('')
      setPagPix('')
      setPagCartao('')
      setShowPagamento(true)
      setCarrinho([])
      setNomeCliente('')
      loadData()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao enviar pedidos')
    } finally {
      setEnviando(false)
    }
  }

  const handleConfirmarPagamento = async () => {
    const dinheiro = parseFloat(pagDinheiro) || 0
    const pix = parseFloat(pagPix) || 0
    const cartao = parseFloat(pagCartao) || 0
    const totalInformado = dinheiro + pix + cartao

    if (totalInformado < totalPagar - 0.01) {
      toast.error(`Falta R$ ${(totalPagar - totalInformado).toFixed(2)} para completar o pagamento`)
      return
    }
    setPagando(true)
    try {
      await api.post('/pedidos/balcao/pagar', {
        pedidoIds: pedidosParaPagar,
        dinheiro, pix, cartao,
      })
      setShowPagamento(false)
      loadData()
      toast.success('Venda registrada e lançada no caixa!')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao registrar pagamento')
    } finally {
      setPagando(false)
    }
  }

  const handleMarcarEntrega = async (pedidoId: string, entregue: boolean) => {
    try {
      await api.patch(`/pedidos/${pedidoId}/entrega`, { entregue })
      loadData()
      toast.success(entregue ? 'Pedido marcado como entregue' : 'Entrega desfeita')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao atualizar entrega')
    }
  }

  const confirmarCancelamento = async () => {
    if (!pedidoCancelando || !motivoCancelamento.trim() || cancelando) return
    setCancelando(true)
    try {
      await api.patch(`/pedidos/${pedidoCancelando}/cancelar`, { motivoCancelamento })
      setPedidoCancelando(null)
      setMotivoCancelamento('')
      loadData()
      toast.success('Pedido cancelado com sucesso!')
    } catch (error: any) {
      setPedidoCancelando(null)
      toast.error(error.response?.data?.message || 'Erro ao cancelar pedido')
    } finally {
      setCancelando(false)
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
      <div className="py-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Pedidos Balcão</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Produtos */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <div className="bg-surface rounded-xl border border-border shadow-sm p-4 mb-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="Buscar produto..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <select
                  value={filtroSetor}
                  onChange={(e) => setFiltroSetor(e.target.value)}
                  className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-surface"
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
                  className="bg-surface rounded-xl border border-border shadow-sm p-4 hover:border-orange-400 hover:shadow-md transition text-left active:scale-95"
                >
                  <p className="font-semibold text-sm text-text truncate">{produto.nome}</p>
                  <p className="text-orange-600 font-bold mt-1 text-sm">
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
                <p className="col-span-full text-center text-text-subtle text-sm py-8">
                  Nenhum produto encontrado
                </p>
              )}
            </div>

            {/* Historico pedidos balcao */}
            <div className="bg-surface rounded-xl border border-border shadow-sm p-4 mt-5">
              <h2 className="text-base font-semibold text-text-muted mb-3">Pedidos do Dia</h2>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {pedidos.map((pedido) => (
                  <div
                    key={pedido.id}
                    className={`p-3 rounded-lg flex justify-between items-center border text-sm ${
                      pedido.status === 'CANCELADO'
                        ? 'border-red-100 bg-red-50'
                        : 'border-border bg-surface-alt'
                    }`}
                  >
                    <div>
                      <p className={`font-medium ${pedido.status === 'CANCELADO' ? 'text-gray-800 line-through text-gray-500' : 'text-text-muted'}`}>
                        {pedido.quantidade}x {pedido.produto.nome}
                        {pedido.adicionais.length > 0 && (
                          <span className={`text-xs ml-1 ${pedido.status === 'CANCELADO' ? 'text-gray-500' : 'text-text-subtle'}`}>
                            (+{pedido.adicionais.map((a) => a.adicional.nome).join(', ')})
                          </span>
                        )}
                      </p>
                      {pedido.nomeCliente && (
                        <p className="text-xs text-blue-600 font-medium">👤 {pedido.nomeCliente}</p>
                      )}
                      {pedido.observacao && (
                        <p className={`text-xs ${pedido.status === 'CANCELADO' ? 'text-gray-500' : 'text-text-subtle'}`}>Obs: {pedido.observacao}</p>
                      )}
                      <p className={`text-xs ${pedido.status === 'CANCELADO' ? 'text-gray-500' : 'text-text-subtle'}`}>
                        {new Date(pedido.criadoEm).toLocaleTimeString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 ml-2 flex-shrink-0">
                      <p className="font-bold text-brand-600">
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
                      {(() => {
                        const st = statusPedido(pedido)
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${st.chip}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                          </span>
                        )
                      })()}
                      {pedido.status !== 'CANCELADO' && (user?.tipo === 'ADMIN' || pedido.criadoPorId === user?.id) && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleMarcarEntrega(pedido.id, !pedido.entregue)}
                            className={`px-2 py-1 text-xs font-medium rounded-md border transition-colors ${
                              pedido.entregue
                                ? 'text-text-subtle bg-surface-alt hover:bg-surface-hover border-border'
                                : 'text-success bg-success-light hover:bg-success/20 border-success/30'
                            }`}
                          >
                            {pedido.entregue ? '↶' : '✓ Entregue'}
                          </button>
                          <button
                            onClick={() => setPedidoCancelando(pedido.id)}
                            className="px-2 py-1 text-xs font-medium text-danger bg-danger-light hover:bg-danger/20 border border-danger/30 rounded-md transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {pedidos.length === 0 && (
                  <p className="text-text-subtle text-sm text-center py-4">Nenhum pedido hoje</p>
                )}
              </div>
            </div>
          </div>

          {/* Carrinho */}
          <div className="order-1 lg:order-2 bg-surface rounded-xl border border-border shadow-sm p-4 h-fit lg:sticky lg:top-20">
            <h2 className="text-base font-semibold text-text-muted mb-3">Carrinho</h2>

            {carrinho.length === 0 ? (
              <p className="text-text-muted text-center py-8">
                Selecione produtos para adicionar
              </p>
            ) : (
              <>
                <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
                  {carrinho.map((item, idx) => (
                    <div key={idx} className="p-3 border-2 border-border rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {item.quantidade}x {item.produto.nome}
                          </p>
                          {item.adicionaisSelecionados.length > 0 && (
                            <p className="text-xs text-text-muted">
                              +{item.adicionaisSelecionados.map((a) => a.nome).join(', ')}
                            </p>
                          )}
                          {item.observacao && (
                            <p className="text-xs text-text-subtle">Obs: {item.observacao}</p>
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

                <div className="mb-3">
                  <label className="block text-xs font-semibold text-text-muted mb-1">Nome do Cliente</label>
                  <input
                    type="text"
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    placeholder="Ex: João (opcional)"
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="border-t border-border pt-3 mb-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-text-muted">Total:</span>
                    <span className="font-bold text-lg text-orange-600">
                      R$ {totalCarrinho.toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleEnviarPedidos}
                  disabled={enviando}
                  className="w-full bg-orange-500 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-orange-600 transition disabled:opacity-50"
                >
                  {enviando ? 'Enviando...' : 'Enviar Pedidos'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Pagamento do Balcão */}
      <Modal open={showPagamento} onClose={() => setShowPagamento(false)} title="Pagamento do Pedido" closeOnOverlay={false}>
        {(() => {
          const dinheiro = parseFloat(pagDinheiro) || 0
          const pix = parseFloat(pagPix) || 0
          const cartao = parseFloat(pagCartao) || 0
          const informado = dinheiro + pix + cartao
          const troco = informado - totalPagar
          const falta = totalPagar - informado
          return (
            <div className="space-y-4">
              <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 text-center">
                <p className="text-xs font-semibold uppercase text-brand-700">Total a pagar</p>
                <p className="text-3xl font-black text-brand-800">R$ {totalPagar.toFixed(2)}</p>
              </div>

              <p className="text-sm text-text-muted">Informe quanto foi pago em cada forma (pode dividir):</p>

              <div className="space-y-3">
                {[
                  { label: 'Dinheiro', value: pagDinheiro, set: setPagDinheiro, color: 'text-green-700' },
                  { label: 'PIX', value: pagPix, set: setPagPix, color: 'text-blue-700' },
                  { label: 'Cartão', value: pagCartao, set: setPagCartao, color: 'text-purple-700' },
                ].map((f) => (
                  <div key={f.label} className="flex items-center gap-3">
                    <label className={`w-20 text-sm font-semibold ${f.color}`}>{f.label}</label>
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle text-sm">R$</span>
                      <input
                        type="number" step="0.01" min="0" value={f.value}
                        onChange={(e) => f.set(e.target.value)}
                        placeholder="0,00"
                        className="w-full pl-9 pr-3 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                    <button
                      onClick={() => f.set((totalPagar - (informado - (parseFloat(f.value) || 0))).toFixed(2))}
                      className="px-2.5 py-1 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-md whitespace-nowrap"
                    >
                      Total
                    </button>
                  </div>
                ))}
              </div>

              {/* Resumo */}
              <div className="border-t border-border pt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Informado</span>
                  <span className="font-semibold">R$ {informado.toFixed(2)}</span>
                </div>
                {falta > 0.01 && (
                  <div className="flex justify-between text-sm text-danger font-semibold">
                    <span>Falta</span><span>R$ {falta.toFixed(2)}</span>
                  </div>
                )}
                {troco > 0.01 && dinheiro > 0 && (
                  <div className="flex justify-between text-sm text-success font-semibold">
                    <span>Troco</span><span>R$ {troco.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-1">
                <Button variant="secondary" fullWidth onClick={() => setShowPagamento(false)} disabled={pagando}>
                  Depois
                </Button>
                <Button variant="success" fullWidth onClick={handleConfirmarPagamento} disabled={pagando || falta > 0.01}>
                  {pagando ? 'Registrando...' : 'Confirmar Pagamento'}
                </Button>
              </div>
              <p className="text-xs text-text-subtle text-center">O valor será lançado como entrada no caixa do dia.</p>
            </div>
          )
        })()}
      </Modal>

      {/* Modal Cancelar Pedido */}
      {pedidoCancelando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-text mb-2">Cancelar Pedido</h2>
            <p className="text-sm text-text-muted mb-4">Informe o motivo do cancelamento. O estoque será devolvido automaticamente.</p>
            <textarea
              value={motivoCancelamento}
              onChange={(e) => setMotivoCancelamento(e.target.value)}
              placeholder="Ex: cliente desistiu, pedido errado..."
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setPedidoCancelando(null); setMotivoCancelamento('') }}
                disabled={cancelando}
                className="flex-1 py-2 border border-border rounded-lg text-sm font-medium text-text-muted hover:bg-surface-hover transition-colors disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                onClick={confirmarCancelamento}
                disabled={cancelando || !motivoCancelamento.trim()}
                className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {cancelando ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Adicionais/Obs */}
      {showAdicionaisModal && produtoSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg border-2 border-black p-6 w-full max-w-md mx-4">
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
                    className="w-10 h-10 border-2 border-black rounded-md font-bold text-lg hover:bg-surface-hover"
                  >
                    -
                  </button>
                  <span className="text-xl font-bold w-8 text-center">{qtdTemp}</span>
                  <button
                    onClick={() => setQtdTemp((q) => q + 1)}
                    className="w-10 h-10 border-2 border-black rounded-md font-bold text-lg hover:bg-surface-hover"
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
                        className="flex items-center justify-between p-2 border rounded-md hover:bg-surface-hover cursor-pointer"
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
                className="flex-1 py-2 border-2 border-black rounded-md font-medium hover:bg-surface-hover transition"
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
