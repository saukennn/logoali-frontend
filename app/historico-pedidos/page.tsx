'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import api from '@/lib/api'
import { statusPedido } from '@/lib/statusPedido'

interface PedidoHistorico {
  id: string
  quantidade: number
  valorUnitario: number
  status: string
  entregue: boolean
  motivoCancelamento: string | null
  observacao: string | null
  nomeCliente: string | null
  criadoEm: string
  canceladoEm: string | null
  setor: string
  produto: { nome: string }
  adicionais: { adicional: { nome: string }; valorUnitario: number }[]
  criadoPor: { nome: string } | null
  canceladoPor: { nome: string } | null
  contaClienteMesa: {
    apelido: string
    sessaoMesa: { mesa: { numero: number }; garcom: { nome: string } }
  } | null
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const SETOR_COLORS: Record<string, string> = {
  CHAPA: 'bg-orange-100 text-orange-800',
  COZINHA: 'bg-green-100 text-green-800',
  BAR: 'bg-blue-100 text-blue-800',
}

export default function HistoricoPedidosPage() {
  const [pedidos, setPedidos] = useState<PedidoHistorico[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState<string>('')
  const [filtroOrigem, setFiltroOrigem] = useState<string>('')

  const hoje = new Date()
  const [data, setData] = useState(
    `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
  )

  useEffect(() => { load() }, [data])

  const load = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/pedidos/historico-dia?data=${data}`)
      setPedidos(res.data)
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
    } finally {
      setLoading(false)
    }
  }

  const valorTotal = (p: PedidoHistorico) => {
    const ads = p.adicionais.reduce((s, a) => s + Number(a.valorUnitario), 0)
    return (Number(p.valorUnitario) + ads) * p.quantidade
  }

  const origem = (p: PedidoHistorico) => (p.contaClienteMesa ? 'mesa' : 'balcao')

  // Status unificado para filtro: PENDENTE | ENTREGUE | CANCELADO
  const statusUnificado = (p: PedidoHistorico) =>
    p.status === 'CANCELADO' ? 'CANCELADO' : p.entregue ? 'ENTREGUE' : 'PENDENTE'

  const filtrados = pedidos.filter((p) => {
    const matchStatus = !filtroStatus || statusUnificado(p) === filtroStatus
    const matchOrigem = !filtroOrigem || origem(p) === filtroOrigem
    return matchStatus && matchOrigem
  })

  const totalAtivos = pedidos.filter((p) => p.status !== 'CANCELADO')
  const totalEntregues = pedidos.filter((p) => p.status !== 'CANCELADO' && p.entregue)
  const totalCancelados = pedidos.filter((p) => p.status === 'CANCELADO')
  const faturamento = totalAtivos.reduce((acc, p) => acc + valorTotal(p), 0)

  return (
    <Layout>
      <div className="py-6 max-w-7xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text">Histórico de Pedidos do Dia</h1>
            <p className="text-sm text-text-subtle mt-0.5">Todos os pedidos (ativos e cancelados)</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-text-muted">Data</label>
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              className="px-3 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
          <div className="bg-surface border border-border rounded-xl p-3">
            <p className="text-xs font-semibold uppercase text-text-subtle mb-1">Total</p>
            <p className="text-xl font-bold text-text">{pedidos.length}</p>
          </div>
          <div className="bg-surface border-2 border-warning/40 rounded-xl p-3">
            <p className="text-xs font-semibold uppercase text-warning-dark mb-1">Pendentes</p>
            <p className="text-xl font-bold text-warning-dark">{totalAtivos.length - totalEntregues.length}</p>
          </div>
          <div className="bg-surface border-2 border-success/40 rounded-xl p-3">
            <p className="text-xs font-semibold uppercase text-success-dark mb-1">Entregues</p>
            <p className="text-xl font-bold text-success-dark">{totalEntregues.length}</p>
          </div>
          <div className="bg-surface border-2 border-danger/40 rounded-xl p-3">
            <p className="text-xs font-semibold uppercase text-danger-dark mb-1">Cancelados</p>
            <p className="text-xl font-bold text-danger-dark">{totalCancelados.length}</p>
          </div>
          <div className="bg-surface border-2 border-brand-300 rounded-xl p-3">
            <p className="text-xs font-semibold uppercase text-brand-700 mb-1">Faturamento</p>
            <p className="text-xl font-bold text-brand-700">{fmt(faturamento)}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-surface border border-border rounded-xl p-4 mb-5 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5 text-text-muted">Status</label>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-surface"
              >
                <option value="">Todos</option>
                <option value="PENDENTE">Pendentes</option>
                <option value="ENTREGUE">Entregues</option>
                <option value="CANCELADO">Cancelados</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5 text-text-muted">Origem</label>
              <select
                value={filtroOrigem}
                onChange={(e) => setFiltroOrigem(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-surface"
              >
                <option value="">Todas</option>
                <option value="mesa">Mesa</option>
                <option value="balcao">Balcão</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-12 text-center shadow-sm">
            <p className="text-text-subtle text-sm">Nenhum pedido encontrado</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtrados.map((p) => (
              <div
                key={p.id}
                className={`border-2 rounded-xl p-4 shadow-sm bg-surface ${
                  p.status === 'CANCELADO' ? 'border-red-300 dark:border-red-700' : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`font-semibold ${p.status === 'CANCELADO' ? 'text-text-muted line-through' : 'text-text'}`}>
                        {p.quantidade}x {p.produto.nome}
                      </span>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded ${SETOR_COLORS[p.setor] ?? 'bg-gray-100 text-gray-700'}`}>
                        {p.setor}
                      </span>
                      {(() => {
                        const st = statusPedido(p)
                        return (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full ${st.chip}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                          </span>
                        )
                      })()}
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${p.contaClienteMesa ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {p.contaClienteMesa ? `Mesa ${p.contaClienteMesa.sessaoMesa.mesa.numero}` : 'Balcão'}
                      </span>
                    </div>

                    {p.adicionais.length > 0 && (
                      <p className="text-xs text-text-subtle">+ {p.adicionais.map((a) => a.adicional.nome).join(', ')}</p>
                    )}
                    {p.contaClienteMesa && (
                      <p className="text-xs text-text-subtle">Conta: {p.contaClienteMesa.apelido}</p>
                    )}
                    {p.nomeCliente && (
                      <p className="text-xs text-blue-600 dark:text-blue-400">👤 {p.nomeCliente}</p>
                    )}
                    {p.observacao && (
                      <p className="text-xs text-text-subtle">Obs: {p.observacao}</p>
                    )}

                    <div className="flex items-center gap-3 mt-1.5 text-xs flex-wrap text-text-subtle">
                      <span>{new Date(p.criadoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      <span>•</span>
                      <span>Por: <strong className="text-text-muted">{p.criadoPor?.nome || (p.contaClienteMesa?.sessaoMesa.garcom.nome ?? '—')}</strong></span>
                    </div>

                    {p.status === 'CANCELADO' && p.motivoCancelamento && (
                      <div className="mt-2 text-xs text-red-700 dark:text-red-400 bg-surface-alt border border-red-300 dark:border-red-700 rounded px-2 py-1 inline-block">
                        Cancelado por {p.canceladoPor?.nome || '—'}: {p.motivoCancelamento}
                      </div>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className={`font-bold ${p.status === 'CANCELADO' ? 'text-text-subtle line-through' : 'text-orange-600'}`}>
                      {fmt(valorTotal(p))}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
