'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'
import api from '@/lib/api'
import { useToast } from '@/components/ui/Toast'
import { Modal } from '@/components/ui/Modal'

interface ItemEstoque {
  id: string
  codigo?: string
  nome: string
  categoria: string
  unidadeMedida: string
  quantidadeAtual: number
  quantidadeMinima: number
  quantidadePorEmbalagem: number
  unidadeExibicao: string
  precoCompra?: number
  fornecedor?: string
  observacoes?: string
  ativo: boolean
}

const QTD_POR_EMBALAGEM: Record<string, number> = {
  CAIXA: 24,
  FARDO: 12,
}

// Itens medidos em GRAMA/KILO não usam caixa/fardo — exibem em Kg automaticamente
// quando o valor for grande o suficiente, sem depender de unidadeExibicao.
const formatarQtdPeso = (qtdGramas: number): string => {
  const qtd = Number(qtdGramas)
  if (qtd >= 1000) {
    return `${(qtd / 1000).toFixed(qtd % 1000 === 0 ? 0 : 2)} kg`
  }
  return `${Number.isInteger(qtd) ? qtd : qtd.toFixed(3)} g`
}

// Mesmo padrão de formatarQtdPeso, mas para ML/LITRO — itens como destilados e
// bebidas dosadas por volume (Vodka, Rum, Gin, Monin, Aperol, Água com gás)
// também não usam caixa/fardo, exibem em Litro automaticamente quando >= 1000ml.
const formatarQtdVolume = (qtdMl: number): string => {
  const qtd = Number(qtdMl)
  if (qtd >= 1000) {
    return `${(qtd / 1000).toFixed(qtd % 1000 === 0 ? 0 : 2)} L`
  }
  return `${Number.isInteger(qtd) ? qtd : qtd.toFixed(3)} ml`
}

const formatarQtdExibicao = (qtdUnidades: number, unidadeExibicao: string): string => {
  const qtd = Number(qtdUnidades)
  const unid = unidadeExibicao || 'UNIDADE'

  if (unid === 'UNIDADE') {
    return `${Number.isInteger(qtd) ? qtd : qtd.toFixed(3)} un.`
  }

  const pct = QTD_POR_EMBALAGEM[unid] || 1
  const embalagens = Math.floor(qtd / pct)
  const resto = qtd % pct
  const label = unid === 'CAIXA' ? 'cx.' : 'fardo'
  const partes = []
  if (embalagens > 0) partes.push(`${embalagens} ${label}`)
  if (resto > 0) partes.push(`${Math.round(resto)} un.`)
  const display = partes.length > 0 ? partes.join(' + ') : `0 ${label}`
  return `${display} (${qtd} un.)`
}

const formatarQuantidade = (item: ItemEstoque): string =>
  item.unidadeMedida === 'GRAMA' || item.unidadeMedida === 'KILO'
    ? formatarQtdPeso(Number(item.quantidadeAtual))
    : item.unidadeMedida === 'ML' || item.unidadeMedida === 'LITRO'
    ? formatarQtdVolume(Number(item.quantidadeAtual))
    : formatarQtdExibicao(Number(item.quantidadeAtual), item.unidadeExibicao)

const formatarQuantidadeMinima = (item: ItemEstoque): string =>
  item.unidadeMedida === 'GRAMA' || item.unidadeMedida === 'KILO'
    ? formatarQtdPeso(Number(item.quantidadeMinima))
    : item.unidadeMedida === 'ML' || item.unidadeMedida === 'LITRO'
    ? formatarQtdVolume(Number(item.quantidadeMinima))
    : formatarQtdExibicao(Number(item.quantidadeMinima), item.unidadeExibicao)

export default function EstoquePage() {
  const [itens, setItens] = useState<ItemEstoque[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showMovimentacaoModal, setShowMovimentacaoModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showHistoricoModal, setShowHistoricoModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState<ItemEstoque | null>(null)
  const [filtroCategoria, setFiltroCategoria] = useState<string>('')
  const [busca, setBusca] = useState('')
  const [mostrarEstoqueBaixo, setMostrarEstoqueBaixo] = useState(false)
  const toast = useToast()
  const setErrorMessage = (m: string) => { if (m) toast.error(m) }
  const setSuccessMessage = (m: string) => { if (m) toast.success(m) }

  useEffect(() => {
    loadItens()
  }, [filtroCategoria, busca, mostrarEstoqueBaixo])

  const loadItens = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filtroCategoria) params.append('categoria', filtroCategoria)
      if (busca) params.append('busca', busca)
      if (mostrarEstoqueBaixo) params.append('estoqueBaixo', 'true')
      params.append('ativo', 'true')

      const response = await api.get(`/estoque/itens?${params.toString()}`)
      setItens(response.data)
    } catch (error) {
      console.error('Erro ao carregar itens:', error)
    } finally {
      setLoading(false)
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

  const isEstoqueBaixo = (item: ItemEstoque) => {
    return Number(item.quantidadeAtual) <= Number(item.quantidadeMinima)
  }

  // Status visual do item: OK / Baixo / Esgotado
  const statusEstoque = (item: ItemEstoque) => {
    const atual = Number(item.quantidadeAtual)
    const minima = Number(item.quantidadeMinima)
    if (atual <= 0) return { label: 'Esgotado', cls: 'bg-danger-light text-danger-dark', dot: 'bg-danger' }
    if (atual <= minima) return { label: 'Baixo', cls: 'bg-warning-light text-warning-dark', dot: 'bg-warning' }
    return { label: 'OK', cls: 'bg-success-light text-success-dark', dot: 'bg-success' }
  }

  // Percentual do nível atual em relação a um "cheio" estimado (2x mínima ou 1)
  const nivelPercentual = (item: ItemEstoque) => {
    const atual = Number(item.quantidadeAtual)
    const minima = Number(item.quantidadeMinima)
    const cheio = Math.max(minima * 2, atual, 1)
    return Math.min(100, Math.round((atual / cheio) * 100))
  }

  const itensEstoqueBaixo = itens.filter(isEstoqueBaixo)
  const itensEsgotados = itens.filter((i) => Number(i.quantidadeAtual) <= 0)

  const handleDelete = async () => {
    if (!selectedItem) return
    try {
      await api.delete(`/estoque/itens/${selectedItem.id}`)
      setShowDeleteModal(false)
      setSelectedItem(null)
      loadItens()
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Erro ao excluir item')
    }
  }

  return (
    <Layout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-text">Estoque</h1>
              <p className="text-sm text-text-subtle mt-0.5">Controle de itens e movimentações</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowHistoricoModal(true)}
                className="bg-surface hover:bg-surface-hover text-text-muted font-semibold py-2 px-4 rounded-lg border border-border shadow-sm transition-colors flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Histórico
              </button>
              <button
                onClick={() => { setSelectedItem(null); setShowModal(true) }}
                className="bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm transition-colors text-sm"
              >
                + Novo Item
              </button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-text-subtle mb-1">Total de Itens</p>
              <p className="text-2xl font-bold text-text">{itens.length}</p>
            </div>
            <div className={`rounded-xl p-4 border shadow-sm ${itensEstoqueBaixo.length > 0 ? 'bg-warning-light border-warning/30' : 'bg-surface border-border'}`}>
              <p className="text-xs font-semibold uppercase text-warning-dark mb-1">Estoque Baixo</p>
              <p className="text-2xl font-bold text-warning-dark">{itensEstoqueBaixo.length}</p>
            </div>
            <div className={`rounded-xl p-4 border shadow-sm ${itensEsgotados.length > 0 ? 'bg-danger-light border-danger/30' : 'bg-surface border-border'}`}>
              <p className="text-xs font-semibold uppercase text-danger-dark mb-1">Esgotados</p>
              <p className="text-2xl font-bold text-danger-dark">{itensEsgotados.length}</p>
            </div>
          </div>

          {/* Barra de filtros (horizontal compacta) */}
          <div className="bg-surface border border-border rounded-xl p-3 mb-5 shadow-sm flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="relative flex-1">
              <svg className="w-4 h-4 text-text-subtle absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar item..."
                className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-surface sm:w-44"
            >
              <option value="">Todas categorias</option>
              <option value="BEBIDAS">Bebidas</option>
              <option value="ALIMENTOS">Alimentos</option>
              <option value="UTENSILIOS">Utensílios</option>
            </select>
            <button
              onClick={() => setMostrarEstoqueBaixo(!mostrarEstoqueBaixo)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors whitespace-nowrap ${
                mostrarEstoqueBaixo
                  ? 'bg-warning-light border-warning/40 text-warning-dark'
                  : 'bg-surface border-border text-text-muted hover:bg-surface-hover'
              }`}
            >
              {mostrarEstoqueBaixo ? '✓ ' : ''}Só estoque baixo
            </button>
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
                      <th className="px-5 py-3 text-left text-xs font-semibold text-text-subtle uppercase tracking-wide">Item</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-text-subtle uppercase tracking-wide">Status</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold text-text-subtle uppercase tracking-wide w-64">Quantidade</th>
                      <th className="px-5 py-3 text-right text-xs font-semibold text-text-subtle uppercase tracking-wide">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface divide-y divide-border">
                    {itens.map((item) => {
                      const st = statusEstoque(item)
                      const nivel = nivelPercentual(item)
                      return (
                      <tr key={item.id} className="hover:bg-surface-hover transition-colors">
                        <td className="px-5 py-3">
                          <p className="text-sm font-semibold text-text">{item.nome}</p>
                          <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded ${getCategoriaColor(item.categoria)}`}>
                            {item.categoria}
                          </span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full ${st.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-sm font-bold ${isEstoqueBaixo(item) ? 'text-warning-dark' : 'text-text-muted'}`}>
                              {formatarQuantidade(item)}
                            </span>
                          </div>
                          <div className="w-full bg-surface-hover rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full transition-all ${st.dot}`}
                              style={{ width: `${nivel}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-text-subtle mt-1">mín: {formatarQuantidadeMinima(item)}</p>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => { setSelectedItem(item); setShowMovimentacaoModal(true) }}
                              className="px-2.5 py-1.5 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-md transition-colors"
                            >
                              Movimentar
                            </button>
                            <button
                              onClick={() => { setSelectedItem(item); setShowModal(true) }}
                              className="px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => { setSelectedItem(item); setShowDeleteModal(true) }}
                              className="px-2.5 py-1.5 text-xs font-medium text-danger bg-danger-light hover:bg-danger/20 rounded-md transition-colors"
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Item */}
      {showModal && (
        <ItemModal
          item={selectedItem}
          onClose={() => {
            setShowModal(false)
            setSelectedItem(null)
          }}
          onSave={() => {
            loadItens()
            setShowModal(false)
            setSelectedItem(null)
          }}
        />
      )}

      {/* Modal de Movimentação */}
      {showMovimentacaoModal && selectedItem && (
        <MovimentacaoModal
          item={selectedItem}
          onClose={() => {
            setShowMovimentacaoModal(false)
            setSelectedItem(null)
          }}
          onSave={() => {
            loadItens()
            setShowMovimentacaoModal(false)
            setSelectedItem(null)
          }}
        />
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-surface border-2 border-red-500 rounded-lg p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 text-text">Confirmar Exclusão</h2>
            <p className="text-text-muted mb-6">
              Tem certeza que deseja excluir o item <strong>{selectedItem.nome}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setSelectedItem(null)
                }}
                className="px-6 py-2 border-2 border-black text-text font-bold rounded-md hover:bg-surface-hover"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="px-6 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-md border-2 border-black"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Histórico */}
      {showHistoricoModal && (
        <HistoricoModal
          onClose={() => setShowHistoricoModal(false)}
        />
      )}

    </Layout>
  )
}

// Componente Modal de Histórico
function HistoricoModal({ onClose }: { onClose: () => void }) {
  const [historico, setHistorico] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState<string>('')
  const [dataInicio, setDataInicio] = useState<string>('')
  const [horaInicio, setHoraInicio] = useState<string>('')
  const [dataFim, setDataFim] = useState<string>('')
  const [horaFim, setHoraFim] = useState<string>('')

  useEffect(() => {
    loadHistorico()
  }, [filtroTipo, dataInicio, horaInicio, dataFim, horaFim])

  const loadHistorico = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (filtroTipo) {
        params.append('tipoAcao', filtroTipo)
      }
      
      // Montar data/hora inicial
      if (dataInicio) {
        let dataInicioCompleta = dataInicio
        if (horaInicio) {
          dataInicioCompleta = `${dataInicio}T${horaInicio}:00`
        } else {
          dataInicioCompleta = `${dataInicio}T00:00:00`
        }
        params.append('dataInicio', dataInicioCompleta)
      }
      
      // Montar data/hora final
      if (dataFim) {
        let dataFimCompleta = dataFim
        if (horaFim) {
          dataFimCompleta = `${dataFim}T${horaFim}:00`
        } else {
          dataFimCompleta = `${dataFim}T23:59:59`
        }
        params.append('dataFim', dataFimCompleta)
      }
      
      params.append('limit', '200')

      const response = await api.get(`/estoque/historico?${params.toString()}`)
      setHistorico(response.data)
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
    } finally {
      setLoading(false)
    }
  }

  const limparFiltros = () => {
    setFiltroTipo('')
    setDataInicio('')
    setHoraInicio('')
    setDataFim('')
    setHoraFim('')
  }

  // Config visual por tipo de ação: ícone, cor do ponto, sinal
  const ACAO_CONFIG: Record<string, { label: string; dot: string; chip: string; sinal: '+' | '-' | '' }> = {
    ENTRADA:  { label: 'Entrada',  dot: 'bg-success', chip: 'bg-success-light text-success-dark', sinal: '+' },
    SAIDA:    { label: 'Saída',    dot: 'bg-danger',  chip: 'bg-danger-light text-danger-dark',   sinal: '-' },
    AJUSTE:   { label: 'Ajuste',   dot: 'bg-warning', chip: 'bg-warning-light text-warning-dark', sinal: '' },
    CRIADO:   { label: 'Criado',   dot: 'bg-info',    chip: 'bg-info-light text-info-dark',        sinal: '' },
    EDITADO:  { label: 'Editado',  dot: 'bg-info',    chip: 'bg-info-light text-info-dark',        sinal: '' },
    REMOVIDO: { label: 'Removido', dot: 'bg-gray-400', chip: 'bg-gray-100 text-gray-600',          sinal: '' },
  }
  // Devolução de estoque por cancelamento de pedido: grava tipoAcao ENTRADA
  // (tecnicamente correto, aumenta o estoque) mas não é uma compra/entrada de
  // fornecedor — usa uma config visual própria pra não confundir os dois.
  const ACAO_CANCELAMENTO = { label: 'Cancelado', dot: 'bg-warning', chip: 'bg-warning-light text-warning-dark', sinal: '+' as const }
  const cfgAcao = (tipo: string) => ACAO_CONFIG[tipo] || { label: tipo, dot: 'bg-gray-400', chip: 'bg-gray-100 text-gray-600', sinal: '' as const }

  const formatarData = (data: string) =>
    new Date(data).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  // Quantidade com a unidade certa: grama/kilo mostram peso, litro/ml mostram
  // volume, o resto (UNIDADE, CAIXA, PACOTE) mostra "un."
  const formatarQtdRegistro = (registro: any): string => {
    const qtd = Number(registro.quantidade)
    const unidadeMedida = registro.itemEstoque?.unidadeMedida
    if (unidadeMedida === 'GRAMA' || unidadeMedida === 'KILO') {
      return qtd >= 1000 ? `${(qtd / 1000).toFixed(qtd % 1000 === 0 ? 0 : 2)} kg` : `${qtd} g`
    }
    if (unidadeMedida === 'ML' || unidadeMedida === 'LITRO') {
      return qtd >= 1000 ? `${(qtd / 1000).toFixed(qtd % 1000 === 0 ? 0 : 2)} L` : `${qtd} ml`
    }
    return `${qtd} un.`
  }

  const temFiltro = filtroTipo || dataInicio || dataFim

  // Agrupa registros de SAIDA/ENTRADA que vieram do mesmo pedido E do mesmo
  // evento (composição de um produto: vários ingredientes descontados/devolvidos
  // juntos) num único cartão "2x Pão com Linguiça" com os ingredientes por dentro.
  // A chave inclui tipoAcao porque um pedido cancelado tem 2 eventos distintos
  // com o mesmo pedidoId — a SAIDA original (venda) e a ENTRADA da devolução —
  // que precisam virar 2 cards separados, não 1 card com as linhas misturadas.
  // Registros sem pedidoId (ajuste manual, entrada de fornecedor,
  // criação/edição/remoção de item) continuam individuais.
  const agruparPorPedido = (registros: any[]) => {
    const grupos: any[] = []
    const porPedido = new Map<string, any[]>()

    for (const registro of registros) {
      if (registro.pedido?.id) {
        const chave = `${registro.pedido.id}:${registro.tipoAcao}`
        const lista = porPedido.get(chave) || []
        lista.push(registro)
        porPedido.set(chave, lista)
      } else {
        grupos.push({ tipo: 'individual', registro })
      }
    }

    for (const [chave, itens] of Array.from(porPedido)) {
      const tipoAcao = itens[0].tipoAcao
      grupos.push({
        tipo: 'pedido',
        pedidoId: chave,
        produtoNome: itens[0].pedido.produto?.nome || 'Produto',
        quantidade: itens[0].pedido.quantidade,
        tipoAcao,
        // Todo grupo com pedidoId e tipoAcao ENTRADA só pode ser devolução de
        // cancelamento (venda normal sempre grava SAIDA) — nunca compra de
        // fornecedor, que não tem pedidoId associado.
        ehDevolucaoCancelamento: tipoAcao === 'ENTRADA',
        registradoEm: itens[0].registradoEm,
        registradoPor: itens[0].registradoPor,
        itens,
      })
    }

    // Mantém ordem cronológica (mais recente primeiro), usando o registro mais novo de cada grupo
    grupos.sort((a, b) => {
      const dataA = a.tipo === 'pedido' ? a.registradoEm : a.registro.registradoEm
      const dataB = b.tipo === 'pedido' ? b.registradoEm : b.registro.registradoEm
      return new Date(dataB).getTime() - new Date(dataA).getTime()
    })

    return grupos
  }

  return (
    <Modal open onClose={onClose} title="Histórico de Estoque" size="xl">
      {/* Barra de filtros compacta */}
      <div className="bg-surface-alt border border-border rounded-lg p-3 mb-5 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[140px]">
          <label className="block text-xs font-semibold text-text-subtle mb-1">Tipo de ação</label>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Todas</option>
            <option value="ENTRADA">Entrada</option>
            <option value="SAIDA">Saída</option>
            <option value="AJUSTE">Ajuste</option>
            <option value="CRIADO">Criado</option>
            <option value="EDITADO">Editado</option>
            <option value="REMOVIDO">Removido</option>
          </select>
        </div>
        <div className="flex-1 min-w-[130px]">
          <label className="block text-xs font-semibold text-text-subtle mb-1">De</label>
          <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        <div className="flex-1 min-w-[130px]">
          <label className="block text-xs font-semibold text-text-subtle mb-1">Até</label>
          <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} min={dataInicio || undefined}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        {temFiltro && (
          <button onClick={limparFiltros}
            className="px-3 py-2 text-sm font-medium text-text-muted hover:text-danger transition-colors">
            Limpar
          </button>
        )}
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : historico.length === 0 ? (
        <div className="text-center py-12 text-text-subtle text-sm">Nenhum registro encontrado</div>
      ) : (
        <div className="relative pl-6">
          {/* Linha vertical da timeline */}
          <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
          <div className="space-y-4">
            {agruparPorPedido(historico).map((grupo: any) => {
              if (grupo.tipo === 'individual') {
                const registro = grupo.registro
                const cfg = cfgAcao(registro.tipoAcao)
                return (
                  <div key={registro.id} className="relative">
                    <span className={`absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white ring-1 ring-gray-200 ${cfg.dot}`} />
                    <div className="bg-surface border border-border rounded-lg p-3 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded ${cfg.chip}`}>{cfg.label}</span>
                            {registro.itemEstoque && (
                              <span className="text-sm font-semibold text-text">{registro.itemEstoque.nome}</span>
                            )}
                          </div>
                          <p className="text-xs text-text-subtle mt-1">{registro.descricao}</p>
                          <div className="flex items-center gap-2 mt-1.5 text-xs text-text-subtle flex-wrap">
                            <span>{formatarData(registro.registradoEm)}</span>
                            <span>•</span>
                            <span>{registro.registradoPor.nome}</span>
                            {registro.motivo && (<><span>•</span><span>{registro.motivo}</span></>)}
                          </div>
                        </div>
                        {registro.quantidade != null && Number(registro.quantidade) > 0 && (
                          <span className={`text-sm font-bold whitespace-nowrap ${
                            cfg.sinal === '+' ? 'text-success' : cfg.sinal === '-' ? 'text-danger' : 'text-text-muted'
                          }`}>
                            {cfg.sinal}{formatarQtdRegistro(registro)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              }

              // Grupo de pedido: um cartão com o produto vendido/cancelado,
              // expansível para ver a composição (ingredientes) detalhada.
              const cfg = grupo.ehDevolucaoCancelamento ? ACAO_CANCELAMENTO : cfgAcao(grupo.tipoAcao)
              return (
                <GrupoPedidoCard
                  key={grupo.pedidoId}
                  grupo={grupo}
                  cfg={cfg}
                  formatarData={formatarData}
                  formatarQtdRegistro={formatarQtdRegistro}
                />
              )
            })}
          </div>
        </div>
      )}
    </Modal>
  )
}

// Cartão expansível de um pedido: mostra "2x Pão com Linguiça" fechado,
// e a lista de ingredientes descontados/devolvidos ao expandir.
function GrupoPedidoCard({ grupo, cfg, formatarData, formatarQtdRegistro }: {
  grupo: any
  cfg: { label: string; dot: string; chip: string; sinal: '+' | '-' | '' }
  formatarData: (data: string) => string
  formatarQtdRegistro: (registro: any) => string
}) {
  const [aberto, setAberto] = useState(false)

  return (
    <div className="relative">
      <span className={`absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white ring-1 ring-gray-200 ${cfg.dot}`} />
      <div className="bg-surface border border-border rounded-lg p-3 hover:shadow-sm transition-shadow">
        <button
          type="button"
          onClick={() => setAberto(!aberto)}
          className="w-full flex items-start justify-between gap-3 text-left"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 text-xs font-semibold rounded ${cfg.chip}`}>{cfg.label}</span>
              <span className="text-sm font-semibold text-text">{grupo.quantidade}x {grupo.produtoNome}</span>
              <span className="text-xs text-text-subtle">({grupo.itens.length} {grupo.itens.length === 1 ? 'ingrediente' : 'ingredientes'})</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-text-subtle flex-wrap">
              <span>{formatarData(grupo.registradoEm)}</span>
              <span>•</span>
              <span>{grupo.registradoPor.nome}</span>
            </div>
          </div>
          <svg className={`w-4 h-4 text-text-subtle flex-shrink-0 mt-1 transition-transform ${aberto ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {aberto && (
          <div className="mt-3 pt-3 border-t border-border space-y-2">
            {grupo.itens.map((registro: any) => (
              <div key={registro.id} className="flex items-center justify-between text-sm">
                <span className="text-text-muted">{registro.itemEstoque?.nome}</span>
                <span className={`font-medium ${cfg.sinal === '+' ? 'text-success' : cfg.sinal === '-' ? 'text-danger' : 'text-text-muted'}`}>
                  {cfg.sinal}{formatarQtdRegistro(registro)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Componente Modal de Item
function ItemModal({
  item,
  onClose,
  onSave,
}: {
  item: ItemEstoque | null
  onSave: () => void
  onClose: () => void
}) {
  const [formData, setFormData] = useState({
    nome: '',
    categoria: 'BEBIDAS',
    unidadeMedida: 'UNIDADE',
    quantidadeAtual: 0,
    quantidadeMinima: 0,
    unidadeExibicao: 'UNIDADE',
    fornecedor: '',
    observacoes: '',
  })
  const [loading, setLoading] = useState(false)
  const toast = useToast()
  const setErrorMessage = (m: string) => { if (m) toast.error(m) }

  useEffect(() => {
    if (item) {
      setFormData({
        nome: item.nome,
        categoria: item.categoria,
        unidadeMedida: item.unidadeMedida,
        quantidadeAtual: item.quantidadeAtual,
        quantidadeMinima: item.quantidadeMinima,
        unidadeExibicao: item.unidadeExibicao || 'UNIDADE',
        fornecedor: item.fornecedor || '',
        observacoes: item.observacoes || '',
      })
    } else {
      setFormData({
        nome: '',
        categoria: 'BEBIDAS',
        unidadeMedida: 'UNIDADE',
        quantidadeAtual: 0,
        quantidadeMinima: 0,
        unidadeExibicao: 'UNIDADE',
        fornecedor: '',
        observacoes: '',
      })
    }
  }, [item])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      let data: any = {}

      if (item) {
        data = {
          nome: formData.nome,
          categoria: formData.categoria,
          unidadeMedida: formData.unidadeMedida,
          quantidadeAtual: formData.quantidadeAtual,
          quantidadeMinima: formData.quantidadeMinima,
          unidadeExibicao: formData.unidadeExibicao,
          fornecedor: formData.fornecedor || undefined,
          observacoes: formData.observacoes || undefined,
        }
        await api.patch(`/estoque/itens/${item.id}`, data)
      } else {
        data = { ...formData }
        await api.post('/estoque/itens', data)
      }
      onSave()
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Erro ao salvar item')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface border-2 border-black rounded-lg p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <h2 className="text-2xl font-bold mb-6 text-text">
          {item ? 'Editar Item' : 'Novo Item'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1 text-text">Nome *</label>
            <input
              type="text"
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full px-3 py-2 border-2 border-black rounded-md text-text bg-surface placeholder-text-subtle"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1 text-text">Categoria *</label>
              <select
                required
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                className="w-full px-3 py-2 border-2 border-black rounded-md text-text bg-surface"
              >
                <option value="BEBIDAS">Bebidas</option>
                <option value="ALIMENTOS">Alimentos</option>
                <option value="UTENSILIOS">Utensílios</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1 text-text">Unidade *</label>
              <select
                required
                value={formData.unidadeMedida}
                onChange={(e) => setFormData({ ...formData, unidadeMedida: e.target.value })}
                className="w-full px-3 py-2 border-2 border-black rounded-md text-text bg-surface"
              >
                <option value="UNIDADE">Unidade</option>
                <option value="LITRO">Litro</option>
                <option value="GRAMA">Grama</option>
                <option value="KILO">Kilo</option>
                <option value="CAIXA">Caixa</option>
                <option value="PACOTE">Pacote</option>
              </select>
            </div>
          </div>

          {/* Exibição na tabela — só faz sentido para itens medidos em UNIDADE (agrupar em caixa/fardo).
              Itens em GRAMA/KILO exibem automaticamente em Kg, sem precisar dessa opção. */}
          {formData.unidadeMedida === 'UNIDADE' && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-xs font-bold text-orange-800 uppercase tracking-wide mb-2">Exibição na tabela de estoque</p>
            <div>
              <label className="block text-sm font-bold mb-1 text-text">Exibir quantidade em</label>
              <select
                value={formData.unidadeExibicao}
                onChange={(e) => setFormData({ ...formData, unidadeExibicao: e.target.value })}
                className="w-full px-3 py-2 border-2 border-black rounded-md text-text bg-surface"
              >
                <option value="UNIDADE">Unidades</option>
                <option value="CAIXA">Caixas (1 cx. = 24 un.)</option>
                <option value="FARDO">Fardos (1 fardo = 12 un.)</option>
              </select>
            </div>
            {formData.unidadeExibicao !== 'UNIDADE' && (
              <p className="text-xs text-orange-700 mt-2">
                O estoque é armazenado em unidades. A exibição em {formData.unidadeExibicao === 'CAIXA' ? 'caixas' : 'fardos'} é apenas visual.
              </p>
            )}
          </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1 text-text">Quantidade Atual</label>
              <input
                type="number"
                step="0.001"
                value={formData.quantidadeAtual}
                onChange={(e) =>
                  setFormData({ ...formData, quantidadeAtual: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border-2 border-black rounded-md text-text bg-surface"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1 text-text">Quantidade Mínima</label>
              <input
                type="number"
                step="0.001"
                value={formData.quantidadeMinima}
                onChange={(e) =>
                  setFormData({ ...formData, quantidadeMinima: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border-2 border-black rounded-md text-text bg-surface"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1 text-text">Fornecedor</label>
            <input
              type="text"
              value={formData.fornecedor}
              onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
              className="w-full px-3 py-2 border-2 border-black rounded-md text-text bg-surface placeholder-text-subtle"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1 text-text">Observações</label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="w-full px-3 py-2 border-2 border-black rounded-md text-text bg-surface"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border-2 border-black text-text font-bold rounded-md hover:bg-surface-hover"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-md border-2 border-black disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Componente Modal de Movimentação
function MovimentacaoModal({
  item,
  onClose,
  onSave,
}: {
  item: ItemEstoque
  onSave: () => void
  onClose: () => void
}) {
  // Caixa/fardo só se aplica a itens medidos em UNIDADE — GRAMA/KILO nunca usa embalagem.
  const usaEmbalagem = item.unidadeMedida === 'UNIDADE' && (item.unidadeExibicao || 'UNIDADE') !== 'UNIDADE'
  const pct = QTD_POR_EMBALAGEM[item.unidadeExibicao] || 1
  const labelEmb = item.unidadeExibicao === 'FARDO' ? 'fardo' : 'caixa'

  const [usarEmbalagem, setUsarEmbalagem] = useState(usaEmbalagem)
  const [formData, setFormData] = useState({
    tipo: 'ENTRADA',
    quantidade: '',
    motivo: '',
    observacoes: '',
  })
  const [loading, setLoading] = useState(false)
  const toast = useToast()
  const setErrorMessage = (m: string) => { if (m) toast.error(m) }

  const quantidadeEmUnidades = (): number => {
    const qtd = parseFloat(formData.quantidade) || 0
    return usarEmbalagem ? qtd * pct : qtd
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/estoque/movimentacoes', {
        itemEstoqueId: item.id,
        tipo: formData.tipo,
        quantidade: quantidadeEmUnidades(),
        motivo: formData.motivo || undefined,
        observacoes: formData.observacoes || undefined,
      })
      onSave()
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Erro ao registrar movimentação')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface border-2 border-black rounded-lg p-8 w-full max-w-md shadow-2xl">
        <h2 className="text-2xl font-bold mb-4 text-text">Movimentar Estoque</h2>
        <p className="text-sm text-text-muted mb-6">
          <strong>Item:</strong> {item.nome}
          <br />
          <strong>Quantidade Atual:</strong> {formatarQuantidade(item)}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1 text-text">Tipo *</label>
            <select
              required
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              className="w-full px-3 py-2 border-2 border-black rounded-md text-text bg-surface"
            >
              <option value="ENTRADA">Entrada (recebi mercadoria)</option>
              <option value="SAIDA">Saída (perda, quebra, consumo)</option>
              <option value="AJUSTE">Ajuste (corrigir contagem)</option>
            </select>
            {formData.tipo === 'ENTRADA' && <p className="text-xs text-text-subtle mt-1">Soma ao estoque atual.</p>}
            {formData.tipo === 'SAIDA' && <p className="text-xs text-text-subtle mt-1">Subtrai do estoque atual.</p>}
            {formData.tipo === 'AJUSTE' && <p className="text-xs text-warning-dark mt-1">Substitui o valor atual pela quantidade contada no depósito.</p>}
          </div>

          {usaEmbalagem && (
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-text">
                <input
                  type="checkbox"
                  checked={usarEmbalagem}
                  onChange={(e) => setUsarEmbalagem(e.target.checked)}
                  className="w-4 h-4 accent-orange-500"
                />
                Informar em {labelEmb}s (1 {labelEmb} = {pct} un.)
              </label>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold mb-1 text-text">
              {formData.tipo === 'AJUSTE' ? 'Quantidade contada' : 'Quantidade'}{' '}
              {usarEmbalagem && usaEmbalagem ? `(em ${labelEmb}s)` : '(em unidades)'} *
            </label>
            <input
              type="number"
              step="1"
              min="0"
              required
              value={formData.quantidade}
              onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
              className="w-full px-3 py-2 border-2 border-black rounded-md text-text bg-surface placeholder-text-subtle"
              placeholder={
                formData.tipo === 'AJUSTE'
                  ? (usarEmbalagem ? `Total de ${labelEmb}s no depósito` : 'Total de unidades no depósito')
                  : (usarEmbalagem ? `Qtd de ${labelEmb}s` : 'Qtd de unidades')
              }
            />
            {usarEmbalagem && formData.quantidade && (
              <p className="text-xs text-brand-700 mt-1">
                = {quantidadeEmUnidades()} unidades {formData.tipo === 'AJUSTE' ? 'no total' : 'no estoque'}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-bold mb-1 text-text">Motivo</label>
            <input
              type="text"
              value={formData.motivo}
              onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
              className="w-full px-3 py-2 border-2 border-black rounded-md text-text bg-surface placeholder-text-subtle"
              placeholder="Ex: Compra, Uso, Perda..."
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1 text-text">Observações</label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="w-full px-3 py-2 border-2 border-black rounded-md text-text bg-surface"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border-2 border-black text-text font-bold rounded-md hover:bg-surface-hover"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-md border-2 border-black disabled:opacity-50"
            >
              {loading ? 'Registrando...' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
