'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import api from '@/lib/api'
import { getUser } from '@/lib/auth'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'

interface KPIs {
  mesasOcupadas: number
  mesasTotal: number
  caixaStatus: 'ABERTO' | 'FECHADO' | null
  saldoAtual: number | null
  pedidosPendentes: number
  faturamentoMes: number
}

interface ComparativoItem {
  label: string
  mesAtual: number
  mesAnterior: number
}

function saudacao(nome: string, hora: number) {
  const periodo = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  return `${periodo}, ${nome.split(' ')[0]}`
}

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatCurrencyShort(value: number) {
  if (value >= 1000) return `R$${(value / 1000).toFixed(1)}k`
  return `R$${value.toFixed(0)}`
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="font-medium">
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  )
}

function KpiCard({ label, value, sub, color, icon, onClick }: {
  label: string; value: string; sub?: string
  color: 'orange' | 'green' | 'blue' | 'red' | 'gray'
  icon: React.ReactNode; onClick?: () => void
}) {
  const iconColors = {
    orange: 'bg-orange-50 text-orange-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    gray: 'bg-gray-50 text-gray-500',
  }
  return (
    <div onClick={onClick}
      className={`bg-white rounded-xl border border-gray-200 p-4 shadow-sm
        ${onClick ? 'cursor-pointer hover:shadow-md hover:border-orange-200 transition-all' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-500 truncate">{label}</p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
        <div className={`p-2 rounded-lg flex-shrink-0 ${iconColors[color]}`}>{icon}</div>
      </div>
    </div>
  )
}

function QuickAction({ label, icon, onClick, primary }: {
  label: string; icon: React.ReactNode; onClick: () => void; primary?: boolean
}) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all border
        ${primary
          ? 'bg-orange-500 text-white border-orange-500 hover:bg-orange-600'
          : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50'
        }`}>
      {icon}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const user = getUser()
  const isAdmin = user?.tipo === 'ADMIN'

  const [kpis, setKpis] = useState<KPIs>({
    mesasOcupadas: 0, mesasTotal: 0, caixaStatus: null,
    saldoAtual: null, pedidosPendentes: 0, faturamentoMes: 0,
  })
  const [comparativo, setComparativo] = useState<ComparativoItem[]>([])
  const [labelMesAtual, setLabelMesAtual] = useState('')
  const [labelMesAnterior, setLabelMesAnterior] = useState('')
  const [loadingKpis, setLoadingKpis] = useState(true)
  const [loadingChart, setLoadingChart] = useState(true)
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => { setNow(new Date()) }, [])

  const loadKpis = useCallback(async () => {
    setLoadingKpis(true)
    try {
      const n = new Date()
      const ano = n.getFullYear()
      const mes = n.getMonth() + 1
      const [mesasRes, caixaRes, pedidosRes, relatorioRes] = await Promise.allSettled([
        api.get('/mesas'),
        api.get('/caixas-diarios/atual'),
        api.get('/pedidos/balcao'),
        api.get(`/relatorios/mensal?ano=${ano}&mes=${mes}`),
      ])
      const mesas = mesasRes.status === 'fulfilled' ? mesasRes.value.data : []
      const caixa = caixaRes.status === 'fulfilled' ? caixaRes.value.data : null
      const pedidos = pedidosRes.status === 'fulfilled' ? pedidosRes.value.data : []
      const rel = relatorioRes.status === 'fulfilled' ? relatorioRes.value.data : null
      setKpis({
        mesasOcupadas: Array.isArray(mesas) ? mesas.filter((m: any) => m.status === 'OCUPADA').length : 0,
        mesasTotal: Array.isArray(mesas) ? mesas.length : 0,
        caixaStatus: caixa?.status ?? null,
        saldoAtual: caixa?.saldoAtual ?? caixa?.saldoInicial ?? null,
        pedidosPendentes: Array.isArray(pedidos) ? pedidos.filter((p: any) => p.status === 'PENDENTE').length : 0,
        faturamentoMes: rel?.resumo?.receitaTotal ?? 0,
      })
    } finally {
      setLoadingKpis(false)
    }
  }, [])

  const loadComparativo = useCallback(async () => {
    if (!isAdmin) return
    setLoadingChart(true)
    try {
      const n = new Date()
      const anoAtual = n.getFullYear()
      const mesAtual = n.getMonth() + 1
      const diaAtual = n.getDate()

      // Mês anterior
      const dataAnterior = new Date(n.getFullYear(), n.getMonth() - 1, 1)
      const anoAnterior = dataAnterior.getFullYear()
      const mesAnterior = dataAnterior.getMonth() + 1

      const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
      setLabelMesAtual(`${meses[mesAtual - 1]} (1–${diaAtual})`)
      setLabelMesAnterior(`${meses[mesAnterior - 1]} (1–${diaAtual})`)

      const [resAtual, resAnterior] = await Promise.allSettled([
        api.get(`/relatorios/mensal?ano=${anoAtual}&mes=${mesAtual}`),
        api.get(`/relatorios/mensal?ano=${anoAnterior}&mes=${mesAnterior}`),
      ])

      const atual = resAtual.status === 'fulfilled' ? resAtual.value.data : null
      const anterior = resAnterior.status === 'fulfilled' ? resAnterior.value.data : null

      // Constrói dados comparativos por setor
      const setoresAtual: Record<string, number> = {}
      const setoresAnterior: Record<string, number> = {}

      atual?.receitaPorSetor?.forEach((s: any) => { setoresAtual[s.setor] = s.valor })
      anterior?.receitaPorSetor?.forEach((s: any) => { setoresAnterior[s.setor] = s.valor })

      const todosSetores = Array.from(new Set([
        ...Object.keys(setoresAtual),
        ...Object.keys(setoresAnterior),
      ]))

      const items: ComparativoItem[] = [
        {
          label: 'Total Geral',
          mesAtual: atual?.resumo?.receitaTotal ?? 0,
          mesAnterior: anterior?.resumo?.receitaTotal ?? 0,
        },
        ...todosSetores.map(s => ({
          label: s,
          mesAtual: setoresAtual[s] ?? 0,
          mesAnterior: setoresAnterior[s] ?? 0,
        })),
      ]

      setComparativo(items)
    } finally {
      setLoadingChart(false)
    }
  }, [isAdmin])

  useEffect(() => {
    loadKpis()
    loadComparativo()
    const interval = setInterval(loadKpis, 60000)
    return () => clearInterval(interval)
  }, [loadKpis, loadComparativo])

  const iconMesas = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 10V6a1 1 0 011-1h16a1 1 0 011 1v4M3 10l2 10h14l2-10" />
    </svg>
  )
  const iconMoney = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 9v1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
  const iconCaixa = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
  const iconPedido = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )

  return (
    <Layout>
      <div className="py-6 max-w-5xl">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {user && now ? saudacao(user.nome, now.getHours()) : 'Bem-vindo'}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {now ? now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
            </p>
          </div>
          <button onClick={() => { loadKpis(); loadComparativo() }}
            className="text-gray-400 hover:text-orange-500 p-1.5 rounded-lg hover:bg-orange-50 transition-colors"
            title="Atualizar">
            <svg className={`w-5 h-5 ${loadingKpis ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <KpiCard label="Mesas ocupadas"
            value={loadingKpis ? '—' : `${kpis.mesasOcupadas}/${kpis.mesasTotal}`}
            sub="agora" color="orange" icon={iconMesas}
            onClick={() => router.push('/mesas')} />
          <KpiCard label="Faturamento do mês"
            value={loadingKpis ? '—' : formatCurrency(kpis.faturamentoMes)}
            sub="mês atual" color="green" icon={iconMoney} />
          <KpiCard label="Caixa"
            value={loadingKpis ? '—' : kpis.caixaStatus === 'ABERTO' ? 'Aberto' : kpis.caixaStatus === 'FECHADO' ? 'Fechado' : '—'}
            sub={kpis.saldoAtual != null ? `Saldo: ${formatCurrency(kpis.saldoAtual)}` : undefined}
            color={kpis.caixaStatus === 'ABERTO' ? 'green' : 'gray'} icon={iconCaixa}
            onClick={isAdmin ? () => router.push('/caixa') : undefined} />
          <KpiCard label="Pedidos pendentes"
            value={loadingKpis ? '—' : String(kpis.pedidosPendentes)}
            sub="no balcão" color={kpis.pedidosPendentes > 0 ? 'red' : 'blue'} icon={iconPedido}
            onClick={() => router.push('/balcao')} />
        </div>

        {/* Gráfico comparativo — admin only */}
        {isAdmin && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">Comparativo de Receita</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {labelMesAtual} vs {labelMesAnterior}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-orange-500 inline-block" />
                  {labelMesAtual || 'Mês atual'}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-sm bg-gray-200 inline-block" />
                  {labelMesAnterior || 'Mês anterior'}
                </span>
              </div>
            </div>

            {loadingChart ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-6 h-6 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : comparativo.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                Sem dados para comparar
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={comparativo} barCategoryGap="30%" barGap={4}
                  margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }}
                    axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={formatCurrencyShort}
                    tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
                  <Bar dataKey="mesAtual" name={labelMesAtual || 'Mês atual'}
                    fill="#f97316" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="mesAnterior" name={labelMesAnterior || 'Mês anterior'}
                    fill="#e5e7eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* Acesso Rápido */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Acesso rápido
          </h2>
          <div className="flex flex-wrap gap-2">
            <QuickAction label="Mesas" primary onClick={() => router.push('/mesas')}
              icon={iconMesas} />
            <QuickAction label="Balcão" onClick={() => router.push('/balcao')}
              icon={iconPedido} />
            {isAdmin && (
              <>
                <QuickAction label="Estoque" onClick={() => router.push('/estoque')}
                  icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>} />
                <QuickAction label="Financeiro" onClick={() => router.push('/financeiro')}
                  icon={iconMoney} />
                <QuickAction label="Caixa" onClick={() => router.push('/caixa')}
                  icon={iconCaixa} />
                <QuickAction label="Relatórios" onClick={() => router.push('/relatorios')}
                  icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>} />
                <QuickAction label="Produtos" onClick={() => router.push('/produtos')}
                  icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>} />
              </>
            )}
          </div>
        </div>

      </div>
    </Layout>
  )
}
