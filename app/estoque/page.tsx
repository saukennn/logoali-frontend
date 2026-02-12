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
  quantidadeAtual: number
  quantidadeMinima: number
  precoCompra?: number
  fornecedor?: string
  observacoes?: string
  ativo: boolean
}

// Funções utilitárias para formatação
const converterParaUnidades = (quantidade: number, unidadeMedida: string): number => {
  if (unidadeMedida === 'CAIXA') {
    return quantidade * 12
  }
  return quantidade
}

const formatarQuantidade = (item: ItemEstoque): string => {
  const qtd = Number(item.quantidadeAtual)
  if (item.unidadeMedida === 'CAIXA') {
    const unidades = converterParaUnidades(qtd, item.unidadeMedida)
    return `${unidades} unidades (${qtd} caixa${qtd !== 1 ? 's' : ''})`
  }
  return `${qtd} ${item.unidadeMedida.toLowerCase()}`
}

const formatarQuantidadeMinima = (item: ItemEstoque): string => {
  const qtd = Number(item.quantidadeMinima)
  if (item.unidadeMedida === 'CAIXA') {
    const unidades = converterParaUnidades(qtd, item.unidadeMedida)
    return `${unidades} unidades (${qtd} caixa${qtd !== 1 ? 's' : ''})`
  }
  return `${qtd} ${item.unidadeMedida.toLowerCase()}`
}

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
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string>('')

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
    return item.quantidadeAtual <= item.quantidadeMinima
  }

  const itensEstoqueBaixo = itens.filter(isEstoqueBaixo)

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
      <div className="px-4 py-6 sm:px-0">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-black">
              Gestão de <span className="text-orange-500">Estoque</span>
            </h1>
            <div className="flex gap-3">
              <button
                onClick={() => setShowHistoricoModal(true)}
                className="bg-black hover:bg-gray-800 text-white font-bold py-2 px-4 rounded-lg border-2 border-orange-500 shadow-lg transition-colors flex items-center gap-2"
                title="Ver histórico"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Histórico
              </button>
              <button
                onClick={() => {
                  setSelectedItem(null)
                  setShowModal(true)
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg border-2 border-black shadow-lg transition-colors"
              >
                + Novo Item
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className="bg-white border-2 border-black rounded-lg p-4 mb-6 shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <option value="UTENSILIOS">Utensílios</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mostrarEstoqueBaixo}
                    onChange={(e) => setMostrarEstoqueBaixo(e.target.checked)}
                    className="w-5 h-5 mr-2 border-2 border-black"
                  />
                  <span className="text-sm font-bold text-black">
                    Apenas estoque baixo
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Alerta de estoque baixo */}
          {itensEstoqueBaixo.length > 0 && !mostrarEstoqueBaixo && (
            <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 mb-6">
              <p className="text-red-700 font-bold">
                ⚠️ {itensEstoqueBaixo.length} item(ns) com estoque baixo!
              </p>
            </div>
          )}

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
                        Código
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">
                        Nome
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">
                        Categoria
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">
                        Quantidade
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">
                        Mínima
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-white uppercase">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {itens.map((item) => (
                      <tr
                        key={item.id}
                        className={isEstoqueBaixo(item) ? 'bg-red-50' : ''}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                          {item.codigo || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                          {item.nome}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-bold rounded ${getCategoriaColor(
                              item.categoria,
                            )}`}
                          >
                            {item.categoria}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`text-sm font-bold ${
                              isEstoqueBaixo(item)
                                ? 'text-red-600'
                                : 'text-black'
                            }`}
                          >
                            {formatarQuantidade(item)}
                            {isEstoqueBaixo(item) && ' ⚠️'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatarQuantidadeMinima(item)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                setSelectedItem(item)
                                setShowMovimentacaoModal(true)
                              }}
                              className="text-orange-500 hover:text-orange-600 transition-colors"
                              title="Movimentar estoque"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedItem(item)
                                setShowModal(true)
                              }}
                              className="text-blue-500 hover:text-blue-600 transition-colors"
                              title="Editar item"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedItem(item)
                                setShowDeleteModal(true)
                              }}
                              className="text-red-500 hover:text-red-600 transition-colors"
                              title="Excluir item"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
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
          <div className="bg-white border-2 border-red-500 rounded-lg p-8 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold mb-4 text-black">Confirmar Exclusão</h2>
            <p className="text-gray-700 mb-6">
              Tem certeza que deseja excluir o item <strong>{selectedItem.nome}</strong>?
              <br />
              <span className="text-sm text-gray-600">
                {selectedItem.codigo && `Código: ${selectedItem.codigo}`}
              </span>
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setSelectedItem(null)
                }}
                className="px-6 py-2 border-2 border-black text-black font-bold rounded-md hover:bg-gray-100"
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

      {/* Modal de Erro */}
      {errorMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-red-500 border-2 border-black rounded-lg p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                <span className="text-red-500 text-4xl font-bold">✕</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-white text-center">Erro</h2>
            <p className="text-white text-center mb-6">{errorMessage}</p>
            <div className="flex justify-center">
              <button
                onClick={() => setErrorMessage('')}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md border-2 border-black"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Sucesso */}
      {successMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-green-500 border-2 border-black rounded-lg p-8 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                <span className="text-green-500 text-4xl font-bold">✓</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-white text-center">Sucesso</h2>
            <p className="text-white text-center mb-6">{successMessage}</p>
            <div className="flex justify-center">
              <button
                onClick={() => setSuccessMessage('')}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-md border-2 border-black"
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

  const getTipoAcaoColor = (tipo: string) => {
    const colors: Record<string, string> = {
      CRIADO: 'bg-green-100 text-green-800',
      EDITADO: 'bg-blue-100 text-blue-800',
      REMOVIDO: 'bg-red-100 text-red-800',
      ENTRADA: 'bg-emerald-100 text-emerald-800',
      SAIDA: 'bg-orange-100 text-orange-800',
      AJUSTE: 'bg-yellow-100 text-yellow-800',
    }
    return colors[tipo] || 'bg-gray-100 text-gray-800'
  }

  const formatarData = (data: string) => {
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white border-2 border-black rounded-lg p-8 w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-black">Histórico de Estoque</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-black transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Filtros */}
        <div className="mb-6 p-4 bg-gray-50 border-2 border-black rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-black">Filtros</h3>
            <button
              onClick={limparFiltros}
              className="text-sm text-orange-500 hover:text-orange-600 font-medium underline"
            >
              Limpar Filtros
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Filtro por Tipo */}
            <div>
              <label className="block text-sm font-bold mb-2 text-black">Tipo de Ação</label>
              <select
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value)}
                className="w-full px-3 py-2 border-2 border-black rounded-md text-black bg-white"
              >
                <option value="">Todos</option>
                <option value="CRIADO">Criado</option>
                <option value="EDITADO">Editado</option>
                <option value="REMOVIDO">Removido</option>
                <option value="ENTRADA">Entrada</option>
                <option value="SAIDA">Saída</option>
                <option value="AJUSTE">Ajuste</option>
              </select>
            </div>

            {/* Data Inicial */}
            <div>
              <label className="block text-sm font-bold mb-2 text-black">Data Inicial</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full px-3 py-2 border-2 border-black rounded-md text-black bg-white"
              />
            </div>

            {/* Hora Inicial */}
            <div>
              <label className="block text-sm font-bold mb-2 text-black">Hora Inicial</label>
              <input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
                disabled={!dataInicio}
                className="w-full px-3 py-2 border-2 border-black rounded-md text-black bg-white disabled:bg-gray-200 disabled:cursor-not-allowed"
              />
            </div>

            {/* Data Final */}
            <div>
              <label className="block text-sm font-bold mb-2 text-black">Data Final</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                min={dataInicio || undefined}
                className="w-full px-3 py-2 border-2 border-black rounded-md text-black bg-white"
              />
            </div>

            {/* Hora Final */}
            <div>
              <label className="block text-sm font-bold mb-2 text-black">Hora Final</label>
              <input
                type="time"
                value={horaFim}
                onChange={(e) => setHoraFim(e.target.value)}
                disabled={!dataFim}
                className="w-full px-3 py-2 border-2 border-black rounded-md text-black bg-white disabled:bg-gray-200 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Lista de Histórico */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Carregando histórico...</p>
          </div>
        ) : historico.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Nenhum registro encontrado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {historico.map((registro: any) => (
              <div
                key={registro.id}
                className="border-2 border-black rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-1 text-xs font-bold rounded ${getTipoAcaoColor(
                        registro.tipoAcao,
                      )}`}
                    >
                      {registro.tipoAcao}
                    </span>
                    {registro.itemEstoque && (
                      <span className="text-sm font-medium text-black">
                        {registro.itemEstoque.nome} ({registro.itemEstoque.codigo})
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-600">{formatarData(registro.registradoEm)}</span>
                </div>
                <p className="text-sm text-gray-700 mb-2">{registro.descricao}</p>
                <div className="flex justify-between items-center text-xs text-gray-600">
                  <span>
                    Por: <strong>{registro.registradoPor.nome}</strong>
                  </span>
                  {registro.quantidade && (
                    <span>
                      Quantidade: <strong>{Number(registro.quantidade)}</strong>
                    </span>
                  )}
                </div>
                {registro.motivo && (
                  <p className="text-xs text-gray-500 mt-1">
                    <strong>Motivo:</strong> {registro.motivo}
                  </p>
                )}
                {registro.observacoes && (
                  <p className="text-xs text-gray-500 mt-1">
                    <strong>Observações:</strong> {registro.observacoes}
                  </p>
                )}
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
    fornecedor: '',
    observacoes: '',
  })
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string>('')

  useEffect(() => {
    if (item) {
      setFormData({
        nome: item.nome,
        categoria: item.categoria,
        unidadeMedida: item.unidadeMedida,
        quantidadeAtual: item.quantidadeAtual,
        quantidadeMinima: item.quantidadeMinima,
        fornecedor: item.fornecedor || '',
        observacoes: item.observacoes || '',
      })
    } else {
      // Reset form quando criar novo item
      setFormData({
        nome: '',
        categoria: 'BEBIDAS',
        unidadeMedida: 'UNIDADE',
        quantidadeAtual: 0,
        quantidadeMinima: 0,
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
        // Na edição, pode alterar nome, categoria, unidade, quantidades, fornecedor e observações
        data = {
          nome: formData.nome,
          categoria: formData.categoria,
          unidadeMedida: formData.unidadeMedida,
          quantidadeAtual: formData.quantidadeAtual,
          quantidadeMinima: formData.quantidadeMinima,
          fornecedor: formData.fornecedor || undefined,
          observacoes: formData.observacoes || undefined,
        }
        await api.patch(`/estoque/itens/${item.id}`, data)
      } else {
        // Na criação, todos os campos podem ser enviados
        data = {
          ...formData,
        }
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
      <div className="bg-white border-2 border-black rounded-lg p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <h2 className="text-2xl font-bold mb-6 text-black">
          {item ? 'Editar Item' : 'Novo Item'}
        </h2>
        {item && (
          <div className="mb-4 p-3 bg-gray-50 border-2 border-black rounded-md">
            <p className="text-sm text-gray-700">
              <strong>Código:</strong> {item.codigo} (gerado automaticamente)
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1 text-black">Nome *</label>
            <input
              type="text"
              required
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className="w-full px-3 py-2 border-2 border-black rounded-md text-black bg-white placeholder-gray-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1 text-black">Categoria *</label>
              <select
                required
                value={formData.categoria}
                onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                className="w-full px-3 py-2 border-2 border-black rounded-md text-black bg-white"
              >
                <option value="BEBIDAS">Bebidas</option>
                <option value="ALIMENTOS">Alimentos</option>
                <option value="UTENSILIOS">Utensílios</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold mb-1 text-black">Unidade *</label>
              <select
                required
                value={formData.unidadeMedida}
                onChange={(e) => setFormData({ ...formData, unidadeMedida: e.target.value })}
                className="w-full px-3 py-2 border-2 border-black rounded-md text-black bg-white"
              >
                <option value="UNIDADE">Unidade</option>
                <option value="LITRO">Litro</option>
                <option value="GRAMA">Grama</option>
                <option value="CAIXA">Caixa</option>
                <option value="PACOTE">Pacote</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold mb-1 text-black">Quantidade Atual</label>
              <input
                type="number"
                step="0.001"
                value={formData.quantidadeAtual}
                onChange={(e) =>
                  setFormData({ ...formData, quantidadeAtual: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border-2 border-black rounded-md text-black bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1 text-black">Quantidade Mínima</label>
              <input
                type="number"
                step="0.001"
                value={formData.quantidadeMinima}
                onChange={(e) =>
                  setFormData({ ...formData, quantidadeMinima: parseFloat(e.target.value) || 0 })
                }
                className="w-full px-3 py-2 border-2 border-black rounded-md text-black bg-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1 text-black">Fornecedor</label>
            <input
              type="text"
              value={formData.fornecedor}
              onChange={(e) => setFormData({ ...formData, fornecedor: e.target.value })}
              className="w-full px-3 py-2 border-2 border-black rounded-md text-black bg-white placeholder-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1 text-black">Observações</label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="w-full px-3 py-2 border-2 border-black rounded-md text-black bg-white"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border-2 border-black text-black font-bold rounded-md hover:bg-gray-100"
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

        {/* Modal de Erro */}
        {errorMessage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-red-500 border-2 border-black rounded-lg p-8 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                  <span className="text-red-500 text-4xl font-bold">✕</span>
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-4 text-white text-center">Erro</h2>
              <p className="text-white text-center mb-6">{errorMessage}</p>
              <div className="flex justify-center">
                <button
                  onClick={() => setErrorMessage('')}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md border-2 border-black"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Sucesso */}
        {successMessage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-green-500 border-2 border-black rounded-lg p-8 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                  <span className="text-green-500 text-4xl font-bold">✓</span>
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-4 text-white text-center">Sucesso</h2>
              <p className="text-white text-center mb-6">{successMessage}</p>
              <div className="flex justify-center">
                <button
                  onClick={() => setSuccessMessage('')}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-md border-2 border-black"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
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
  const [formData, setFormData] = useState({
    tipo: 'ENTRADA',
    quantidade: '',
    motivo: '',
    observacoes: '',
  })
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string>('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/estoque/movimentacoes', {
        itemEstoqueId: item.id,
        tipo: formData.tipo,
        quantidade: parseFloat(formData.quantidade),
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
      <div className="bg-white border-2 border-black rounded-lg p-8 w-full max-w-md shadow-2xl">
        <h2 className="text-2xl font-bold mb-4 text-black">Movimentar Estoque</h2>
        <p className="text-sm text-gray-600 mb-6">
          <strong>Item:</strong> {item.nome} ({item.codigo})
          <br />
          <strong>Quantidade Atual:</strong> {formatarQuantidade(item)}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold mb-1 text-black">Tipo *</label>
            <select
              required
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              className="w-full px-3 py-2 border-2 border-black rounded-md text-black bg-white"
            >
              <option value="ENTRADA">Entrada</option>
              <option value="SAIDA">Saída</option>
              <option value="AJUSTE">Ajuste</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold mb-1 text-black">Quantidade *</label>
            <input
              type="number"
              step="0.001"
              required
              value={formData.quantidade}
              onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
              className="w-full px-3 py-2 border-2 border-black rounded-md text-black bg-white placeholder-gray-400"
              placeholder={
                item.unidadeMedida === 'CAIXA'
                  ? `Em ${item.unidadeMedida.toLowerCase()} (1 caixa = 12 unidades)`
                  : `Em ${item.unidadeMedida.toLowerCase()}`
              }
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1 text-black">Motivo</label>
            <input
              type="text"
              value={formData.motivo}
              onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
              className="w-full px-3 py-2 border-2 border-black rounded-md text-black bg-white placeholder-gray-400"
              placeholder="Ex: Compra, Uso, Perda..."
            />
          </div>
          <div>
            <label className="block text-sm font-bold mb-1 text-black">Observações</label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="w-full px-3 py-2 border-2 border-black rounded-md text-black bg-white"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border-2 border-black text-black font-bold rounded-md hover:bg-gray-100"
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

        {/* Modal de Erro */}
        {errorMessage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-red-500 border-2 border-black rounded-lg p-8 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                  <span className="text-red-500 text-4xl font-bold">✕</span>
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-4 text-white text-center">Erro</h2>
              <p className="text-white text-center mb-6">{errorMessage}</p>
              <div className="flex justify-center">
                <button
                  onClick={() => setErrorMessage('')}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-md border-2 border-black"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Sucesso */}
        {successMessage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-green-500 border-2 border-black rounded-lg p-8 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                  <span className="text-green-500 text-4xl font-bold">✓</span>
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-4 text-white text-center">Sucesso</h2>
              <p className="text-white text-center mb-6">{successMessage}</p>
              <div className="flex justify-center">
                <button
                  onClick={() => setSuccessMessage('')}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-md border-2 border-black"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
