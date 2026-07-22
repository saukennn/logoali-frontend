'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import api from '@/lib/api'
import { getUser } from '@/lib/auth'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'

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

const LABELS_MOVIMENTO: Record<string, string> = {
  ENTRADA: 'Entrada',
  SUPRIMENTO: 'Suprimento',
  SAIDA: 'Saída',
  SANGRIA: 'Sangria',
  DEPOSITO: 'Depósito',
}

export default function CaixaPage() {
  const [caixa, setCaixa] = useState<CaixaDiario | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAbrirModal, setShowAbrirModal] = useState(false)
  const [showFecharModal, setShowFecharModal] = useState(false)
  const [observacaoFechamento, setObservacaoFechamento] = useState('')
  const [fechandoCaixa, setFechandoCaixa] = useState(false)
  const toast = useToast()
  const user = getUser()

  const { register, handleSubmit, reset, formState: { errors, isSubmitting: registrandoMovimento } } = useForm<MovimentoForm>()
  const { register: regAbrir, handleSubmit: handleAbrir, reset: resetAbrir, formState: { errors: errAbrir, isSubmitting: abrindoCaixa } } = useForm<AbrirCaixaForm>()

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
      toast.success('Caixa aberto com sucesso')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao abrir caixa')
    }
  }

  const onFecharCaixa = async () => {
    if (fechandoCaixa) return // evita double-submit (duplo clique, rede lenta)
    setFechandoCaixa(true)
    try {
      await api.post('/caixas-diarios/fechar', {
        observacao: observacaoFechamento || undefined,
      })
      setShowFecharModal(false)
      setObservacaoFechamento('')
      loadCaixa()
      toast.success('Caixa fechado com sucesso')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao fechar caixa')
    } finally {
      setFechandoCaixa(false)
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
      toast.success('Movimento registrado')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao registrar movimento')
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
      <div className="py-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Caixa</h1>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium bg-surface border-2 ${
              caixaAberto
                ? 'text-green-700 dark:text-green-400 border-green-300 dark:border-green-700'
                : 'text-red-700 dark:text-red-400 border-red-300 dark:border-red-700'
            }`}>
              {caixaAberto ? 'ABERTO' : 'FECHADO'}
            </span>
          </div>
        </div>

        {/* Botão abrir caixa */}
        {!caixaAberto && user?.tipo === 'ADMIN' && (
          <div className="bg-surface rounded-xl border border-border shadow-sm p-10 text-center mb-6">
            <p className="text-text-subtle mb-4 text-sm">Nenhum caixa aberto no momento.</p>
            <button
              onClick={() => setShowAbrirModal(true)}
              className="bg-orange-500 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-orange-600 transition"
            >
              Abrir Caixa
            </button>
          </div>
        )}

        {/* Cards resumo */}
        {caixaAberto && caixa && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <div className="bg-surface rounded-xl border border-border p-4">
                <p className="text-xs text-text-subtle mb-1">Saldo Inicial</p>
                <p className="text-xl font-bold text-text-muted">R$ {Number(caixa.saldoInicial).toFixed(2)}</p>
              </div>
              <div className="bg-surface rounded-xl border-2 border-green-300 dark:border-green-700 p-4">
                <p className="text-xs text-green-700 dark:text-green-400 mb-1">Total Entradas</p>
                <p className="text-xl font-bold text-green-700 dark:text-green-400">R$ {Number(caixa.resumo.totalEntradas).toFixed(2)}</p>
              </div>
              <div className="bg-surface rounded-xl border-2 border-red-300 dark:border-red-700 p-4">
                <p className="text-xs text-red-700 dark:text-red-400 mb-1">Total Saídas</p>
                <p className="text-xl font-bold text-red-700 dark:text-red-400">R$ {Number(caixa.resumo.totalSaidas).toFixed(2)}</p>
              </div>
              <div className="bg-surface rounded-xl border-2 border-orange-300 dark:border-orange-700 p-4">
                <p className="text-xs text-orange-700 dark:text-orange-400 mb-1">Saldo Atual</p>
                <p className="text-xl font-bold text-orange-700 dark:text-orange-400">R$ {Number(caixa.resumo.saldoAtual).toFixed(2)}</p>
              </div>
            </div>

            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-text-subtle">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Novo movimento */}
              <div className="bg-surface rounded-xl border border-border shadow-sm p-5">
                <h2 className="text-base font-semibold text-text-muted mb-4">Novo Movimento</h2>
                <form onSubmit={handleSubmit(onSubmitMovimento)} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-text-muted mb-1.5">Tipo</label>
                    <select
                      {...register('tipo', { required: 'Tipo é obrigatório' })}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-surface"
                    >
                      <option value="">Selecione...</option>
                      <option value="ENTRADA">Entrada (dinheiro entra no caixa)</option>
                      <option value="SUPRIMENTO">Suprimento (adicionar troco/dinheiro)</option>
                      <option value="SAIDA">Saída (despesa/pagamento)</option>
                      <option value="SANGRIA">Sangria (retirada pro cofre)</option>
                      <option value="DEPOSITO">Depósito (envio pro banco)</option>
                    </select>
                    {errors.tipo && <p className="text-red-500 text-xs mt-1">{errors.tipo.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-text-muted mb-1.5">Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      {...register('valor', { required: 'Valor é obrigatório', min: 0.01 })}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="0.00"
                    />
                    {errors.valor && <p className="text-red-500 text-xs mt-1">{errors.valor.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-text-muted mb-1.5">Descrição</label>
                    <input
                      type="text"
                      {...register('origem', { required: 'Origem é obrigatória' })}
                      className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Ex: Venda avulsa"
                    />
                    {errors.origem && <p className="text-red-500 text-xs mt-1">{errors.origem.message}</p>}
                  </div>
                  <button
                    type="submit"
                    disabled={registrandoMovimento}
                    className="w-full bg-orange-500 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {registrandoMovimento ? 'Registrando...' : 'Registrar'}
                  </button>
                </form>
              </div>

              {/* Histórico */}
              <div className="bg-surface rounded-xl border border-border shadow-sm p-5">
                <h2 className="text-base font-semibold text-text-muted mb-4">Movimentos do Dia</h2>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {caixa.movimentos.map((movimento) => (
                    <div key={movimento.id} className={`p-3 rounded-lg border-2 text-sm flex justify-between items-center bg-surface ${
                      movimento.tipo === 'ENTRADA' || movimento.tipo === 'SUPRIMENTO'
                        ? 'border-green-300 dark:border-green-700'
                        : 'border-red-300 dark:border-red-700'
                    }`}>
                      <div>
                        <p className="font-medium text-text">{movimento.origem}</p>
                        <p className="text-xs text-text-subtle mt-0.5">
                          <span className="font-medium text-text-subtle">[{LABELS_MOVIMENTO[movimento.tipo] || movimento.tipo}]</span>{' '}
                          {new Date(movimento.registradoEm).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })} · {movimento.registradoPor.nome}
                        </p>
                      </div>
                      <span className={`font-bold ml-3 flex-shrink-0 ${
                        movimento.tipo === 'ENTRADA' || movimento.tipo === 'SUPRIMENTO'
                          ? 'text-green-700 dark:text-green-400'
                          : 'text-red-700 dark:text-red-400'
                      }`}>
                        {movimento.tipo === 'ENTRADA' || movimento.tipo === 'SUPRIMENTO' ? '+' : '-'}R$ {Number(movimento.valor).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {caixa.movimentos.length === 0 && (
                    <p className="text-text-subtle text-sm text-center py-4">Nenhum movimento registrado</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal Abrir Caixa */}
      <Modal
        open={showAbrirModal}
        onClose={() => setShowAbrirModal(false)}
        title="Abrir Caixa"
        closeOnOverlay={false}
      >
        <form onSubmit={handleAbrir(onAbrirCaixa)} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-text-muted mb-1.5">Saldo Inicial (R$)</label>
            <input
              type="number"
              step="0.01"
              {...regAbrir('saldoInicial', { required: 'Saldo inicial é obrigatório', min: 0 })}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="0.00"
            />
            {errAbrir.saldoInicial && <p className="text-danger text-xs mt-1">{errAbrir.saldoInicial.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-text-muted mb-1.5">Observação (opcional)</label>
            <textarea
              {...regAbrir('observacao')}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              rows={2}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" fullWidth disabled={abrindoCaixa} onClick={() => setShowAbrirModal(false)}>Cancelar</Button>
            <Button type="submit" fullWidth disabled={abrindoCaixa}>{abrindoCaixa ? 'Abrindo...' : 'Abrir Caixa'}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal Fechar Caixa */}
      <Modal
        open={showFecharModal && !!caixa}
        onClose={() => setShowFecharModal(false)}
        title="Fechar Caixa"
        closeOnOverlay={false}
      >
        {caixa && (
          <>
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Saldo Inicial:</span>
                <span className="font-medium">R$ {Number(caixa.saldoInicial).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Total Entradas:</span>
                <span className="font-medium text-success">R$ {Number(caixa.resumo.totalEntradas).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Total Saídas:</span>
                <span className="font-medium text-danger">R$ {Number(caixa.resumo.totalSaidas).toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="font-bold">Saldo Final:</span>
                <span className="font-bold text-brand-600">R$ {Number(caixa.resumo.saldoAtual).toFixed(2)}</span>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-text-muted mb-1.5">Observação (opcional)</label>
              <textarea
                value={observacaoFechamento}
                onChange={(e) => setObservacaoFechamento(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                rows={2}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" fullWidth disabled={fechandoCaixa} onClick={() => setShowFecharModal(false)}>Cancelar</Button>
              <Button variant="danger" fullWidth disabled={fechandoCaixa} onClick={onFecharCaixa}>
                {fechandoCaixa ? 'Fechando...' : 'Confirmar Fechamento'}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </Layout>
  )
}
