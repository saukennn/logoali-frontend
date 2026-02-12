'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import api from '@/lib/api'

interface RelatorioMensal {
  periodo: {
    mesAno: string
    dataInicio: string
    dataFim: string
  }
  resumo: {
    receitaTotal: number
    custoTotal: number
    lucro: number
    margemLucro: number
    pedidosTotal: number
    pedidosCancelados: number
    ticketMedio: number
  }
  receitaPorFormaPagamento: Array<{
    formaPagamento: string
    valor: number
    percentual: number
  }>
  receitaPorSetor: Array<{
    setor: string
    valor: number
    quantidade: number
    percentual: number
  }>
  vendasPorGarcom: Array<{
    garcomNome: string
    totalVendas: number
    numeroPedidos: number
    ticketMedio: number
  }>
  movimentacaoCaixa: {
    saldoInicial: number
    entradas: number
    saidas: number
    saldoFinal: number
    movimentacoes: Array<{
      tipo: string
      descricao: string
      valor: number
      data: string
    }>
  }
  produtosMaisVendidos: Array<{
    produtoNome: string
    quantidade: number
    receita: number
  }>
}

export default function RelatoriosPage() {
  const [relatorio, setRelatorio] = useState<RelatorioMensal | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const dataAtual = new Date()
  const [mesAno, setMesAno] = useState(`${dataAtual.getFullYear()}-${String(dataAtual.getMonth() + 1).padStart(2, '0')}`)

  useEffect(() => {
    loadRelatorio()
  }, [mesAno])

  const loadRelatorio = async () => {
    try {
      setLoading(true)
      setErrorMessage(null)

      const [ano, mes] = mesAno.split('-')
      const response = await api.get(`/relatorios/mensal?ano=${ano}&mes=${mes}`)
      setRelatorio(response.data)
    } catch (error: any) {
      console.error('Erro ao carregar relatório:', error)
      setErrorMessage(error.response?.data?.message || 'Erro ao carregar relatório')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-8">Carregando relatório...</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Relatório Mensal de Vendas</h1>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Período:</label>
            <input
              type="month"
              value={mesAno}
              onChange={(e) => setMesAno(e.target.value)}
              className="px-3 py-2 border rounded-md"
            />
          </div>
        </div>

        {errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{errorMessage}</p>
          </div>
        )}

        {relatorio && (
          <div className="space-y-6">
            {/* Resumo Geral */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Resumo Geral - {relatorio.periodo.mesAno}</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Receita Total</p>
                  <p className="text-2xl font-bold text-green-700">{formatCurrency(relatorio.resumo.receitaTotal)}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Custo Total</p>
                  <p className="text-2xl font-bold text-red-700">{formatCurrency(relatorio.resumo.custoTotal)}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Lucro</p>
                  <p className="text-2xl font-bold text-blue-700">{formatCurrency(relatorio.resumo.lucro)}</p>
                  <p className="text-xs text-gray-600 mt-1">Margem: {relatorio.resumo.margemLucro.toFixed(2)}%</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Ticket Médio</p>
                  <p className="text-2xl font-bold text-purple-700">{formatCurrency(relatorio.resumo.ticketMedio)}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Total de Pedidos</p>
                  <p className="text-xl font-bold text-gray-700">{relatorio.resumo.pedidosTotal}</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Pedidos Cancelados</p>
                  <p className="text-xl font-bold text-orange-700">{relatorio.resumo.pedidosCancelados}</p>
                </div>
              </div>
            </div>

            {/* Receita por Forma de Pagamento */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Receita por Forma de Pagamento</h2>
              <div className="space-y-2">
                {relatorio.receitaPorFormaPagamento.map((forma, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                    <div className="flex-1">
                      <p className="font-medium">{forma.formaPagamento}</p>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${forma.percentual}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="ml-4 text-right">
                      <p className="font-bold text-lg">{formatCurrency(forma.valor)}</p>
                      <p className="text-sm text-gray-600">{forma.percentual.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
                {relatorio.receitaPorFormaPagamento.length === 0 && (
                  <p className="text-gray-500 text-center py-4">Nenhum pagamento registrado</p>
                )}
              </div>
            </div>

            {/* Receita por Setor */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Receita por Setor</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {relatorio.receitaPorSetor.map((setor, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <p className="font-medium text-lg mb-2">{setor.setor}</p>
                    <p className="text-2xl font-bold text-blue-700">{formatCurrency(setor.valor)}</p>
                    <p className="text-sm text-gray-600 mt-1">{setor.quantidade} itens vendidos</p>
                    <p className="text-sm text-gray-600">{setor.percentual.toFixed(1)}% do total</p>
                  </div>
                ))}
                {relatorio.receitaPorSetor.length === 0 && (
                  <p className="text-gray-500 text-center py-4 col-span-3">Nenhuma venda registrada</p>
                )}
              </div>
            </div>

            {/* Vendas por Garçom */}
            {relatorio.vendasPorGarcom.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Vendas por Garçom</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Garçom</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Vendas</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">N° Pedidos</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ticket Médio</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {relatorio.vendasPorGarcom.map((garcom, index) => (
                        <tr key={index}>
                          <td className="px-4 py-3 whitespace-nowrap font-medium">{garcom.garcomNome}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-green-700">
                            {formatCurrency(garcom.totalVendas)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">{garcom.numeroPedidos}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            {formatCurrency(garcom.ticketMedio)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Movimentação de Caixa */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Movimentação de Caixa</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Saldo Inicial</p>
                  <p className="text-xl font-bold">{formatCurrency(relatorio.movimentacaoCaixa.saldoInicial)}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Entradas</p>
                  <p className="text-xl font-bold text-green-700">{formatCurrency(relatorio.movimentacaoCaixa.entradas)}</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Saídas</p>
                  <p className="text-xl font-bold text-red-700">{formatCurrency(relatorio.movimentacaoCaixa.saidas)}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Saldo Final</p>
                  <p className="text-xl font-bold text-blue-700">{formatCurrency(relatorio.movimentacaoCaixa.saldoFinal)}</p>
                </div>
              </div>

              {relatorio.movimentacaoCaixa.movimentacoes.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold mb-2">Detalhes das Movimentações</h3>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {relatorio.movimentacaoCaixa.movimentacoes.map((mov, index) => (
                      <div key={index} className={`p-3 rounded border ${
                        mov.tipo === 'ENTRADA' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">{mov.descricao}</p>
                            <p className="text-xs text-gray-600 mt-1">
                              {new Date(mov.data).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <p className={`font-bold text-lg ${
                            mov.tipo === 'ENTRADA' ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {mov.tipo === 'ENTRADA' ? '+' : '-'}{formatCurrency(mov.valor)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Produtos Mais Vendidos */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Top 10 Produtos Mais Vendidos</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Quantidade</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Receita</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {relatorio.produtosMaisVendidos.map((produto, index) => (
                      <tr key={index} className={index < 3 ? 'bg-yellow-50' : ''}>
                        <td className="px-4 py-3 whitespace-nowrap font-bold">
                          {index === 0 && '🥇'}
                          {index === 1 && '🥈'}
                          {index === 2 && '🥉'}
                          {index > 2 && `${index + 1}°`}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-medium">{produto.produtoNome}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-right font-bold">{produto.quantidade}</td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-green-700 font-bold">
                          {formatCurrency(produto.receita)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {relatorio.produtosMaisVendidos.length === 0 && (
                  <p className="text-gray-500 text-center py-4">Nenhum produto vendido</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
