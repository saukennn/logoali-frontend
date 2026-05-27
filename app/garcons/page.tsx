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
  const [formData, setFormData] = useState({ nome: '', email: '', senha: '' })
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
    setFormData({ nome: '', email: '', senha: '' })
    setFormError(null)
    setShowModal(true)
  }

  const abrirEditar = (g: Garcom) => {
    setEditando(g)
    setFormData({ nome: g.nome, email: g.email, senha: '' })
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
        const payload: any = { nome: formData.nome, email: formData.email }
        if (formData.senha) payload.senha = formData.senha
        await api.patch(`/users/${editando.id}`, payload)
      } else {
        await api.post('/users', {
          nome: formData.nome,
          email: formData.email,
          senha: formData.senha,
          tipo: 'GARCOM',
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
      <div className="py-6">
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
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-4 py-3 border-b bg-gray-50">
                <h2 className="font-semibold text-gray-700">
                  Garçons ({garcons.length})
                </h2>
              </div>

              {loading ? (
                <div className="p-8 text-center text-gray-500">Carregando...</div>
              ) : garcons.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  Nenhum garçom cadastrado
                </div>
              ) : (
                <ul className="divide-y">
                  {garcons.map((g) => (
                    <li
                      key={g.id}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        garcomSelecionado?.id === g.id ? 'bg-orange-50 border-l-4 border-orange-500' : ''
                      }`}
                      onClick={() => setGarcomSelecionado(g)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{g.nome}</p>
                          <p className="text-sm text-gray-500 truncate">{g.email}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
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
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); abrirEditar(g) }}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Editar
                        </button>
                        <span className="text-gray-300">|</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleAtivo(g) }}
                          className={`text-xs hover:underline ${
                            g.ativo ? 'text-red-600' : 'text-green-600'
                          }`}
                        >
                          {g.ativo ? 'Desativar' : 'Ativar'}
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
              <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">
                <p className="text-lg">Selecione um garçom para ver as métricas</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h2 className="text-xl font-bold">{garcomSelecionado.nome}</h2>
                      <p className="text-sm text-gray-500">{garcomSelecionado.email}</p>
                    </div>
                    <div className="flex gap-2">
                      {(Object.keys(PERIODO_LABELS) as Periodo[]).map((p) => (
                        <button
                          key={p}
                          onClick={() => setPeriodo(p)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            periodo === p
                              ? 'bg-orange-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {PERIODO_LABELS[p]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {metricasLoading ? (
                  <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
                    Carregando métricas...
                  </div>
                ) : metricas ? (
                  <>
                    {/* Cards de métricas */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-500">Faturamento Total</p>
                        <p className="text-2xl font-bold text-green-700">
                          {formatCurrency(metricas.faturamentoTotal)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{PERIODO_LABELS[periodo]}</p>
                      </div>
                      <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-500">Ticket Médio / Mesa</p>
                        <p className="text-2xl font-bold text-purple-700">
                          {formatCurrency(metricas.ticketMedioPorMesa)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">por sessão aberta</p>
                      </div>
                      <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-500">Mesas Atendidas</p>
                        <p className="text-2xl font-bold text-gray-800">
                          {metricas.mesasAtendidas}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">sessões abertas</p>
                      </div>
                      <div className="bg-white rounded-lg shadow p-4">
                        <p className="text-sm text-gray-500">Pedidos Registrados</p>
                        <p className="text-2xl font-bold text-gray-800">
                          {metricas.totalPedidos}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">itens confirmados</p>
                      </div>
                      <div className={`bg-white rounded-lg shadow p-4 ${metricas.pedidosCancelados > 0 ? 'border-l-4 border-red-400' : ''}`}>
                        <p className="text-sm text-gray-500">Cancelamentos</p>
                        <p className="text-2xl font-bold text-red-600">
                          {metricas.pedidosCancelados}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {metricas.taxaCancelamento}% do total de itens
                        </p>
                      </div>
                    </div>

                    {/* Vendas por setor */}
                    {metricas.vendasPorSetor.length > 0 && (
                      <div className="bg-white rounded-lg shadow p-4">
                        <h3 className="font-semibold mb-3 text-gray-700">
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
                                  <span className="text-sm text-gray-500">
                                    {s.quantidade} itens
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-gray-800">
                                    {formatCurrency(s.valor)}
                                  </span>
                                  <span className="text-xs text-gray-500 ml-2">
                                    {s.percentual}%
                                  </span>
                                </div>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
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
                      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
                        Nenhum pedido registrado no período selecionado
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
                    Erro ao carregar métricas
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal criar/editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
            </div>
            <div className="p-6 border-t flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                disabled={salvando}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
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
