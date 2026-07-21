'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import api from '@/lib/api'

interface RelatorioDiario {
  periodo: { data: string; dataInicio: string; dataFim: string }
  vendas: {
    receitaTotal: number
    receitaBalcao: number
    receitaMesas: number
    numeroPedidos: number
    pedidosCancelados: number
  }
  pagamentos: { dinheiro: number; pix: number; cartao: number; total: number }
  caixa: { entradas: number; suprimentos: number; despesas: number; sangrias: number; depositos: number }
  operacao: { totalRecebido: number; totalDespesas: number; resultado: number }
}

interface RelatorioMensal {
  periodo: { mesAno: string; dataInicio: string; dataFim: string }
  resumo: {
    receitaTotal: number
    custoTotal: number
    lucro: number
    margemLucro: number
    pedidosTotal: number
    pedidosCancelados: number
    ticketMedio: number
  }
  receitaPorFormaPagamento: Array<{ formaPagamento: string; valor: number; percentual: number }>
  receitaPorSetor: Array<{ setor: string; valor: number; quantidade: number; percentual: number }>
  movimentacaoCaixa: {
    saldoInicial: number
    entradas: number
    saidas: number
    saldoFinal: number
    movimentacoes: Array<{ tipo: string; descricao: string; valor: number; data: string }>
  }
  produtosMaisVendidos: Array<{ produtoNome: string; quantidade: number; receita: number }>
}

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl p-4 border ${color}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  )
}

export default function RelatoriosPage() {
  const [relatorio, setRelatorio] = useState<RelatorioMensal | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const hoje = new Date()
  const [mesAno, setMesAno] = useState(
    `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
  )

  // Relatório diário
  const [relatorioDiario, setRelatorioDiario] = useState<RelatorioDiario | null>(null)
  const [loadingDiario, setLoadingDiario] = useState(false)
  const [dataDiario, setDataDiario] = useState(
    `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
  )

  useEffect(() => { loadRelatorio() }, [mesAno])
  useEffect(() => { loadRelatorioDiario() }, [dataDiario])

  const loadRelatorioDiario = async () => {
    setLoadingDiario(true)
    try {
      const res = await api.get(`/relatorios/diario?data=${dataDiario}`)
      setRelatorioDiario(res.data)
    } catch {
      setRelatorioDiario(null)
    } finally {
      setLoadingDiario(false)
    }
  }

  const loadRelatorio = async () => {
    setLoading(true)
    setError(null)
    try {
      const [ano, mes] = mesAno.split('-')
      const res = await api.get(`/relatorios/mensal?ano=${ano}&mes=${mes}`)
      setRelatorio(res.data)
    } catch (e: any) {
      setError(e.response?.data?.message || 'Erro ao carregar relatório')
    } finally {
      setLoading(false)
    }
  }

  const setorColor = (setor: string) => {
    const map: Record<string, string> = {
      BAR: 'bg-orange-500', COZINHA: 'bg-green-500', CHAPA: 'bg-blue-500',
    }
    return map[setor] ?? 'bg-gray-400'
  }

  return (
    <Layout>
      <div className="py-6 max-w-7xl mx-auto">

        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text">Relatório de Vendas</h1>
            {relatorio && (
              <p className="text-sm text-text-subtle mt-0.5">{relatorio.periodo.mesAno}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-text-muted">Período</label>
            <input
              type="month"
              value={mesAno}
              onChange={(e) => setMesAno(e.target.value)}
              className="px-3 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* ── Relatório Diário ── */}
        <div className="bg-surface rounded-xl border border-border shadow-sm p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-base font-semibold text-text">Vendas do Dia</h2>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-text-muted">Data</label>
              <input
                type="date"
                value={dataDiario}
                onChange={(e) => setDataDiario(e.target.value)}
                className="px-3 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {loadingDiario ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : relatorioDiario ? (
            <div className="space-y-4">
              {/* Vendas */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-xs font-semibold uppercase text-green-700 opacity-80 mb-1">Receita Total</p>
                  <p className="text-xl font-bold text-green-800">{fmt(relatorioDiario.vendas.receitaTotal)}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-xs font-semibold uppercase text-blue-700 opacity-80 mb-1">Balcão</p>
                  <p className="text-xl font-bold text-blue-800">{fmt(relatorioDiario.vendas.receitaBalcao)}</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                  <p className="text-xs font-semibold uppercase text-purple-700 opacity-80 mb-1">Mesas</p>
                  <p className="text-xl font-bold text-purple-800">{fmt(relatorioDiario.vendas.receitaMesas)}</p>
                </div>
                <div className="bg-surface-alt border border-border rounded-xl p-3">
                  <p className="text-xs font-semibold uppercase text-text-muted opacity-80 mb-1">Pedidos</p>
                  <p className="text-xl font-bold text-text">{relatorioDiario.vendas.numeroPedidos}</p>
                  <p className="text-xs text-red-500 mt-0.5">{relatorioDiario.vendas.pedidosCancelados} cancelados</p>
                </div>
              </div>

              {/* Operação do Dia */}
              <div className={`rounded-xl border-2 p-4 ${relatorioDiario.operacao.resultado >= 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">Resultado da Operação do Dia</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">(+) Vendas (mesas + balcão)</span>
                    <span className="font-semibold text-green-700">{fmt(relatorioDiario.operacao.totalRecebido)}</span>
                  </div>
                  {relatorioDiario.caixa.entradas > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">(+) Outras entradas (não-venda)</span>
                      <span className="font-semibold text-green-700">{fmt(relatorioDiario.caixa.entradas)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">(-) Despesas</span>
                    <span className="font-semibold text-red-600">{fmt(relatorioDiario.caixa.despesas)}</span>
                  </div>
                  <div className={`border-t-2 pt-2 mt-2 flex justify-between items-center ${relatorioDiario.operacao.resultado >= 0 ? 'border-green-300' : 'border-red-300'}`}>
                    <span className="font-bold text-gray-800">= Lucro do dia</span>
                    <span className={`text-xl font-black ${relatorioDiario.operacao.resultado >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {fmt(relatorioDiario.operacao.resultado)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Sangrias e depósitos não entram no lucro (o dinheiro continua da empresa).</p>
                </div>
              </div>

              {/* Pagamentos e Caixa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-surface-alt rounded-xl border border-border p-4">
                  <p className="text-xs font-semibold text-text-subtle uppercase mb-3">Formas de Pagamento</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Dinheiro', value: relatorioDiario.pagamentos.dinheiro, color: 'text-green-700' },
                      { label: 'PIX', value: relatorioDiario.pagamentos.pix, color: 'text-blue-700' },
                      { label: 'Cartão', value: relatorioDiario.pagamentos.cartao, color: 'text-purple-700' },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between items-center">
                        <span className="text-sm text-text-muted">{item.label}</span>
                        <span className={`text-sm font-bold ${item.color}`}>{fmt(item.value)}</span>
                      </div>
                    ))}
                    <div className="border-t border-border pt-2 flex justify-between items-center">
                      <span className="text-sm font-semibold text-text-muted">Total</span>
                      <span className="text-sm font-bold text-text">{fmt(relatorioDiario.pagamentos.total)}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-surface-alt rounded-xl border border-border p-4">
                  <p className="text-xs font-semibold text-text-subtle uppercase mb-3">Movimentos de Caixa</p>
                  <div className="space-y-2">
                    {[
                      { label: 'Outras entradas', value: relatorioDiario.caixa.entradas, color: 'text-green-700' },
                      { label: 'Suprimentos (troco)', value: relatorioDiario.caixa.suprimentos, color: 'text-text-muted' },
                      { label: 'Despesas', value: relatorioDiario.caixa.despesas, color: 'text-red-600' },
                      { label: 'Sangrias', value: relatorioDiario.caixa.sangrias, color: 'text-orange-600' },
                      { label: 'Depósitos bancários', value: relatorioDiario.caixa.depositos, color: 'text-blue-600' },
                    ].map((item) => (
                      <div key={item.label} className="flex justify-between items-center">
                        <span className="text-sm text-text-muted">{item.label}</span>
                        <span className={`text-sm font-bold ${item.color}`}>{fmt(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-text-subtle text-sm text-center py-4">Nenhum dado para esta data</p>
          )}
        </div>

        {/* Separador */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 border-t border-border" />
          <span className="text-xs font-semibold text-text-subtle uppercase tracking-wide">Relatório Mensal</span>
          <div className="flex-1 border-t border-border" />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700 text-sm">{error}</div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {relatorio && !loading && (
          <div className="space-y-6">

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard label="Receita Total" value={fmt(relatorio.resumo.receitaTotal)}
                color="bg-green-50 border-green-200 text-green-800" />
              <KpiCard label="Custo Total" value={fmt(relatorio.resumo.custoTotal)}
                color="bg-red-50 border-red-200 text-red-800" />
              <KpiCard label="Lucro" value={fmt(relatorio.resumo.lucro)}
                sub={`Margem: ${relatorio.resumo.margemLucro.toFixed(1)}%`}
                color="bg-blue-50 border-blue-200 text-blue-800" />
              <KpiCard label="Ticket Médio" value={fmt(relatorio.resumo.ticketMedio)}
                color="bg-purple-50 border-purple-200 text-purple-800" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <KpiCard label="Pedidos Realizados" value={String(relatorio.resumo.pedidosTotal)}
                color="bg-surface-alt border-border text-text" />
              <KpiCard label="Pedidos Cancelados" value={String(relatorio.resumo.pedidosCancelados)}
                color="bg-orange-50 border-orange-200 text-orange-800" />
            </div>

            {/* Receita por Forma de Pagamento */}
            <div className="bg-surface rounded-xl border border-border shadow-sm p-5">
              <h2 className="text-base font-semibold text-text mb-4">Receita por Forma de Pagamento</h2>
              {relatorio.receitaPorFormaPagamento.length === 0 ? (
                <p className="text-text-subtle text-sm text-center py-4">Nenhum pagamento registrado</p>
              ) : (
                <div className="space-y-3">
                  {relatorio.receitaPorFormaPagamento.map((forma, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-text-muted">{forma.formaPagamento}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-text-subtle">{forma.percentual.toFixed(1)}%</span>
                          <span className="text-sm font-bold text-text w-24 text-right">{fmt(forma.valor)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-surface-alt rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(forma.percentual, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Receita por Setor */}
            <div className="bg-surface rounded-xl border border-border shadow-sm p-5">
              <h2 className="text-base font-semibold text-text mb-4">Receita por Setor</h2>
              {relatorio.receitaPorSetor.length === 0 ? (
                <p className="text-text-subtle text-sm text-center py-4">Nenhuma venda registrada</p>
              ) : (
                <div className="space-y-3">
                  {relatorio.receitaPorSetor.map((setor, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${setorColor(setor.setor)}`} />
                          <span className="text-sm font-medium text-text-muted">{setor.setor}</span>
                          <span className="text-xs text-text-subtle">{setor.quantidade} itens</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-text-subtle">{setor.percentual.toFixed(1)}%</span>
                          <span className="text-sm font-bold text-text w-24 text-right">{fmt(setor.valor)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-surface-alt rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${setorColor(setor.setor)}`}
                          style={{ width: `${Math.min(setor.percentual, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Movimentação de Caixa */}
            <div className="bg-surface rounded-xl border border-border shadow-sm p-5">
              <h2 className="text-base font-semibold text-text mb-4">Movimentação de Caixa</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Saldo Inicial', value: relatorio.movimentacaoCaixa.saldoInicial, color: 'text-text' },
                  { label: 'Entradas', value: relatorio.movimentacaoCaixa.entradas, color: 'text-green-700' },
                  { label: 'Saídas', value: relatorio.movimentacaoCaixa.saidas, color: 'text-red-700' },
                  { label: 'Saldo Final', value: relatorio.movimentacaoCaixa.saldoFinal, color: 'text-blue-700' },
                ].map((item) => (
                  <div key={item.label} className="bg-surface-alt rounded-lg p-3 border border-border">
                    <p className="text-xs text-text-subtle mb-1">{item.label}</p>
                    <p className={`text-lg font-bold ${item.color}`}>{fmt(item.value)}</p>
                  </div>
                ))}
              </div>

              {relatorio.movimentacaoCaixa.movimentacoes.length > 0 && (
                <div className="max-h-64 overflow-y-auto space-y-2 mt-2">
                  {relatorio.movimentacaoCaixa.movimentacoes.map((mov, i) => (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-lg text-sm border
                      ${mov.tipo === 'ENTRADA' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                      <div>
                        <p className="font-medium text-gray-800">{mov.descricao}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(mov.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className={`font-bold ${mov.tipo === 'ENTRADA' ? 'text-green-700' : 'text-red-700'}`}>
                        {mov.tipo === 'ENTRADA' ? '+' : '-'}{fmt(mov.valor)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Produtos */}
            <div className="bg-surface rounded-xl border border-border shadow-sm p-5">
              <h2 className="text-base font-semibold text-text mb-4">Top 10 Produtos Mais Vendidos</h2>
              {relatorio.produtosMaisVendidos.length === 0 ? (
                <p className="text-text-subtle text-sm text-center py-4">Nenhum produto vendido</p>
              ) : (
                <div className="overflow-x-auto -mx-5">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-5 py-2.5 text-left text-xs font-semibold text-text-subtle uppercase tracking-wide w-8">#</th>
                        <th className="px-5 py-2.5 text-left text-xs font-semibold text-text-subtle uppercase tracking-wide">Produto</th>
                        <th className="px-5 py-2.5 text-right text-xs font-semibold text-text-subtle uppercase tracking-wide">Qtd</th>
                        <th className="px-5 py-2.5 text-right text-xs font-semibold text-text-subtle uppercase tracking-wide">Receita</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatorio.produtosMaisVendidos.map((p, i) => (
                        <tr key={i} className="border-b border-border hover:bg-surface-hover transition-colors">
                          <td className="px-5 py-3 font-bold text-text-subtle">
                            {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                          </td>
                          <td className="px-5 py-3 font-medium text-text">{p.produtoNome}</td>
                          <td className="px-5 py-3 text-right text-text-muted">{p.quantidade}</td>
                          <td className="px-5 py-3 text-right font-semibold text-text">{fmt(p.receita)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </Layout>
  )
}
