'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import api from '@/lib/api'

interface Garcom {
  id: string
  nome: string
  email: string
  tipo: string
  ativo: boolean
  podeRemoverTaxaServico: boolean
  criadoEm: string
}

interface MetricasGarcom {
  periodo: string
  faturamentoTotal: number
  totalPedidos: number
  pedidosCancelados: number
  taxaCancelamento: number
  mesasAtendidas: number
  ticketMedioPorMesa: number
  vendasPorSetor: Array<{
    setor: string
    valor: number
    quantidade: number
    percentual: number
  }>
}

type Periodo = 'hoje' | 'semana' | 'mes'

const PERIODO_LABELS: Record<Periodo, string> = {
  hoje: 'Hoje',
  semana: 'Últimos 7 dias',
  mes: 'Este mês',
}

export default function GarconsPage() {
  const [garcons, setGarcons] = useState<Garcom[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando] = useState<Garcom | null>(null)
  const [formData, setFormData] = useState({ nome: '', email: '', senha: '', podeRemoverTaxaServico: false })
  const [formError, setFormError] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const [garcomSelecionado, setGarcomSelecionado] = useState<Garcom | null>(null)
  const [metricas, setMetricas] = useState<MetricasGarcom | null>(null)
  const [metricasLoading, setMetricasLoading] = useState(false)
  const [periodo, setPeriodo] = useState<Periodo>('mes')

  useEffect(() => {
    loadGarcons()
  }, [])

  useEffect(() => {
    if (garcomSelecionado) {
      loadMetricas(garcomSelecionado.id, periodo)
    }
  }, [garcomSelecionado, periodo])

  const loadGarcons = async () => {
    try {
      setLoading(true)
      const response = await api.get('/users/garcons')
      setGarcons(response.data)
    } catch (error: any) {
      setErrorMessage('Erro ao carregar garçons')
    } finally {
      setLoading(false)
    }
  }

  const loadMetricas = async (id: string, p: Periodo) => {
    try {
      setMetricasLoading(true)
      const response = await api.get(`/users/${id}/metricas?periodo=${p}`)
      setMetricas(response.data)
    } catch {
      setMetricas(null)
    } finally {
      setMetricasLoading(false)
    }
  }

  const abrirCriar = () => {
    setEditando(null)
    setFormData({ nome: '', email: '', senha: '', podeRemoverTaxaServico: false })
    setFormError(null)
    setShowModal(true)
  }

  const abrirEditar = (g: Garcom) => {
    setEditando(g)
    setFormData({ nome: g.nome, email: g.email, senha: '', podeRemoverTaxaServico: g.podeRemoverTaxaServico })
    setFormError(null)
    setShowModal(true)
  }

  const salvar = async () => {
    if (!formData.nome.trim() || !formData.email.trim()) {
      setFormError('Nome e email são obrigatórios')
      return
    }
    if (!editando && formData.senha.length < 6) {
      setFormError('Senha deve ter no mínimo 6 caracteres')
      return
    }

    try {
      setSalvando(true)
      setFormError(null)

      if (editando) {
        const payload: any = {
          nome: formData.nome,
          email: formData.email,
          podeRemoverTaxaServico: formData.podeRemoverTaxaServico,
        }
        if (formData.senha) payload.senha = formData.senha
        await api.patch(`/users/${editando.id}`, payload)
      } else {
        await api.post('/users', {
          nome: formData.nome,
          email: formData.email,
          senha: formData.senha,
          tipo: 'GARCOM',
          podeRemoverTaxaServico: formData.podeRemoverTaxaServico,
        })
      }

      setShowModal(false)
      await loadGarcons()
    } catch (error: any) {
      setFormError(error.response?.data?.message || 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  const [garcomParaRemover, setGarcomParaRemover] = useState<Garcom | null>(null)
  const [removendo, setRemovendo] = useState(false)

  const removerGarcom = async () => {
    if (!garcomParaRemover || removendo) return
    setRemovendo(true)
    try {
      await api.delete(`/users/${garcomParaRemover.id}`)
      setGarcomParaRemover(null)
      if (garcomSelecionado?.id === garcomParaRemover.id) setGarcomSelecionado(null)
      await loadGarcons()
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Erro ao remover garçom')
      setGarcomParaRemover(null)
    } finally {
      setRemovendo(false)
    }
  }

  const toggleAtivo = async (g: Garcom) => {
    try {
      await api.patch(`/users/${g.id}`, { ativo: !g.ativo })
      await loadGarcons()
      if (garcomSelecionado?.id === g.id) {
        setGarcomSelecionado((prev) => prev ? { ...prev, ativo: !prev.ativo } : null)
      }
    } catch {
      setErrorMessage('Erro ao alterar status')
    }
  }

  const formatCurrency = (valor: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)

  const SETOR_COLORS: Record<string, string> = {
    CHAPA: 'bg-orange-100 text-orange-800',
    COZINHA: 'bg-green-100 text-green-800',
    BAR: 'bg-blue-100 text-blue-800',
  }

  return (
    <Layout>
      <div className="py-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Gestão de Garçons</h1>
          <button
            onClick={abrirCriar}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Novo Garçom
          </button>
        </div>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{errorMessage}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de garçons */}
          <div className="lg:col-span-1">
            <div className="bg-surface rounded-lg shadow overflow-hidden">
              <div className="px-4 py-3 border-b bg-surface-alt">
                <h2 className="font-semibold text-text-muted">
                  Garçons ({garcons.length})
                </h2>
              </div>

              {loading ? (
                <div className="p-8 text-center text-text-subtle">Carregando...</div>
              ) : garcons.length === 0 ? (
                <div className="p-8 text-center text-text-subtle">
                  Nenhum garçom cadastrado
                </div>
              ) : (
                <ul className="divide-y">
                  {garcons.map((g) => (
                    <li
                      key={g.id}
                      className={`p-4 cursor-pointer hover:bg-surface-hover transition-colors ${
                        garcomSelecionado?.id === g.id ? 'bg-orange-50 border-l-4 border-orange-500' : ''
                      }`}
                      onClick={() => setGarcomSelecionado(g)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate ${garcomSelecionado?.id === g.id ? 'text-gray-800' : 'text-text'}`}>{g.nome}</p>
                          <p className={`text-sm truncate ${garcomSelecionado?.id === g.id ? 'text-gray-500' : 'text-text-subtle'}`}>{g.email}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                          {g.podeRemoverTaxaServico && (
                            <span
                              className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700"
                              title="Pode retirar a taxa de serviço ao fechar conta"
                            >
                              Pode retirar taxa
                            </span>
                          )}
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              g.ativo
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {g.ativo ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); abrirEditar(g) }}
                          className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleAtivo(g) }}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                            g.ativo
                              ? 'text-danger bg-danger-light hover:bg-danger/20'
                              : 'text-success bg-success-light hover:bg-success/20'
                          }`}
                        >
                          {g.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setGarcomParaRemover(g) }}
                          className="px-2.5 py-1 text-xs font-medium text-text-muted bg-surface-hover hover:bg-border rounded-md transition-colors"
                        >
                          Remover
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Métricas */}
          <div className="lg:col-span-2">
            {!garcomSelecionado ? (
              <div className="bg-surface rounded-lg shadow p-12 text-center text-text-subtle">
                <p className="text-lg">Selecione um garçom para ver as métricas</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-surface rounded-lg shadow p-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h2 className="text-xl font-bold text-text">{garcomSelecionado.nome}</h2>
                      <p className="text-sm text-text-subtle">{garcomSelecionado.email}</p>
                    </div>
                    <div className="flex gap-2">
                      {(Object.keys(PERIODO_LABELS) as Periodo[]).map((p) => (
                        <button
                          key={p}
                          onClick={() => setPeriodo(p)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            periodo === p
                              ? 'bg-orange-500 text-white'
                              : 'bg-surface-hover text-text-muted hover:bg-border'
                          }`}
                        >
                          {PERIODO_LABELS[p]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {metricasLoading ? (
                  <div className="bg-surface rounded-lg shadow p-8 text-center text-text-subtle">
                    Carregando métricas...
                  </div>
                ) : metricas ? (
                  <>
                    {/* Cards de métricas */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-surface rounded-lg shadow p-4">
                        <p className="text-sm text-text-subtle">Faturamento Total</p>
                        <p className="text-2xl font-bold text-green-700">
                          {formatCurrency(metricas.faturamentoTotal)}
                        </p>
                        <p className="text-xs text-text-subtle mt-1">{PERIODO_LABELS[periodo]}</p>
                      </div>
                      <div className="bg-surface rounded-lg shadow p-4">
                        <p className="text-sm text-text-subtle">Ticket Médio / Mesa</p>
                        <p className="text-2xl font-bold text-purple-700">
                          {formatCurrency(metricas.ticketMedioPorMesa)}
                        </p>
                        <p className="text-xs text-text-subtle mt-1">por sessão aberta</p>
                      </div>
                      <div className="bg-surface rounded-lg shadow p-4">
                        <p className="text-sm text-text-subtle">Mesas Atendidas</p>
                        <p className="text-2xl font-bold text-gray-800">
                          {metricas.mesasAtendidas}
                        </p>
                        <p className="text-xs text-text-subtle mt-1">sessões abertas</p>
                      </div>
                      <div className="bg-surface rounded-lg shadow p-4">
                        <p className="text-sm text-text-subtle">Pedidos Registrados</p>
                        <p className="text-2xl font-bold text-gray-800">
                          {metricas.totalPedidos}
                        </p>
                        <p className="text-xs text-text-subtle mt-1">itens confirmados</p>
                      </div>
                      <div className={`bg-surface rounded-lg shadow p-4 ${metricas.pedidosCancelados > 0 ? 'border-l-4 border-red-400' : ''}`}>
                        <p className="text-sm text-text-subtle">Cancelamentos</p>
                        <p className="text-2xl font-bold text-red-600">
                          {metricas.pedidosCancelados}
                        </p>
                        <p className="text-xs text-text-subtle mt-1">
                          {metricas.taxaCancelamento}% do total de itens
                        </p>
                      </div>
                    </div>

                    {/* Vendas por setor */}
                    {metricas.vendasPorSetor.length > 0 && (
                      <div className="bg-surface rounded-lg shadow p-4">
                        <h3 className="font-semibold mb-3 text-text-muted">
                          Vendas por Setor
                        </h3>
                        <div className="space-y-3">
                          {metricas.vendasPorSetor.map((s) => (
                            <div key={s.setor}>
                              <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                      SETOR_COLORS[s.setor] ?? 'bg-gray-100 text-gray-700'
                                    }`}
                                  >
                                    {s.setor}
                                  </span>
                                  <span className="text-sm text-text-subtle">
                                    {s.quantidade} itens
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-gray-800">
                                    {formatCurrency(s.valor)}
                                  </span>
                                  <span className="text-xs text-text-subtle ml-2">
                                    {s.percentual}%
                                  </span>
                                </div>
                              </div>
                              <div className="w-full bg-surface-hover rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-orange-500 h-2 rounded-full transition-all"
                                  style={{ width: `${Math.min(s.percentual, 100)}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {metricas.faturamentoTotal === 0 && (
                      <div className="bg-surface rounded-lg shadow p-8 text-center text-text-subtle">
                        Nenhum pedido registrado no período selecionado
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-surface rounded-lg shadow p-8 text-center text-text-subtle">
                    Erro ao carregar métricas
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal confirmar remoção */}
      {garcomParaRemover && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-text mb-2">Remover Garçom</h2>
            <p className="text-sm text-text-muted mb-6">
              Tem certeza que deseja remover <strong>{garcomParaRemover.nome}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setGarcomParaRemover(null)}
                disabled={removendo}
                className="flex-1 py-2 border border-border rounded-lg text-sm font-medium text-text-muted hover:bg-surface-hover transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={removerGarcom}
                disabled={removendo}
                className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {removendo ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal criar/editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">
                {editando ? 'Editar Garçom' : 'Novo Garçom'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm">{formError}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData((f) => ({ ...f, nome: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-muted mb-1">
                  {editando ? 'Nova Senha (deixe em branco para manter)' : 'Senha'}
                </label>
                <input
                  type="password"
                  value={formData.senha}
                  onChange={(e) => setFormData((f) => ({ ...f, senha: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder={editando ? '••••••' : 'Mínimo 6 caracteres'}
                />
              </div>
              <label className="flex items-center gap-2 p-3 border rounded-lg bg-surface-alt cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.podeRemoverTaxaServico}
                  onChange={(e) => setFormData((f) => ({ ...f, podeRemoverTaxaServico: e.target.checked }))}
                  className="w-4 h-4 accent-orange-500"
                />
                <span className="text-sm font-medium text-text-muted">
                  Pode retirar a taxa de serviço (10%) ao fechar conta
                </span>
              </label>
            </div>
            <div className="p-6 border-t flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                disabled={salvando}
                className="px-4 py-2 rounded-lg border border-border text-text-muted hover:bg-surface-hover transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando}
                className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium transition-colors disabled:opacity-50"
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
