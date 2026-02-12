'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import api from '@/lib/api'
import { getUser } from '@/lib/auth'
import { useForm } from 'react-hook-form'

interface Movimento {
  id: string
  tipo: string
  valor: number
  origem: string
  registradoEm: string
  registradoPor: {
    nome: string
  }
}

interface CaixaDiario {
  id: string
  status: string
  saldoInicial: number
  saldoFinal: number | null
  aberturaEm: string
  fechamentoEm: string | null
  observacaoAbertura: string | null
  abertoPor: { nome: string }
  movimentos: Movimento[]
  resumo: {
    totalEntradas: number
    totalSaidas: number
    saldoAtual: number
  }
}

interface MovimentoForm {
  tipo: string
  valor: number
  origem: string
}

interface AbrirCaixaForm {
  saldoInicial: number
  observacao: string
}

export default function CaixaPage() {
  const [caixa, setCaixa] = useState<CaixaDiario | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAbrirModal, setShowAbrirModal] = useState(false)
  const [showFecharModal, setShowFecharModal] = useState(false)
  const [observacaoFechamento, setObservacaoFechamento] = useState('')
  const user = getUser()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<MovimentoForm>()
  const { register: regAbrir, handleSubmit: handleAbrir, reset: resetAbrir, formState: { errors: errAbrir } } = useForm<AbrirCaixaForm>()

  useEffect(() => {
    loadCaixa()
  }, [])

  const loadCaixa = async () => {
    try {
      const response = await api.get('/caixas-diarios/atual')
      setCaixa(response.data)
    } catch (error) {
      console.error('Erro ao carregar caixa:', error)
    } finally {
      setLoading(false)
    }
  }

  const onAbrirCaixa = async (data: AbrirCaixaForm) => {
    try {
      await api.post('/caixas-diarios/abrir', {
        saldoInicial: Number(data.saldoInicial),
        observacao: data.observacao || undefined,
      })
      resetAbrir()
      setShowAbrirModal(false)
      loadCaixa()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao abrir caixa')
    }
  }

  const onFecharCaixa = async () => {
    try {
      await api.post('/caixas-diarios/fechar', {
        observacao: observacaoFechamento || undefined,
      })
      setShowFecharModal(false)
      setObservacaoFechamento('')
      loadCaixa()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao fechar caixa')
    }
  }

  const onSubmitMovimento = async (data: MovimentoForm) => {
    try {
      await api.post('/movimentos-caixa', {
        ...data,
        valor: Number(data.valor),
      })
      reset()
      loadCaixa()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao registrar movimento')
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-12">Carregando...</div>
      </Layout>
    )
  }

  const caixaAberto = caixa && caixa.status === 'ABERTO'

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Caixa</h1>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              caixaAberto
                ? 'bg-green-100 text-green-800 border border-green-300'
                : 'bg-red-100 text-red-800 border border-red-300'
            }`}>
              {caixaAberto ? 'ABERTO' : 'FECHADO'}
            </span>
          </div>
        </div>

        {/* Botão abrir caixa */}
        {!caixaAberto && user?.tipo === 'ADMIN' && (
          <div className="bg-white rounded-lg border-2 border-black p-8 text-center mb-6">
            <p className="text-gray-600 mb-4">Nenhum caixa aberto no momento.</p>
            <button
              onClick={() => setShowAbrirModal(true)}
              className="bg-orange-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-orange-600 transition"
            >
              Abrir Caixa
            </button>
          </div>
        )}

        {/* Cards resumo */}
        {caixaAberto && caixa && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg border-2 border-black p-4">
                <p className="text-sm text-gray-500">Saldo Inicial</p>
                <p className="text-xl font-bold">R$ {Number(caixa.saldoInicial).toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-lg border-2 border-green-500 p-4">
                <p className="text-sm text-gray-500">Total Entradas</p>
                <p className="text-xl font-bold text-green-600">R$ {Number(caixa.resumo.totalEntradas).toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-lg border-2 border-red-500 p-4">
                <p className="text-sm text-gray-500">Total Saídas</p>
                <p className="text-xl font-bold text-red-600">R$ {Number(caixa.resumo.totalSaidas).toFixed(2)}</p>
              </div>
              <div className="bg-white rounded-lg border-2 border-orange-500 p-4">
                <p className="text-sm text-gray-500">Saldo Atual</p>
                <p className="text-xl font-bold text-orange-600">R$ {Number(caixa.resumo.saldoAtual).toFixed(2)}</p>
              </div>
            </div>

            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-500">
                Aberto por <span className="font-medium">{caixa.abertoPor.nome}</span> em{' '}
                {new Date(caixa.aberturaEm).toLocaleString('pt-BR')}
              </p>
              {user?.tipo === 'ADMIN' && (
                <button
                  onClick={() => setShowFecharModal(true)}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition"
                >
                  Fechar Caixa
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Novo movimento */}
              <div className="bg-white rounded-lg border-2 border-black p-6">
                <h2 className="text-xl font-bold mb-4">Novo Movimento</h2>
                <form onSubmit={handleSubmit(onSubmitMovimento)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Tipo</label>
                    <select
                      {...register('tipo', { required: 'Tipo é obrigatório' })}
                      className="w-full px-3 py-2 border-2 border-black rounded-md"
                    >
                      <option value="">Selecione...</option>
                      <option value="DEPOSITO">Depósito</option>
                      <option value="SANGRIA">Sangria</option>
                      <option value="ENTRADA">Entrada</option>
                      <option value="SAIDA">Saída</option>
                    </select>
                    {errors.tipo && <p className="text-red-500 text-sm mt-1">{errors.tipo.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Valor</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('valor', { required: 'Valor é obrigatório', min: 0.01 })}
                      className="w-full px-3 py-2 border-2 border-black rounded-md"
                    />
                    {errors.valor && <p className="text-red-500 text-sm mt-1">{errors.valor.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Origem</label>
                    <input
                      type="text"
                      {...register('origem', { required: 'Origem é obrigatória' })}
                      className="w-full px-3 py-2 border-2 border-black rounded-md"
                      placeholder="Ex: Venda avulsa"
                    />
                    {errors.origem && <p className="text-red-500 text-sm mt-1">{errors.origem.message}</p>}
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-orange-500 text-white py-2 rounded-md font-bold hover:bg-orange-600 transition"
                  >
                    Registrar
                  </button>
                </form>
              </div>

              {/* Histórico */}
              <div className="bg-white rounded-lg border-2 border-black p-6">
                <h2 className="text-xl font-bold mb-4">Movimentos do Dia</h2>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {caixa.movimentos.map((movimento) => (
                    <div key={movimento.id} className="p-3 border-2 border-gray-200 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{movimento.origem}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(movimento.registradoEm).toLocaleString('pt-BR')} - {movimento.registradoPor.nome}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${
                            movimento.tipo === 'ENTRADA' || movimento.tipo === 'DEPOSITO'
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {movimento.tipo === 'ENTRADA' || movimento.tipo === 'DEPOSITO' ? '+' : '-'}
                            R$ {Number(movimento.valor).toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-400">{movimento.tipo}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {caixa.movimentos.length === 0 && (
                    <p className="text-gray-500 text-center py-4">Nenhum movimento registrado</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal Abrir Caixa */}
      {showAbrirModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border-2 border-black p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Abrir Caixa</h2>
            <form onSubmit={handleAbrir(onAbrirCaixa)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Saldo Inicial (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  {...regAbrir('saldoInicial', { required: 'Saldo inicial é obrigatório', min: 0 })}
                  className="w-full px-3 py-2 border-2 border-black rounded-md"
                  placeholder="0.00"
                />
                {errAbrir.saldoInicial && <p className="text-red-500 text-sm mt-1">{errAbrir.saldoInicial.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Observação (opcional)</label>
                <textarea
                  {...regAbrir('observacao')}
                  className="w-full px-3 py-2 border-2 border-black rounded-md"
                  rows={2}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAbrirModal(false)}
                  className="flex-1 py-2 border-2 border-black rounded-md font-medium hover:bg-gray-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 text-white py-2 rounded-md font-bold hover:bg-orange-600 transition"
                >
                  Abrir Caixa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Fechar Caixa */}
      {showFecharModal && caixa && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg border-2 border-black p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Fechar Caixa</h2>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Saldo Inicial:</span>
                <span className="font-medium">R$ {Number(caixa.saldoInicial).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Entradas:</span>
                <span className="font-medium text-green-600">R$ {Number(caixa.resumo.totalEntradas).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Saídas:</span>
                <span className="font-medium text-red-600">R$ {Number(caixa.resumo.totalSaidas).toFixed(2)}</span>
              </div>
              <div className="border-t-2 border-black pt-2 flex justify-between">
                <span className="font-bold">Saldo Final:</span>
                <span className="font-bold text-orange-600">R$ {Number(caixa.resumo.saldoAtual).toFixed(2)}</span>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Observação (opcional)</label>
              <textarea
                value={observacaoFechamento}
                onChange={(e) => setObservacaoFechamento(e.target.value)}
                className="w-full px-3 py-2 border-2 border-black rounded-md"
                rows={2}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFecharModal(false)}
                className="flex-1 py-2 border-2 border-black rounded-md font-medium hover:bg-gray-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={onFecharCaixa}
                className="flex-1 bg-red-500 text-white py-2 rounded-md font-bold hover:bg-red-600 transition"
              >
                Confirmar Fechamento
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
