'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import api from '@/lib/api'
import { getUser } from '@/lib/auth'
import { useToast } from '@/components/ui/Toast'
import { statusPedido } from '@/lib/statusPedido'

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
  entregue: boolean
  observacao: string | null
  criadoPorId: string | null
  adicionais: PedidoAdicional[]
}

interface Conta {
  id: string
  apelido: string
  status: string
  pedidos: Pedido[]
}

interface ItemCarrinho {
  produto: Produto
  quantidade: number
  observacao: string
  adicionaisSelecionados: Adicional[]
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

  // Carrinho local: itens ficam acumulados aqui e só são enviados (e
  // impressos, agrupados por setor) quando o garçom clica em "Enviar Pedido"
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([])
  const [enviandoPedidos, setEnviandoPedidos] = useState(false)

  // Modal fechar conta(s)
  const [showFecharModal, setShowFecharModal] = useState(false)
  const [contasFechando, setContasFechando] = useState<Conta[]>([])
  const [pagDinheiro, setPagDinheiro] = useState('')
  const [pagCartao, setPagCartao] = useState('')
  const [pagPix, setPagPix] = useState('')
  const [cobrarTaxaServico, setCobrarTaxaServico] = useState(true)
  const [pagamentoEmAndamento, setPagamentoEmAndamento] = useState(false)
  const [imprimindoConta, setImprimindoConta] = useState(false)
  const [jaImprimiuNesteFechamento, setJaImprimiuNesteFechamento] = useState(false)

  // Confirmação: perguntar se deve reimprimir o comprovante ao registrar o
  // pagamento — evita imprimir 2x quando o garçom já usou "Imprimir Conta"
  // antes e a conta já está na capinha do cliente.
  const [showConfirmarImpressaoModal, setShowConfirmarImpressaoModal] = useState(false)

  const TAXA_SERVICO_PERCENTUAL = 0.10 // espelha o backend só para exibição/estimativa
  const podeEscolherTaxaServico = user?.tipo === 'ADMIN' || !!user?.podeRemoverTaxaServico

  // Modal cancelar pedido
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [pedidoCancelando, setPedidoCancelando] = useState<string | null>(null)
  const [motivoCancelamento, setMotivoCancelamento] = useState('')

  // Feedback via toast (setErrorMessage/setSuccessMessage mantidos como aliases)
  const toast = useToast()
  const setErrorMessage = (msg: string | null) => { if (msg) toast.error(msg) }
  const setSuccessMessage = (msg: string | null) => { if (msg) toast.success(msg) }

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
      setErrorMessage('Digite um apelido para a conta')
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
      setErrorMessage(error.response?.data?.message || 'Erro ao criar conta')
    }
  }

  const handleSelecionarProduto = async (produto: Produto) => {
    if (!selectedConta) {
      setErrorMessage('Selecione uma conta primeiro')
      return
    }
    const contaAtual = sessao?.contas.find((c) => c.id === selectedConta)
    if (contaAtual?.status === 'FECHADA') {
      setErrorMessage('Esta conta ja foi fechada')
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

  // Adiciona o item ao carrinho local — nenhuma chamada de rede aqui. O
  // pedido só é criado (e impresso) quando handleEnviarPedidos é chamado.
  const handleConfirmarPedido = () => {
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

    setShowPedidoModal(false)
    setProdutoSelecionado(null)
  }

  const handleRemoverItemCarrinho = (index: number) => {
    setCarrinho((prev) => prev.filter((_, i) => i !== index))
  }

  // Envia todos os itens do carrinho de uma vez. O backend cria todos os
  // pedidos numa única transação e imprime 1 cupom por setor (não por item).
  const handleEnviarPedidos = async () => {
    if (!selectedConta) {
      setErrorMessage('Selecione uma conta primeiro')
      return
    }
    if (carrinho.length === 0) return

    setEnviandoPedidos(true)
    try {
      await api.post('/pedidos/lote', {
        contaClienteMesaId: selectedConta,
        itens: carrinho.map((item) => ({
          produtoId: item.produto.id,
          quantidade: item.quantidade,
          observacao: item.observacao || undefined,
          adicionaisIds: item.adicionaisSelecionados.map((a) => a.id),
        })),
      })
      setCarrinho([])
      toast.success('Pedido enviado!')
      loadData()
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Erro ao enviar pedido')
    } finally {
      setEnviandoPedidos(false)
    }
  }

  const totalCarrinho = carrinho.reduce((acc, item) => {
    const adicionaisTotal = item.adicionaisSelecionados.reduce((a, ad) => a + Number(ad.preco), 0)
    return acc + (Number(item.produto.preco) + adicionaisTotal) * item.quantidade
  }, 0)

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
    setCobrarTaxaServico(true)
    setJaImprimiuNesteFechamento(false)
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
      setErrorMessage('Selecione ao menos uma conta aberta')
      return
    }
    abrirModalFechamento(contas)
  }

  // Fechar todas as contas abertas
  const handleFecharTodas = () => {
    if (!sessao) return
    const contas = sessao.contas.filter((c) => c.status === 'ABERTA')
    if (contas.length === 0) {
      setErrorMessage('Nao ha contas abertas')
      return
    }
    abrirModalFechamento(contas)
  }

  const calcularTotalConta = (conta: Conta) => {
    return conta.pedidos
      .filter((p) => p.status === 'ATIVO')
      .reduce((acc, p) => {
        const adicionaisTotal = p.adicionais.reduce((a, ad) => a + Number(ad.valorUnitario), 0)
        return acc + (Number(p.valorUnitario) + adicionaisTotal) * p.quantidade
      }, 0)
  }

  // Total das contas fechando: subtotal puro, e com taxa de serviço aplicada
  // condicionalmente. Centralizado aqui para não divergir entre o que é
  // exibido no modal e o que é validado/enviado ao backend.
  const totalContasFechandoSemTaxa = useMemo(
    () => contasFechando.reduce((acc, c) => acc + calcularTotalConta(c), 0),
    [contasFechando]
  )
  const valorTaxaServicoFechamento = useMemo(
    () => (cobrarTaxaServico ? Number((totalContasFechandoSemTaxa * TAXA_SERVICO_PERCENTUAL).toFixed(2)) : 0),
    [totalContasFechandoSemTaxa, cobrarTaxaServico]
  )
  const totalContasFechandoComTaxa = useMemo(
    () => Number((totalContasFechandoSemTaxa + valorTaxaServicoFechamento).toFixed(2)),
    [totalContasFechandoSemTaxa, valorTaxaServicoFechamento]
  )

  // Gera o cupom de fechamento pro cliente conferir — não registra pagamento
  // nem muda status da conta. Pode ser chamado quantas vezes o garçom quiser
  // (ex.: reimprimir depois de adicionar mais itens).
  const handleImprimirConta = async () => {
    if (contasFechando.length === 0 || imprimindoConta) return

    setImprimindoConta(true)
    try {
      await api.post('/pagamentos/imprimir-conta', {
        sessaoMesaId: sessaoId,
        contaIds: contasFechando.map((c) => c.id),
      })
      setJaImprimiuNesteFechamento(true)
      toast.success('Conta enviada para impressão.')
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Erro ao imprimir conta')
    } finally {
      setImprimindoConta(false)
    }
  }

  // Valida os valores e pergunta se deve reimprimir o comprovante — evita
  // imprimir 2x quando o garçom já usou "Imprimir Conta" antes (a conta já
  // pode estar na capinha do cliente).
  const handleConfirmarFechamento = () => {
    if (contasFechando.length === 0) return
    if (pagamentoEmAndamento) return // evita double-submit (duplo clique, rede lenta)

    const dinheiro = parseFloat(pagDinheiro) || 0
    const cartao = parseFloat(pagCartao) || 0
    const pix = parseFloat(pagPix) || 0
    const totalPago = dinheiro + cartao + pix

    if (totalPago < totalContasFechandoComTaxa - 0.01) {
      setErrorMessage(
        `Valor pago (R$ ${totalPago.toFixed(2)}) e menor que o total (R$ ${totalContasFechandoComTaxa.toFixed(2)})`
      )
      return
    }

    setShowConfirmarImpressaoModal(true)
  }

  const executarRegistroPagamento = async (imprimirComprovante: boolean) => {
    setShowConfirmarImpressaoModal(false)

    const dinheiro = parseFloat(pagDinheiro) || 0
    const cartao = parseFloat(pagCartao) || 0
    const pix = parseFloat(pagPix) || 0

    setPagamentoEmAndamento(true)
    try {
      const contaIds = contasFechando.map((c) => c.id)
      const response = await api.post('/pagamentos', {
        sessaoMesaId: sessaoId,
        contaIds,
        dinheiro,
        cartao: cartao || undefined,
        pix: pix || undefined,
        registradoPorId: user?.id,
        cobrarTaxaServico,
        imprimirComprovante,
      })
      setShowFecharModal(false)
      setContasFechando([])
      setContasSelecionadas(new Set())

      if (response.data.sessaoFechada) {
        setSuccessMessage('Todas as contas pagas! Mesa liberada.')
        setTimeout(() => router.push('/mesas'), 2000)
      } else {
        setSuccessMessage('Conta(s) fechada(s) com sucesso!')
        loadData()
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Erro ao fechar conta')
    } finally {
      setPagamentoEmAndamento(false)
    }
  }

  const handleCancelarPedido = (pedidoId: string) => {
    setPedidoCancelando(pedidoId)
    setMotivoCancelamento('')
    setShowCancelModal(true)
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

  const handleConfirmarCancelamento = async () => {
    if (!pedidoCancelando || !motivoCancelamento.trim()) {
      setErrorMessage('Informe o motivo do cancelamento')
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
      setErrorMessage(error.response?.data?.message || 'Erro ao cancelar pedido')
    }
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
          <div className="text-lg font-medium text-text-subtle">Carregando...</div>
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
      <div className="py-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Mesa {sessao.mesa.numero}</h1>
            <p className="text-text-muted">Garcom: {sessao.garcom.nome}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/mesas')}
              className="px-4 py-2 border-2 border-black rounded-lg font-medium hover:bg-surface-hover transition"
            >
              Voltar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 order-2 lg:order-1">
            {/* Contas */}
            <div className="bg-surface rounded-lg border-2 border-black p-6 mb-6">
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
                            : 'border-border hover:border-gray-400'
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
                              <span className={`font-medium ${isFechada || selectedConta === conta.id ? 'text-gray-800' : 'text-text'}`}>{conta.apelido}</span>
                              <span className={`text-sm ml-2 ${isFechada || selectedConta === conta.id ? 'text-gray-500' : 'text-text-subtle'}`}>
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
                <div className="flex flex-wrap gap-2 border-t-2 border-border pt-4">
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
              <div className="bg-surface rounded-lg border-2 border-black p-6">
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
                          : 'border-border'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`font-medium ${pedido.status === 'CANCELADO' ? 'line-through text-red-600' : 'text-text'}`}>
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
                            {(() => {
                              const st = statusPedido(pedido)
                              return (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${st.chip}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                                  {st.label}
                                </span>
                              )
                            })()}
                          </div>
                          {pedido.adicionais.length > 0 && (
                            <p className={`text-xs mt-1 ${pedido.status === 'CANCELADO' ? 'text-gray-500' : 'text-text-subtle'}`}>
                              +{pedido.adicionais.map((a) => a.adicional.nome).join(', ')}
                            </p>
                          )}
                          {pedido.observacao && (
                            <p className={`text-xs mt-1 ${pedido.status === 'CANCELADO' ? 'text-gray-500' : 'text-text-subtle'}`}>
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
                          {pedido.status === 'ATIVO' && (user?.tipo === 'ADMIN' || pedido.criadoPorId === user?.id) && (
                            <div className="flex flex-col items-end gap-1.5 mt-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleMarcarEntrega(pedido.id, !pedido.entregue)
                                }}
                                className={`px-3 py-1 text-xs font-semibold rounded-md border transition-colors ${
                                  pedido.entregue
                                    ? 'text-text-subtle bg-surface-alt hover:bg-surface-hover border-border'
                                    : 'text-success bg-success-light hover:bg-success/20 border-success/30'
                                }`}
                              >
                                {pedido.entregue ? '↶ Desfazer' : '✓ Entregue'}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCancelarPedido(pedido.id)
                                }}
                                className="px-3 py-1 text-xs font-semibold text-danger bg-danger-light hover:bg-danger/20 border border-danger/30 rounded-md transition-colors"
                              >
                                Cancelar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {contaAtual.pedidos.length === 0 && (
                    <p className="text-text-subtle text-center py-4">Nenhum pedido ainda</p>
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
          <div className="bg-surface rounded-lg border-2 border-black p-6 h-fit lg:sticky lg:top-20 order-1 lg:order-2">
            <h2 className="text-xl font-bold mb-3">Produtos</h2>

            {/* Carrinho: itens pendentes de envio */}
            {carrinho.length > 0 && (
              <div className="mb-4 border-2 border-orange-500 rounded-lg p-3 bg-orange-50">
                <p className="text-xs font-bold uppercase text-orange-700 mb-2">
                  Pedido em montagem ({carrinho.length})
                </p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto mb-2">
                  {carrinho.map((item, i) => (
                    <div key={i} className="flex justify-between items-start text-sm bg-white rounded-md px-2 py-1.5">
                      <div className="flex-1">
                        <span className="font-medium text-gray-800">
                          {item.quantidade}x {item.produto.nome}
                        </span>
                        {item.adicionaisSelecionados.length > 0 && (
                          <p className="text-xs text-gray-500">
                            +{item.adicionaisSelecionados.map((a) => a.nome).join(', ')}
                          </p>
                        )}
                        {item.observacao && (
                          <p className="text-xs text-gray-500">Obs: {item.observacao}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoverItemCarrinho(i)}
                        className="ml-2 text-red-500 hover:text-red-700 font-bold text-sm"
                        title="Remover"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center text-sm font-bold text-gray-800 mb-2">
                  <span>Total:</span>
                  <span>R$ {totalCarrinho.toFixed(2)}</span>
                </div>
                <button
                  onClick={handleEnviarPedidos}
                  disabled={enviandoPedidos}
                  className="w-full bg-orange-600 text-white py-2 rounded-md font-bold hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {enviandoPedidos ? 'Enviando...' : `Enviar Pedido (${carrinho.length})`}
                </button>
              </div>
            )}

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
                      : 'bg-surface-hover text-text-muted hover:bg-border'
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
                  className="p-3 border-2 border-border rounded-lg hover:border-orange-500 cursor-pointer transition"
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
                <p className="text-text-subtle text-center py-4 text-sm">Nenhum produto encontrado</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Adicionar Pedido */}
      {showPedidoModal && produtoSelecionado && (
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
                  setShowPedidoModal(false)
                  setProdutoSelecionado(null)
                }}
                className="flex-1 py-2 border-2 border-black rounded-md font-medium hover:bg-surface-hover transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarPedido}
                className="flex-1 bg-orange-500 text-white py-2 rounded-md font-bold hover:bg-orange-600 transition"
              >
                Adicionar ao Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Fechar Conta(s) */}
      {showFecharModal && contasFechando.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg border-2 border-black p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              Fechar {contasFechando.length === 1
                ? `Conta - ${contasFechando[0].apelido}`
                : `${contasFechando.length} Contas`}
            </h2>

            {/* Itens agrupados por conta */}
            <div className="bg-surface-alt rounded-lg p-4 mb-4 space-y-3">
              {contasFechando.map((conta) => (
                <div key={conta.id}>
                  {contasFechando.length > 1 && (
                    <p className="font-semibold text-sm text-text-muted mb-1">{conta.apelido}</p>
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
                    <div className="text-right text-sm font-semibold text-text-muted mt-1">
                      Subtotal: R$ {calcularTotalConta(conta).toFixed(2)}
                    </div>
                  )}
                </div>
              ))}
              <div className="border-t-2 border-black pt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>R$ {totalContasFechandoSemTaxa.toFixed(2)}</span>
                </div>
                {cobrarTaxaServico && (
                  <div className="flex justify-between text-sm">
                    <span>Taxa de serviço (10%):</span>
                    <span>R$ {valorTaxaServicoFechamento.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-bold">Total:</span>
                  <span className="font-bold text-orange-600">
                    R$ {totalContasFechandoComTaxa.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Imprimir a conta pro cliente conferir — não registra pagamento nem fecha a conta */}
            <button
              onClick={handleImprimirConta}
              disabled={imprimindoConta}
              className="w-full mb-4 py-2 border-2 border-orange-500 text-orange-600 rounded-md font-bold hover:bg-orange-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {imprimindoConta ? 'Imprimindo...' : '🖨️ Imprimir Conta'}
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 border-t border-border" />
              <span className="text-xs font-semibold text-text-subtle uppercase">Registrar Pagamento</span>
              <div className="flex-1 border-t border-border" />
            </div>

            {podeEscolherTaxaServico ? (
              <label className="flex items-center gap-2 p-3 border-2 border-black rounded-md bg-surface-alt cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={cobrarTaxaServico}
                  onChange={(e) => setCobrarTaxaServico(e.target.checked)}
                  className="w-4 h-4 accent-orange-500"
                />
                <span className="text-sm font-medium">Cobrar taxa de serviço (10%)</span>
              </label>
            ) : (
              <div className="p-3 border border-border rounded-md bg-surface-alt mb-4 text-sm text-text-muted">
                Taxa de serviço (10%) será cobrada nesta conta.
              </div>
            )}

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
                if (totalPago <= 0) return null
                return (
                  <div className="bg-green-50 rounded-lg p-3 text-sm text-gray-800">
                    <div className="flex justify-between">
                      <span>Total pago:</span>
                      <span className="font-bold text-green-600">
                        R$ {totalPago.toFixed(2)}
                      </span>
                    </div>
                    {totalPago > totalContasFechandoComTaxa && (
                      <div className="flex justify-between mt-1">
                        <span>Troco:</span>
                        <span className="font-bold">
                          R$ {(totalPago - totalContasFechandoComTaxa).toFixed(2)}
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
                disabled={pagamentoEmAndamento}
                className="flex-1 py-2 border-2 border-black rounded-md font-medium hover:bg-surface-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarFechamento}
                disabled={pagamentoEmAndamento}
                className="flex-1 bg-green-600 text-white py-2 rounded-md font-bold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pagamentoEmAndamento ? 'Processando...' : 'Registrar Pagamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Impressão do Comprovante (ao registrar pagamento) */}
      {showConfirmarImpressaoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-surface rounded-lg border-2 border-black p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-bold mb-2">Imprimir comprovante?</h2>
            <p className="text-sm text-text-muted mb-6">
              {jaImprimiuNesteFechamento
                ? 'Você já imprimiu a conta antes. Deseja imprimir o comprovante de pagamento também?'
                : 'Deseja imprimir o comprovante desta conta?'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => executarRegistroPagamento(false)}
                disabled={pagamentoEmAndamento}
                className="flex-1 py-2 border-2 border-black rounded-md font-medium hover:bg-surface-hover transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Não imprimir
              </button>
              <button
                onClick={() => executarRegistroPagamento(true)}
                disabled={pagamentoEmAndamento}
                className="flex-1 bg-green-600 text-white py-2 rounded-md font-bold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cancelar Pedido */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg border-2 border-black p-6 w-full max-w-md mx-4">
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
                className="flex-1 py-2 border-2 border-black rounded-md font-medium hover:bg-surface-hover transition"
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
