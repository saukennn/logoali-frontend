'use client'

import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import api from '@/lib/api'
import ComposicaoModal from '@/components/ComposicaoModal'

interface Produto {
  id: string
  nome: string
  preco: number
  setor: string
  ativo: boolean
}

const SETOR_COLORS: Record<string, string> = {
  CHAPA:   'bg-orange-100 text-orange-800',
  COZINHA: 'bg-red-100 text-red-800',
  BAR:     'bg-blue-100 text-blue-800',
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default function ProdutosPage() {
  const [produtos, setProdutos]           = useState<Produto[]>([])
  const [loading, setLoading]             = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [produtoExcluindo, setProdutoExcluindo] = useState<Produto | null>(null)
  const [produtoComposicao, setProdutoComposicao] = useState<Produto | null>(null)
  const [errorMessage, setErrorMessage]   = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [busca, setBusca]                 = useState('')
  const [filtroSetor, setFiltroSetor]     = useState('')

  const [createForm, setCreateForm] = useState({ nome: '', preco: '', setor: '' })
  const [editForm, setEditForm]     = useState({ nome: '', setor: '' })
  const [saving, setSaving]         = useState(false)

  useEffect(() => { loadProdutos() }, [])

  const loadProdutos = async () => {
    try {
      const res = await api.get('/produtos')
      setProdutos(res.data)
    } catch {
      setErrorMessage('Erro ao carregar produtos')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.nome || !createForm.preco || !createForm.setor) {
      setErrorMessage('Preencha todos os campos')
      return
    }
    setSaving(true)
    try {
      await api.post('/produtos', {
        nome: createForm.nome,
        preco: parseFloat(createForm.preco),
        setor: createForm.setor,
      })
      setCreateForm({ nome: '', preco: '', setor: '' })
      setShowCreateModal(false)
      loadProdutos()
      setSuccessMessage('Produto criado com sucesso!')
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Erro ao criar produto')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!produtoEditando) return
    setSaving(true)
    try {
      await api.patch(`/produtos/${produtoEditando.id}`, {
        nome: editForm.nome,
        setor: editForm.setor,
      })
      setProdutoEditando(null)
      loadProdutos()
      setSuccessMessage('Produto atualizado com sucesso!')
    } catch (error: any) {
      setErrorMessage(error.response?.data?.message || 'Erro ao editar produto')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!produtoExcluindo) return
    try {
      await api.delete(`/produtos/${produtoExcluindo.id}`)
      setShowDeleteModal(false)
      setProdutoExcluindo(null)
      loadProdutos()
      setSuccessMessage('Produto excluído com sucesso!')
    } catch (error: any) {
      setShowDeleteModal(false)
      setProdutoExcluindo(null)
      setErrorMessage(error.response?.data?.message || 'Erro ao excluir produto')
    }
  }

  const produtosFiltrados = produtos.filter((p) => {
    const matchNome  = p.nome.toLowerCase().includes(busca.toLowerCase())
    const matchSetor = !filtroSetor || p.setor === filtroSetor
    return matchNome && matchSetor
  })

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
            <p className="text-sm text-gray-500 mt-0.5">{produtos.length} produto{produtos.length !== 1 ? 's' : ''} cadastrado{produtos.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 self-start sm:self-auto"
          >
            <span className="text-lg leading-none">+</span> Novo Produto
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Buscar produto..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <select
              value={filtroSetor}
              onChange={(e) => setFiltroSetor(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            >
              <option value="">Todos os setores</option>
              <option value="CHAPA">Chapa</option>
              <option value="COZINHA">Cozinha</option>
              <option value="BAR">Bar</option>
            </select>
          </div>
        </div>

        {/* Lista de Produtos */}
        {produtosFiltrados.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <p className="text-gray-400 text-sm">Nenhum produto encontrado</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Produto</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Setor</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Preço</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {produtosFiltrados.map((produto, i) => (
                    <tr key={produto.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i === produtosFiltrados.length - 1 ? 'border-b-0' : ''}`}>
                      <td className="px-5 py-3 font-medium text-gray-900">{produto.nome}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${SETOR_COLORS[produto.setor] ?? 'bg-gray-100 text-gray-700'}`}>
                          {produto.setor}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900">{fmt(Number(produto.preco))}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setProdutoComposicao(produto)}
                            className="px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-md transition-colors"
                          >
                            Composição
                          </button>
                          <button
                            onClick={() => {
                              setProdutoEditando(produto)
                              setEditForm({ nome: produto.nome, setor: produto.setor })
                            }}
                            className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => { setProdutoExcluindo(produto); setShowDeleteModal(true) }}
                            className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                          >
                            Excluir
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

      {/* Modal Criar Produto */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Novo Produto</h2>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome *</label>
                <input
                  type="text"
                  required
                  value={createForm.nome}
                  onChange={(e) => setCreateForm({ ...createForm, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Ex: Heineken 600ml"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Preço de Venda *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={createForm.preco}
                  onChange={(e) => setCreateForm({ ...createForm, preco: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Setor *</label>
                <select
                  required
                  value={createForm.setor}
                  onChange={(e) => setCreateForm({ ...createForm, setor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  <option value="">Selecione o setor...</option>
                  <option value="CHAPA">Chapa</option>
                  <option value="COZINHA">Cozinha</option>
                  <option value="BAR">Bar</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setCreateForm({ nome: '', preco: '', setor: '' }) }}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Criar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Produto */}
      {produtoEditando && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Editar Produto</h2>
            </div>
            <form onSubmit={handleEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome *</label>
                <input
                  type="text"
                  required
                  value={editForm.nome}
                  onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Preço de Venda</label>
                <input
                  type="text"
                  value={fmt(Number(produtoEditando.preco))}
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">Use o módulo Financeiro para alterar o preço.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Setor *</label>
                <select
                  required
                  value={editForm.setor}
                  onChange={(e) => setEditForm({ ...editForm, setor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                >
                  <option value="CHAPA">Chapa</option>
                  <option value="COZINHA">Cozinha</option>
                  <option value="BAR">Bar</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setProdutoEditando(null)}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Excluir */}
      {showDeleteModal && produtoExcluindo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Excluir produto?</h2>
            <p className="text-sm text-gray-500 mb-6">
              Tem certeza que deseja excluir <strong>{produtoExcluindo.nome}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setProdutoExcluindo(null) }}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Composição */}
      {produtoComposicao && (
        <ComposicaoModal
          produto={produtoComposicao}
          onClose={() => setProdutoComposicao(null)}
          onSave={() => {
            loadProdutos()
            setSuccessMessage('Composição salva com sucesso!')
          }}
        />
      )}

      {/* Erro */}
      {errorMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <span className="text-red-600 font-bold text-sm">✕</span>
              </div>
              <h3 className="font-semibold text-gray-900">Erro</h3>
            </div>
            <p className="text-sm text-gray-600 mb-5">{errorMessage}</p>
            <button
              onClick={() => setErrorMessage(null)}
              className="w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Sucesso */}
      {successMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <span className="text-green-600 font-bold text-sm">✓</span>
              </div>
              <h3 className="font-semibold text-gray-900">Sucesso</h3>
            </div>
            <p className="text-sm text-gray-600 mb-5">{successMessage}</p>
            <button
              onClick={() => setSuccessMessage(null)}
              className="w-full py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </Layout>
  )
}
