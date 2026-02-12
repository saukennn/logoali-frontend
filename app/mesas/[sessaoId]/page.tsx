'use client'

import { useEffect, useState } from 'react'
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

  // Modal adicionar pedido
  const [showPedidoModal, setShowPedidoModal] = useState(false)
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [adicionaisDisponiveis, setAdicionaisDisponiveis] = useState<Adicional[]>([])
  const [adicionaisSel, setAdicionaisSel] = useState<string[]>([])
  const [obsTemp, setObsTemp] = useState('')
  const [qtdTemp, setQtdTemp] = useState(1)

  // Modal fechar conta
  const [showFecharModal, setShowFecharModal] = useState(false)
  const [contaFechando, setContaFechando] = useState<Conta | null>(null)
  const [pagDinheiro, setPagDinheiro] = useState('')
  const [pagCartao, setPagCartao] = useState('')
  const [pagPix, setPagPix] = useState('')

  // Modal cancelar pedido
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [pedidoCancelando, setPedidoCancelando] = useState<string | null>(null)
  const [motivoCancelamento, setMotivoCancelamento] = useState('')

  useEffect(() => {
    loadData()
  }, [sessaoId])

  const loadData = async () => {
    try {
      const [sessaoRes, produtosRes] = await Promise.all([
        api.get(`/sessoes-mesa/${sessaoId}`),
        api.get('/produtos'),
      ])
      setSessao(sessaoRes.data)
      setProdutos(produtosRes.data)
      if (sessaoRes.data.contas && sessaoRes.data.contas.length > 0 && !selectedConta) {
        setSelectedConta(sessaoRes.data.contas[0].id)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

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

  const handleAbrirFecharConta = (conta: Conta) => {
    setContaFechando(conta)
    setPagDinheiro('')
    setPagCartao('')
    setPagPix('')
    setShowFecharModal(true)
  }

  const handleConfirmarFechamento = async () => {
    if (!contaFechando) return

    const dinheiro = parseFloat(pagDinheiro) || 0
    const cartao = parseFloat(pagCartao) || 0
    const pix = parseFloat(pagPix) || 0

    const totalPago = dinheiro + cartao + pix
    const totalConta = contaFechando.pedidos
      .filter((p) => p.status === 'ATIVO')
      .reduce((acc, p) => {
        const adicionaisTotal = p.adicionais.reduce((a, ad) => a + Number(ad.valorUnitario), 0)
        return acc + (Number(p.valorUnitario) + adicionaisTotal) * p.quantidade
      }, 0)

    if (totalPago < totalConta) {
      alert(
        `Valor pago (R$ ${totalPago.toFixed(2)}) e menor que o total da conta (R$ ${totalConta.toFixed(2)})`
      )
      return
    }

    try {
      await api.post('/pagamentos', {
        sessaoMesaId: sessaoId,
        dinheiro,
        cartao,
        pix,
      })
      setShowFecharModal(false)
      setContaFechando(null)
      alert('Conta fechada com sucesso!')
      loadData()
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

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">Carregando...</div>
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

  const calcularTotalConta = (conta: Conta) => {
    return conta.pedidos
      .filter((p) => p.status === 'ATIVO')
      .reduce((acc, p) => {
        const adicionaisTotal = p.adicionais.reduce((a, ad) => a + Number(ad.valorUnitario), 0)
        return acc + (Number(p.valorUnitario) + adicionaisTotal) * p.quantidade
      }, 0)
  }

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Mesa {sessao.mesa.numero}</h1>
            <p className="text-gray-600">Garcom: {sessao.garcom.nome}</p>
          </div>
          <button
            onClick={() => router.push('/mesas')}
            className="px-4 py-2 border-2 border-black rounded-lg font-medium hover:bg-gray-100 transition"
          >
            Voltar
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {/* Contas */}
            <div className="bg-white rounded-lg border-2 border-black p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Contas</h2>
              <div className="space-y-2 mb-4">
                {sessao.contas.map((conta) => {
                  const total = calcularTotalConta(conta)
                  return (
                    <div
                      key={conta.id}
                      className={`p-3 border-2 rounded-lg cursor-pointer transition ${
                        selectedConta === conta.id
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
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
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              conta.status === 'ABERTA'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {conta.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Apelido da conta"
                  value={novoApelido}
                  onChange={(e) => setNovoApelido(e.target.value)}
                  className="flex-1 px-3 py-2 border-2 border-black rounded-md"
                />
                <button
                  onClick={handleCriarConta}
                  className="px-4 py-2 bg-orange-500 text-white rounded-md font-bold hover:bg-orange-600 transition"
                >
                  Nova Conta
                </button>
              </div>
            </div>

            {/* Pedidos da conta selecionada */}
            {contaAtual && (
              <div className="bg-white rounded-lg border-2 border-black p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Pedidos - {contaAtual.apelido}</h2>
                  <div className="flex gap-2">
                    {contaAtual.status === 'ABERTA' && (
                      <button
                        onClick={() => handleAbrirFecharConta(contaAtual)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
                      >
                        Fechar Conta
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {contaAtual.pedidos.map((pedido) => (
                    <div
                      key={pedido.id}
                      className={`p-3 border-2 rounded-lg ${
                        pedido.status === 'CANCELADO'
                          ? 'border-red-300 bg-red-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
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
                              <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
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
                          <p className="font-bold">
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

          {/* Produtos */}
          <div className="bg-white rounded-lg border-2 border-black p-6 h-fit sticky top-20">
            <h2 className="text-xl font-bold mb-4">Produtos</h2>
            <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
              {produtos
                .filter((p) => p.ativo !== false)
                .map((produto) => (
                  <div
                    key={produto.id}
                    className="p-3 border-2 border-gray-200 rounded-lg hover:border-orange-500 cursor-pointer transition"
                    onClick={() => handleSelecionarProduto(produto)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{produto.nome}</p>
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

      {/* Modal Fechar Conta */}
      {showFecharModal && contaFechando && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border-2 border-black p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Fechar Conta - {contaFechando.apelido}</h2>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="space-y-1">
                {contaFechando.pedidos
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
              <div className="border-t-2 border-black mt-3 pt-2 flex justify-between">
                <span className="font-bold">Total:</span>
                <span className="font-bold text-orange-600">
                  R$ {calcularTotalConta(contaFechando).toFixed(2)}
                </span>
              </div>
            </div>

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

              {(parseFloat(pagDinheiro) || 0) +
                (parseFloat(pagCartao) || 0) +
                (parseFloat(pagPix) || 0) >
                0 && (
                <div className="bg-green-50 rounded-lg p-3 text-sm">
                  <div className="flex justify-between">
                    <span>Total pago:</span>
                    <span className="font-bold text-green-600">
                      R${' '}
                      {(
                        (parseFloat(pagDinheiro) || 0) +
                        (parseFloat(pagCartao) || 0) +
                        (parseFloat(pagPix) || 0)
                      ).toFixed(2)}
                    </span>
                  </div>
                  {(parseFloat(pagDinheiro) || 0) +
                    (parseFloat(pagCartao) || 0) +
                    (parseFloat(pagPix) || 0) >
                    calcularTotalConta(contaFechando) && (
                    <div className="flex justify-between mt-1">
                      <span>Troco:</span>
                      <span className="font-bold">
                        R${' '}
                        {(
                          (parseFloat(pagDinheiro) || 0) +
                          (parseFloat(pagCartao) || 0) +
                          (parseFloat(pagPix) || 0) -
                          calcularTotalConta(contaFechando)
                        ).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowFecharModal(false)
                  setContaFechando(null)
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
