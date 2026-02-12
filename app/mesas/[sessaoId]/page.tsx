'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import api from '@/lib/api'
import { getUser } from '@/lib/auth'

interface Adicional {
  id: string
  nome: string
  preco: number
}

interface PedidoAdicional {
  adicional: { nome: string }
  valorUnitario: number
}

interface Produto {
  id: string
  nome: string
  preco: number
  setor: string
  ativo?: boolean
}

interface Pedido {
  id: string
  produto: Produto
  quantidade: number
  valorUnitario: number
  setor: string
  status: string
  observacao: string | null
  adicionais: PedidoAdicional[]
}

interface Conta {
  id: string
  apelido: string
  status: string
  pedidos: Pedido[]
}

interface SessaoMesa {
  id: string
  mesa: {
    numero: number
  }
  garcom: {
    nome: string
  }
  contas: Conta[]
}

export default function SessaoMesaPage() {
  const params = useParams()
  const router = useRouter()
  const sessaoId = params.sessaoId as string
  const user = getUser()
  const [sessao, setSessao] = useState<SessaoMesa | null>(null)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedConta, setSelectedConta] = useState<string | null>(null)
  const [novoApelido, setNovoApelido] = useState('')

  // Selecao multi-conta para fechamento
  const [contasSelecionadas, setContasSelecionadas] = useState<Set<string>>(new Set())

  // Busca e filtro de produtos
  const [buscaProduto, setBuscaProduto] = useState('')
  const [filtroSetor, setFiltroSetor] = useState<string>('TODOS')

  // Modal adicionar pedido
  const [showPedidoModal, setShowPedidoModal] = useState(false)
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [adicionaisDisponiveis, setAdicionaisDisponiveis] = useState<Adicional[]>([])
  const [adicionaisSel, setAdicionaisSel] = useState<string[]>([])
  const [obsTemp, setObsTemp] = useState('')
  const [qtdTemp, setQtdTemp] = useState(1)

  // Modal fechar conta(s)
  const [showFecharModal, setShowFecharModal] = useState(false)
  const [contasFechando, setContasFechando] = useState<Conta[]>([])
  const [pagDinheiro, setPagDinheiro] = useState('')
  const [pagCartao, setPagCartao] = useState('')
  const [pagPix, setPagPix] = useState('')

  // Modal cancelar pedido
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [pedidoCancelando, setPedidoCancelando] = useState<string | null>(null)
  const [motivoCancelamento, setMotivoCancelamento] = useState('')

  const loadData = useCallback(async () => {
    try {
      const [sessaoRes, produtosRes] = await Promise.all([
        api.get(`/sessoes-mesa/${sessaoId}`),
        api.get('/produtos'),
      ])
      setSessao(sessaoRes.data)
      setProdutos(produtosRes.data)
      if (sessaoRes.data.contas && sessaoRes.data.contas.length > 0 && !selectedConta) {
        const primeiraConta = sessaoRes.data.contas.find((c: Conta) => c.status === 'ABERTA')
        if (primeiraConta) {
          setSelectedConta(primeiraConta.id)
        } else {
          setSelectedConta(sessaoRes.data.contas[0].id)
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }, [sessaoId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleCriarConta = async () => {
    if (!novoApelido.trim()) {
      alert('Digite um apelido para a conta')
      return
    }
    try {
      await api.post('/contas-cliente-mesa', {
        sessaoMesaId: sessaoId,
        apelido: novoApelido,
      })
      setNovoApelido('')
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao criar conta')
    }
  }

  const handleSelecionarProduto = async (produto: Produto) => {
    if (!selectedConta) {
      alert('Selecione uma conta primeiro')
      return
    }
    const contaAtual = sessao?.contas.find((c) => c.id === selectedConta)
    if (contaAtual?.status === 'FECHADA') {
      alert('Esta conta ja foi fechada')
      return
    }
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

    setShowPedidoModal(true)
  }

  const handleConfirmarPedido = async () => {
    if (!selectedConta || !produtoSelecionado) return

    try {
      await api.post('/pedidos', {
        contaClienteMesaId: selectedConta,
        produtoId: produtoSelecionado.id,
        quantidade: qtdTemp,
        observacao: obsTemp || undefined,
        adicionaisIds: adicionaisSel.length > 0 ? adicionaisSel : undefined,
      })
      setShowPedidoModal(false)
      setProdutoSelecionado(null)
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao adicionar pedido')
    }
  }

  // Toggle selecao de conta para fechamento
  const toggleContaSelecionada = (contaId: string) => {
    setContasSelecionadas((prev) => {
      const next = new Set(prev)
      if (next.has(contaId)) {
        next.delete(contaId)
      } else {
        next.add(contaId)
      }
      return next
    })
  }

  // Abrir modal de fechamento para contas especificas
  const abrirModalFechamento = (contas: Conta[]) => {
    setContasFechando(contas)
    setPagDinheiro('')
    setPagCartao('')
    setPagPix('')
    setShowFecharModal(true)
  }

  // Fechar uma unica conta
  const handleFecharConta = (conta: Conta) => {
    abrirModalFechamento([conta])
  }

  // Fechar contas selecionadas (checkboxes)
  const handleFecharSelecionadas = () => {
    if (!sessao) return
    const contas = sessao.contas.filter(
      (c) => c.status === 'ABERTA' && contasSelecionadas.has(c.id)
    )
    if (contas.length === 0) {
      alert('Selecione ao menos uma conta aberta')
      return
    }
    abrirModalFechamento(contas)
  }

  // Fechar todas as contas abertas
  const handleFecharTodas = () => {
    if (!sessao) return
    const contas = sessao.contas.filter((c) => c.status === 'ABERTA')
    if (contas.length === 0) {
      alert('Nao ha contas abertas')
      return
    }
    abrirModalFechamento(contas)
  }

  const handleConfirmarFechamento = async () => {
    if (contasFechando.length === 0) return

    const dinheiro = parseFloat(pagDinheiro) || 0
    const cartao = parseFloat(pagCartao) || 0
    const pix = parseFloat(pagPix) || 0

    const totalPago = dinheiro + cartao + pix
    const totalContas = contasFechando.reduce((acc, conta) => acc + calcularTotalConta(conta), 0)

    if (totalPago < totalContas - 0.01) {
      alert(
        `Valor pago (R$ ${totalPago.toFixed(2)}) e menor que o total (R$ ${totalContas.toFixed(2)})`
      )
      return
    }

    try {
      const contaIds = contasFechando.map((c) => c.id)
      const response = await api.post('/pagamentos', {
        sessaoMesaId: sessaoId,
        contaIds,
        dinheiro,
        cartao: cartao || undefined,
        pix: pix || undefined,
        registradoPorId: user?.id,
      })
      setShowFecharModal(false)
      setContasFechando([])
      setContasSelecionadas(new Set())

      if (response.data.sessaoFechada) {
        alert('Todas as contas pagas! Mesa liberada.')
        router.push('/mesas')
      } else {
        alert('Conta(s) fechada(s) com sucesso!')
        loadData()
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao fechar conta')
    }
  }

  const handleCancelarPedido = (pedidoId: string) => {
    setPedidoCancelando(pedidoId)
    setMotivoCancelamento('')
    setShowCancelModal(true)
  }

  const handleConfirmarCancelamento = async () => {
    if (!pedidoCancelando || !motivoCancelamento.trim()) {
      alert('Informe o motivo do cancelamento')
      return
    }

    try {
      await api.patch(`/pedidos/${pedidoCancelando}/cancelar`, {
        motivoCancelamento,
      })
      setShowCancelModal(false)
      setPedidoCancelando(null)
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao cancelar pedido')
    }
  }

  const calcularTotalConta = (conta: Conta) => {
    return conta.pedidos
      .filter((p) => p.status === 'ATIVO')
      .reduce((acc, p) => {
        const adicionaisTotal = p.adicionais.reduce((a, ad) => a + Number(ad.valorUnitario), 0)
        return acc + (Number(p.valorUnitario) + adicionaisTotal) * p.quantidade
      }, 0)
  }

  // Filtrar produtos
  const produtosFiltrados = produtos
    .filter((p) => p.ativo !== false)
    .filter((p) => filtroSetor === 'TODOS' || p.setor === filtroSetor)
    .filter((p) => p.nome.toLowerCase().includes(buscaProduto.toLowerCase()))

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg font-medium text-gray-500">Carregando...</div>
        </div>
      </Layout>
    )
  }

  if (!sessao) {
    return (
      <Layout>
        <div className="text-center py-12">Sessao nao encontrada</div>
      </Layout>
    )
  }

  const contaAtual = sessao.contas.find((c) => c.id === selectedConta)
  const contasAbertas = sessao.contas.filter((c) => c.status === 'ABERTA')
  const totalGeralContas = contasAbertas.reduce((acc, c) => acc + calcularTotalConta(c), 0)

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Mesa {sessao.mesa.numero}</h1>
            <p className="text-gray-600">Garcom: {sessao.garcom.nome}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/mesas')}
              className="px-4 py-2 border-2 border-black rounded-lg font-medium hover:bg-gray-100 transition"
            >
              Voltar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {/* Contas */}
            <div className="bg-white rounded-lg border-2 border-black p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Contas</h2>
                <div className="text-sm font-semibold text-orange-600">
                  Total geral: R$ {totalGeralContas.toFixed(2)}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {sessao.contas.map((conta) => {
                  const total = calcularTotalConta(conta)
                  const isAberta = conta.status === 'ABERTA'
                  const isFechada = conta.status === 'FECHADA'

                  return (
                    <div
                      key={conta.id}
                      className={`p-3 border-2 rounded-lg transition ${
                        isFechada
                          ? 'border-green-300 bg-green-50 opacity-75'
                          : selectedConta === conta.id
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Checkbox para selecao multi-conta */}
                        {isAberta && (
                          <input
                            type="checkbox"
                            checked={contasSelecionadas.has(conta.id)}
                            onChange={() => toggleContaSelecionada(conta.id)}
                            className="w-4 h-4 accent-orange-500 flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => setSelectedConta(conta.id)}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-medium">{conta.apelido}</span>
                              <span className="text-sm text-gray-500 ml-2">
                                ({conta.pedidos.filter((p) => p.status === 'ATIVO').length} pedido(s))
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-orange-600">
                                R$ {total.toFixed(2)}
                              </span>
                              {isFechada ? (
                                <span className="px-2 py-1 rounded text-xs font-bold bg-green-500 text-white">
                                  PAGO
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                  ABERTA
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Criar nova conta */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Apelido da conta"
                  value={novoApelido}
                  onChange={(e) => setNovoApelido(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCriarConta()}
                  className="flex-1 px-3 py-2 border-2 border-black rounded-md"
                />
                <button
                  onClick={handleCriarConta}
                  className="px-4 py-2 bg-orange-500 text-white rounded-md font-bold hover:bg-orange-600 transition"
                >
                  Nova Conta
                </button>
              </div>

              {/* Botoes de fechamento */}
              {contasAbertas.length > 0 && (
                <div className="flex flex-wrap gap-2 border-t-2 border-gray-200 pt-4">
                  {contasSelecionadas.size > 0 && (
                    <button
                      onClick={handleFecharSelecionadas}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition text-sm"
                    >
                      Fechar Selecionadas ({contasSelecionadas.size})
                    </button>
                  )}
                  <button
                    onClick={handleFecharTodas}
                    className="px-4 py-2 bg-green-700 text-white rounded-lg font-medium hover:bg-green-800 transition text-sm"
                  >
                    Fechar Todas ({contasAbertas.length})
                  </button>
                </div>
              )}
            </div>

            {/* Pedidos da conta selecionada */}
            {contaAtual && (
              <div className="bg-white rounded-lg border-2 border-black p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Pedidos - {contaAtual.apelido}</h2>
                  {contaAtual.status === 'ABERTA' && (
                    <button
                      onClick={() => handleFecharConta(contaAtual)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition text-sm"
                    >
                      Fechar Esta Conta
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {contaAtual.pedidos.map((pedido) => (
                    <div
                      key={pedido.id}
                      className={`p-3 border-2 rounded-lg ${
                        pedido.status === 'CANCELADO'
                          ? 'border-red-400 bg-red-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`font-medium ${pedido.status === 'CANCELADO' ? 'line-through text-red-600' : ''}`}>
                              {pedido.quantidade}x {pedido.produto.nome}
                            </p>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-medium ${
                                pedido.setor === 'CHAPA'
                                  ? 'bg-orange-100 text-orange-800'
                                  : pedido.setor === 'COZINHA'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {pedido.setor}
                            </span>
                            {pedido.status === 'CANCELADO' && (
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-500 text-white">
                                CANCELADO
                              </span>
                            )}
                          </div>
                          {pedido.adicionais.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              +{pedido.adicionais.map((a) => a.adicional.nome).join(', ')}
                            </p>
                          )}
                          {pedido.observacao && (
                            <p className="text-xs text-gray-400 mt-1">
                              Obs: {pedido.observacao}
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-3">
                          <p className={`font-bold ${pedido.status === 'CANCELADO' ? 'line-through text-red-400' : ''}`}>
                            R${' '}
                            {(
                              (Number(pedido.valorUnitario) +
                                pedido.adicionais.reduce(
                                  (a, ad) => a + Number(ad.valorUnitario),
                                  0
                                )) *
                              pedido.quantidade
                            ).toFixed(2)}
                          </p>
                          {pedido.status === 'ATIVO' && user?.tipo === 'ADMIN' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleCancelarPedido(pedido.id)
                              }}
                              className="text-xs text-red-500 hover:text-red-700 font-medium mt-1"
                            >
                              Cancelar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {contaAtual.pedidos.length === 0 && (
                    <p className="text-gray-500 text-center py-4">Nenhum pedido ainda</p>
                  )}
                </div>

                {/* Total da conta */}
                {contaAtual.pedidos.filter((p) => p.status === 'ATIVO').length > 0 && (
                  <div className="border-t-2 border-black mt-4 pt-3 flex justify-between items-center">
                    <span className="font-bold text-lg">Total:</span>
                    <span className="font-bold text-lg text-orange-600">
                      R$ {calcularTotalConta(contaAtual).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar Produtos */}
          <div className="bg-white rounded-lg border-2 border-black p-6 h-fit sticky top-20">
            <h2 className="text-xl font-bold mb-3">Produtos</h2>

            {/* Busca */}
            <input
              type="text"
              placeholder="Buscar produto..."
              value={buscaProduto}
              onChange={(e) => setBuscaProduto(e.target.value)}
              className="w-full px-3 py-2 border-2 border-black rounded-md mb-3 text-sm"
            />

            {/* Filtros por setor */}
            <div className="flex flex-wrap gap-1 mb-3">
              {['TODOS', 'BAR', 'COZINHA', 'CHAPA'].map((setor) => (
                <button
                  key={setor}
                  onClick={() => setFiltroSetor(setor)}
                  className={`px-3 py-1 rounded text-xs font-semibold transition ${
                    filtroSetor === setor
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {setor}
                </button>
              ))}
            </div>

            <div className="space-y-2 max-h-[calc(100vh-320px)] overflow-y-auto">
              {produtosFiltrados.map((produto) => (
                <div
                  key={produto.id}
                  className="p-3 border-2 border-gray-200 rounded-lg hover:border-orange-500 cursor-pointer transition"
                  onClick={() => handleSelecionarProduto(produto)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{produto.nome}</p>
                      <p className="text-sm text-orange-600 font-bold">
                        R$ {Number(produto.preco).toFixed(2)}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        produto.setor === 'CHAPA'
                          ? 'bg-orange-100 text-orange-800'
                          : produto.setor === 'COZINHA'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {produto.setor}
                    </span>
                  </div>
                </div>
              ))}
              {produtosFiltrados.length === 0 && (
                <p className="text-gray-500 text-center py-4 text-sm">Nenhum produto encontrado</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Adicionar Pedido */}
      {showPedidoModal && produtoSelecionado && (
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
                  setShowPedidoModal(false)
                  setProdutoSelecionado(null)
                }}
                className="flex-1 py-2 border-2 border-black rounded-md font-medium hover:bg-gray-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarPedido}
                className="flex-1 bg-orange-500 text-white py-2 rounded-md font-bold hover:bg-orange-600 transition"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Fechar Conta(s) */}
      {showFecharModal && contasFechando.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border-2 border-black p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              Fechar {contasFechando.length === 1
                ? `Conta - ${contasFechando[0].apelido}`
                : `${contasFechando.length} Contas`}
            </h2>

            {/* Itens agrupados por conta */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
              {contasFechando.map((conta) => (
                <div key={conta.id}>
                  {contasFechando.length > 1 && (
                    <p className="font-semibold text-sm text-gray-700 mb-1">{conta.apelido}</p>
                  )}
                  <div className="space-y-1">
                    {conta.pedidos
                      .filter((p) => p.status === 'ATIVO')
                      .map((p) => (
                        <div key={p.id} className="flex justify-between text-sm">
                          <span>
                            {p.quantidade}x {p.produto.nome}
                            {p.adicionais.length > 0 &&
                              ` (+${p.adicionais.map((a) => a.adicional.nome).join(', ')})`}
                          </span>
                          <span className="font-medium">
                            R${' '}
                            {(
                              (Number(p.valorUnitario) +
                                p.adicionais.reduce((a, ad) => a + Number(ad.valorUnitario), 0)) *
                              p.quantidade
                            ).toFixed(2)}
                          </span>
                        </div>
                      ))}
                  </div>
                  {contasFechando.length > 1 && (
                    <div className="text-right text-sm font-semibold text-gray-600 mt-1">
                      Subtotal: R$ {calcularTotalConta(conta).toFixed(2)}
                    </div>
                  )}
                </div>
              ))}
              <div className="border-t-2 border-black pt-2 flex justify-between">
                <span className="font-bold">Total:</span>
                <span className="font-bold text-orange-600">
                  R${' '}
                  {contasFechando
                    .reduce((acc, c) => acc + calcularTotalConta(c), 0)
                    .toFixed(2)}
                </span>
              </div>
            </div>

            {/* Formas de pagamento */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Dinheiro (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={pagDinheiro}
                  onChange={(e) => setPagDinheiro(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded-md"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cartao (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={pagCartao}
                  onChange={(e) => setPagCartao(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded-md"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Pix (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={pagPix}
                  onChange={(e) => setPagPix(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-black rounded-md"
                  placeholder="0.00"
                />
              </div>

              {(() => {
                const totalPago =
                  (parseFloat(pagDinheiro) || 0) +
                  (parseFloat(pagCartao) || 0) +
                  (parseFloat(pagPix) || 0)
                const totalContas = contasFechando.reduce(
                  (acc, c) => acc + calcularTotalConta(c),
                  0
                )
                if (totalPago <= 0) return null
                return (
                  <div className="bg-green-50 rounded-lg p-3 text-sm">
                    <div className="flex justify-between">
                      <span>Total pago:</span>
                      <span className="font-bold text-green-600">
                        R$ {totalPago.toFixed(2)}
                      </span>
                    </div>
                    {totalPago > totalContas && (
                      <div className="flex justify-between mt-1">
                        <span>Troco:</span>
                        <span className="font-bold">
                          R$ {(totalPago - totalContas).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowFecharModal(false)
                  setContasFechando([])
                }}
                className="flex-1 py-2 border-2 border-black rounded-md font-medium hover:bg-gray-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarFechamento}
                className="flex-1 bg-green-600 text-white py-2 rounded-md font-bold hover:bg-green-700 transition"
              >
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cancelar Pedido */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border-2 border-black p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Cancelar Pedido</h2>
            <div>
              <label className="block text-sm font-medium mb-1">Motivo do cancelamento</label>
              <textarea
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                className="w-full px-3 py-2 border-2 border-black rounded-md"
                rows={3}
                placeholder="Informe o motivo..."
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowCancelModal(false)
                  setPedidoCancelando(null)
                }}
                className="flex-1 py-2 border-2 border-black rounded-md font-medium hover:bg-gray-100 transition"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmarCancelamento}
                className="flex-1 bg-red-500 text-white py-2 rounded-md font-bold hover:bg-red-600 transition"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
