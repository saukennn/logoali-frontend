'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import api from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'

interface ContaPagar {
  id: string
  descricao: string
  fornecedor: string | null
  categoria: string
  valor: number
  vencimento: string
  status: 'PENDENTE' | 'PAGO'
  vencida?: boolean
  observacoes: string | null
  anexoPath: string | null
  anexoNome: string | null
  pagoEm: string | null
  criadoPor: { nome: string } | null
  pagoPor: { nome: string } | null
}

const CATEGORIAS = [
  { value: 'FORNECEDOR', label: 'Fornecedor' },
  { value: 'ALUGUEL', label: 'Aluguel' },
  { value: 'SALARIO', label: 'Salário' },
  { value: 'IMPOSTO', label: 'Imposto' },
  { value: 'ENERGIA', label: 'Energia' },
  { value: 'AGUA', label: 'Água' },
  { value: 'INTERNET', label: 'Internet' },
  { value: 'MANUTENCAO', label: 'Manutenção' },
  { value: 'OUTROS', label: 'Outros' },
]

const TIPOS_ACEITOS = '.pdf,.xml,.jpg,.jpeg,.png'
const MAX_BYTES = 10 * 1024 * 1024

const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
const fmtData = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })

export default function ContasPagarPage() {
  const [contas, setContas] = useState<ContaPagar[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [mesAno, setMesAno] = useState('')
  const [buscaInput, setBuscaInput] = useState('')
  const [busca, setBusca] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [contaPagar, setContaPagar] = useState<ContaPagar | null>(null)
  const [contaExcluir, setContaExcluir] = useState<ContaPagar | null>(null)
  const [anexoView, setAnexoView] = useState<{ url: string; nome: string; tipo: string } | null>(null)
  const toast = useToast()

  const [form, setForm] = useState({
    descricao: '', fornecedor: '', categoria: 'FORNECEDOR', valor: '', vencimento: '', observacoes: '',
  })
  const [arquivo, setArquivo] = useState<File | null>(null)

  useEffect(() => { load() }, [filtroStatus, filtroCategoria, busca, mesAno])

  // Debounce simples: só atualiza `busca` (e dispara o load) 400ms depois de
  // parar de digitar, evitando 1 request por tecla.
  useEffect(() => {
    const timer = setTimeout(() => setBusca(buscaInput), 400)
    return () => clearTimeout(timer)
  }, [buscaInput])

  const load = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filtroStatus) params.set('status', filtroStatus)
      if (filtroCategoria) params.set('categoria', filtroCategoria)
      if (busca) params.set('busca', busca)
      if (mesAno) {
        const [ano, mes] = mesAno.split('-')
        params.set('ano', ano)
        params.set('mes', mes)
      }
      const q = params.toString() ? `?${params.toString()}` : ''
      const res = await api.get(`/contas-pagar${q}`)
      setContas(res.data)
    } catch {
      toast.error('Erro ao carregar contas')
    } finally {
      setLoading(false)
    }
  }

  const abrirNova = () => {
    setForm({ descricao: '', fornecedor: '', categoria: 'FORNECEDOR', valor: '', vencimento: '', observacoes: '' })
    setArquivo(null)
    setShowModal(true)
  }

  const onArquivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) { setArquivo(null); return }
    const ext = f.name.toLowerCase().split('.').pop() || ''
    if (!['pdf', 'xml', 'jpg', 'jpeg', 'png'].includes(ext)) {
      toast.error('Tipo não permitido. Aceitos: PDF, XML, JPG, PNG')
      e.target.value = ''
      return
    }
    if (f.size > MAX_BYTES) {
      toast.error('Arquivo muito grande (máx. 10 MB)')
      e.target.value = ''
      return
    }
    setArquivo(f)
  }

  const salvar = async () => {
    if (!form.descricao.trim() || !form.valor || !form.vencimento) {
      toast.error('Preencha descrição, valor e vencimento')
      return
    }
    setSalvando(true)
    try {
      const fd = new FormData()
      fd.append('descricao', form.descricao)
      if (form.fornecedor) fd.append('fornecedor', form.fornecedor)
      fd.append('categoria', form.categoria)
      fd.append('valor', form.valor)
      fd.append('vencimento', new Date(form.vencimento).toISOString())
      if (form.observacoes) fd.append('observacoes', form.observacoes)
      if (arquivo) fd.append('anexo', arquivo)

      await api.post('/contas-pagar', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setShowModal(false)
      load()
      toast.success('Conta cadastrada')
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao salvar conta')
    } finally {
      setSalvando(false)
    }
  }

  const pagar = async (conta: ContaPagar) => {
    try {
      await api.patch(`/contas-pagar/${conta.id}/pagar`)
      load()
      toast.success('Conta paga e saída lançada no caixa')
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Erro ao pagar. Verifique se há caixa aberto.')
    }
  }

  const excluir = async () => {
    if (!contaExcluir) return
    try {
      await api.delete(`/contas-pagar/${contaExcluir.id}`)
      setContaExcluir(null)
      load()
      toast.success('Conta removida')
    } catch {
      toast.error('Erro ao remover')
    }
  }

  // Abre o anexo num visualizador grande dentro do sistema
  const verAnexo = async (conta: ContaPagar) => {
    try {
      const res = await api.get(`/contas-pagar/${conta.id}/anexo`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      setAnexoView({ url, nome: conta.anexoNome || 'anexo', tipo: res.data.type })
    } catch {
      toast.error('Erro ao abrir anexo')
    }
  }

  // Baixa o anexo para o computador
  const baixarAnexoArquivo = () => {
    if (!anexoView) return
    const a = document.createElement('a')
    a.href = anexoView.url
    a.download = anexoView.nome
    a.click()
  }

  const fecharAnexo = () => {
    if (anexoView) URL.revokeObjectURL(anexoView.url)
    setAnexoView(null)
  }

  // KPIs
  const pendentes = contas.filter((c) => c.status === 'PENDENTE')
  const vencidas = contas.filter((c) => c.vencida)
  const totalPendente = pendentes.reduce((s, c) => s + Number(c.valor), 0)
  const totalVencido = vencidas.reduce((s, c) => s + Number(c.valor), 0)

  const statusBadge = (c: ContaPagar) => {
    if (c.status === 'PAGO') return { label: 'Pago', cls: 'bg-success-light text-success-dark', dot: 'bg-success' }
    if (c.vencida) return { label: 'Vencida', cls: 'bg-danger-light text-danger-dark', dot: 'bg-danger' }
    return { label: 'Pendente', cls: 'bg-warning-light text-warning-dark', dot: 'bg-warning' }
  }

  return (
    <Layout>
      <div className="py-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text">Contas a Pagar</h1>
            <p className="text-sm text-text-subtle mt-0.5">Boletos, despesas e vencimentos</p>
          </div>
          <Button onClick={abrirNova}>+ Nova Conta</Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-text-subtle mb-1">A pagar</p>
            <p className="text-2xl font-bold text-text">{pendentes.length}</p>
          </div>
          <div className="bg-warning-light border border-warning/30 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-warning-dark mb-1">Total pendente</p>
            <p className="text-2xl font-bold text-warning-dark">{fmt(totalPendente)}</p>
          </div>
          <div className={`rounded-xl p-4 border shadow-sm ${vencidas.length > 0 ? 'bg-danger-light border-danger/30' : 'bg-surface border-border'}`}>
            <p className="text-xs font-semibold uppercase text-danger-dark mb-1">Vencidas</p>
            <p className="text-2xl font-bold text-danger-dark">{vencidas.length}</p>
          </div>
          <div className={`rounded-xl p-4 border shadow-sm ${totalVencido > 0 ? 'bg-danger-light border-danger/30' : 'bg-surface border-border'}`}>
            <p className="text-xs font-semibold uppercase text-danger-dark mb-1">Valor vencido</p>
            <p className="text-2xl font-bold text-danger-dark">{fmt(totalVencido)}</p>
          </div>
        </div>

        {/* Filtro por status */}
        <div className="flex gap-2 mb-3">
          {[{ v: '', l: 'Todas' }, { v: 'PENDENTE', l: 'Pendentes' }, { v: 'PAGO', l: 'Pagas' }].map((f) => (
            <button
              key={f.v}
              onClick={() => setFiltroStatus(f.v)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filtroStatus === f.v ? 'bg-brand-500 text-white' : 'bg-surface border border-border text-text-muted hover:bg-surface-hover'
              }`}
            >
              {f.l}
            </button>
          ))}
        </div>

        {/* Filtros: categoria, mês, busca por título */}
        <div className="flex flex-wrap gap-2 mb-5">
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="px-3 py-1.5 border border-border rounded-lg text-sm bg-surface text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">Todas as categorias</option>
            {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <input
            type="month"
            value={mesAno}
            onChange={(e) => setMesAno(e.target.value)}
            className="px-3 py-1.5 border border-border rounded-lg text-sm bg-surface text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <input
            type="text"
            value={buscaInput}
            onChange={(e) => setBuscaInput(e.target.value)}
            placeholder="Buscar por título..."
            className="flex-1 min-w-[160px] px-3 py-1.5 border border-border rounded-lg text-sm bg-surface text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {(filtroCategoria || mesAno || buscaInput) && (
            <button
              onClick={() => { setFiltroCategoria(''); setMesAno(''); setBuscaInput('') }}
              className="px-3 py-1.5 text-sm font-medium text-text-muted hover:text-danger transition-colors"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : contas.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-12 text-center shadow-sm">
            <p className="text-text-subtle text-sm">Nenhuma conta cadastrada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {contas.map((c) => {
              const st = statusBadge(c)
              return (
                <div key={c.id} className={`bg-surface border rounded-xl p-4 shadow-sm ${c.vencida ? 'border-danger/30' : 'border-border'}`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-text">{c.descricao}</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${st.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}
                        </span>
                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-600">
                          {CATEGORIAS.find((cat) => cat.value === c.categoria)?.label || c.categoria}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-text-subtle flex-wrap">
                        {c.fornecedor && <span>{c.fornecedor}</span>}
                        <span className={c.vencida ? 'text-danger font-semibold' : ''}>Vence: {fmtData(c.vencimento)}</span>
                        {c.status === 'PAGO' && c.pagoEm && <span className="text-success">Pago em {fmtData(c.pagoEm)}</span>}
                        {c.anexoNome && (
                          <button
                            onClick={() => verAnexo(c)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-info-light text-info-dark font-medium hover:bg-info/20 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                            Ver anexo
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-lg font-bold text-text">{fmt(Number(c.valor))}</span>
                      {c.status === 'PENDENTE' && (
                        <>
                          <Button size="sm" variant="success" onClick={() => pagar(c)}>Pagar</Button>
                          <button onClick={() => setContaExcluir(c)} className="px-2.5 py-1.5 text-xs font-medium text-danger bg-danger-light hover:bg-danger/20 rounded-md transition-colors">
                            Excluir
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal nova conta */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nova Conta a Pagar" closeOnOverlay={false}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-text-muted mb-1.5">Descrição *</label>
            <input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Ex: Boleto Ambev, Conta de luz..."
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-text-muted mb-1.5">Fornecedor</label>
              <input value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-muted mb-1.5">Categoria</label>
              <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500">
                {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-text-muted mb-1.5">Valor (R$) *</label>
              <input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })}
                placeholder="0,00"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-muted mb-1.5">Vencimento *</label>
              <input type="date" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-text-muted mb-1.5">Anexo (boleto, XML, comprovante)</label>
            <input type="file" accept={TIPOS_ACEITOS} onChange={onArquivo}
              className="w-full text-sm text-text-muted file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-brand-50 file:text-brand-700 file:font-medium hover:file:bg-brand-100 file:cursor-pointer" />
            <p className="text-xs text-text-subtle mt-1">PDF, XML, JPG ou PNG — máx. 10 MB</p>
            {arquivo && <p className="text-xs text-success mt-1">✓ {arquivo.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-text-muted mb-1.5">Observações</label>
            <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setShowModal(false)} disabled={salvando}>Cancelar</Button>
            <Button fullWidth onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Cadastrar'}</Button>
          </div>
        </div>
      </Modal>

      {/* Modal confirmar exclusão */}
      <Modal open={!!contaExcluir} onClose={() => setContaExcluir(null)} title="Remover Conta" size="sm">
        <p className="text-sm text-text-muted mb-6">
          Remover <strong>{contaExcluir?.descricao}</strong>? Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" fullWidth onClick={() => setContaExcluir(null)}>Cancelar</Button>
          <Button variant="danger" fullWidth onClick={excluir}>Remover</Button>
        </div>
      </Modal>

      {/* Visualizador de anexo — tela grande e clara */}
      {anexoView && (
        <div className="fixed inset-0 bg-black/70 z-50 flex flex-col p-2 sm:p-6" onClick={fecharAnexo}>
          {/* Barra superior — empilha no mobile, lado a lado no desktop */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2 sm:mb-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <p className="text-white font-semibold text-sm sm:text-lg truncate">{anexoView.nome}</p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={baixarAnexoArquivo}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 bg-surface text-text rounded-lg font-semibold text-sm hover:bg-surface-hover transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Baixar
              </button>
              <button
                onClick={fecharAnexo}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-2.5 bg-white/20 text-white rounded-lg font-semibold text-sm hover:bg-white/30 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                Fechar
              </button>
            </div>
          </div>

          {/* Conteúdo do documento (grande) */}
          <div className="flex-1 bg-white rounded-lg overflow-hidden min-h-0" onClick={(e) => e.stopPropagation()}>
            {anexoView.tipo.includes('image') ? (
              // Imagem: funciona bem em qualquer tela
              <div className="w-full h-full flex items-center justify-center bg-gray-100 overflow-auto p-4">
                <img src={anexoView.url} alt={anexoView.nome} className="max-w-full max-h-full object-contain" />
              </div>
            ) : anexoView.tipo.includes('pdf') ? (
              <>
                {/* Desktop/tablet: PDF embutido (iframe não funciona bem no celular) */}
                <iframe src={anexoView.url} className="hidden sm:block w-full h-full" title={anexoView.nome} />
                {/* Mobile: aviso claro + botão grande para abrir */}
                <div className="sm:hidden w-full h-full flex flex-col items-center justify-center text-center p-6 gap-5">
                  <svg className="w-20 h-20 text-danger/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                  <div>
                    <p className="font-semibold text-gray-800 mb-1">Documento PDF</p>
                    <p className="text-sm text-gray-500">No celular, toque abaixo para abrir o boleto em tela cheia.</p>
                  </div>
                  <Button size="lg" onClick={baixarAnexoArquivo}>Abrir documento</Button>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 gap-4">
                <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <p className="text-gray-600">Este tipo de arquivo ({anexoView.nome}) não pode ser visualizado aqui.</p>
                <Button size="lg" onClick={baixarAnexoArquivo}>Baixar arquivo</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  )
}
