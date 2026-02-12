'use client'

import { useEffect, useState } from 'react'
import api from '@/lib/api'

interface ItemEstoque {
  id: string
  codigo: string
  nome: string
  unidadeMedida: string
  quantidadeAtual: number
}

interface ComposicaoItem {
  itemEstoqueId: string
  quantidade: number
  unidade: string
  itemEstoque?: ItemEstoque
}

interface Produto {
  id: string
  nome: string
  composicao?: ComposicaoItem[]
}

interface ComposicaoModalProps {
  produto: Produto
  onClose: () => void
  onSave: () => void
}

export default function ComposicaoModal({ produto, onClose, onSave }: ComposicaoModalProps) {
  const [itensEstoque, setItensEstoque] = useState<ItemEstoque[]>([])
  const [composicao, setComposicao] = useState<ComposicaoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [confirmRemoveAll, setConfirmRemoveAll] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Carregar itens de estoque disponíveis
      const [responseEstoque, responseProduto] = await Promise.all([
        api.get('/estoque/itens?ativo=true'),
        api.get(`/produtos/${produto.id}`)
      ])

      setItensEstoque(responseEstoque.data)

      // Carregar composição existente
      if (responseProduto.data.composicao && responseProduto.data.composicao.length > 0) {
        setComposicao(responseProduto.data.composicao)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
      setErrorMessage('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = () => {
    setComposicao([...composicao, { itemEstoqueId: '', quantidade: 1, unidade: 'unidades' }])
  }

  const handleRemoveItem = (index: number) => {
    setComposicao(composicao.filter((_, i) => i !== index))
  }

  const handleChangeItem = (index: number, field: keyof ComposicaoItem, value: any) => {
    const newComposicao = [...composicao]
    newComposicao[index] = { ...newComposicao[index], [field]: value }

    // Se mudou o item de estoque, atualizar a unidade baseada no item selecionado
    if (field === 'itemEstoqueId') {
      const item = itensEstoque.find(i => i.id === value)
      if (item) {
        newComposicao[index].unidade = item.unidadeMedida
      }
    }

    setComposicao(newComposicao)
  }

  const handleSaveClick = () => {
    // Validar se vai remover toda a composição
    if (composicao.length === 0) {
      setConfirmRemoveAll(true)
      return
    }
    handleSave()
  }

  const handleSave = async () => {
    // Validar se todos os itens estão preenchidos
    for (let i = 0; i < composicao.length; i++) {
      if (!composicao[i].itemEstoqueId) {
        setErrorMessage(`Item ${i + 1}: Selecione um item de estoque`)
        return
      }
      if (!composicao[i].quantidade || composicao[i].quantidade <= 0) {
        setErrorMessage(`Item ${i + 1}: Quantidade deve ser maior que zero`)
        return
      }
      if (!composicao[i].unidade) {
        setErrorMessage(`Item ${i + 1}: Unidade é obrigatória`)
        return
      }
    }

    // Validar duplicatas
    const ids = composicao.map(c => c.itemEstoqueId)
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
    if (duplicates.length > 0) {
      setErrorMessage('Não é possível adicionar o mesmo item de estoque mais de uma vez')
      return
    }

    setSaving(true)
    try {
      await api.patch(`/produtos/${produto.id}`, {
        composicao: composicao.map(c => ({
          itemEstoqueId: c.itemEstoqueId,
          quantidade: Number(c.quantidade),
          unidade: c.unidade
        }))
      })

      onSave()
      onClose()
    } catch (error: any) {
      console.error('Erro ao salvar composição:', error)
      setErrorMessage(error.response?.data?.message || 'Erro ao salvar composição')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-3xl shadow-xl">
          <div className="text-center">Carregando...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-3xl shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-2">Gerenciar Composição</h2>
        <p className="text-sm text-gray-600 mb-4">
          Produto: <strong>{produto.nome}</strong>
        </p>

        {itensEstoque.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-yellow-800">
              Nenhum item de estoque cadastrado. Cadastre itens de estoque primeiro.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold">Itens da Composição ({composicao.length})</h3>
                <button
                  onClick={handleAddItem}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  + Adicionar Item
                </button>
              </div>

              {composicao.length === 0 ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <p className="text-gray-700 mb-2">Nenhum item na composição</p>
                  <p className="text-sm text-blue-700">
                    ℹ️ Este produto será vendido sem controle automático de estoque
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Ideal para produtos simples como bebidas, que não precisam de composição
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {composicao.map((item, index) => {
                    const itemEstoqueSelecionado = itensEstoque.find(i => i.id === item.itemEstoqueId)
                    return (
                      <div key={index} className="border rounded-lg p-3 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                          <div className="md:col-span-5">
                            <label className="block text-xs font-medium mb-1">Item de Estoque</label>
                            <select
                              value={item.itemEstoqueId}
                              onChange={(e) => handleChangeItem(index, 'itemEstoqueId', e.target.value)}
                              className="w-full px-2 py-2 border rounded-md text-sm"
                            >
                              <option value="">Selecione...</option>
                              {itensEstoque.map(i => (
                                <option key={i.id} value={i.id}>
                                  {i.codigo} - {i.nome} (Disp: {Number(i.quantidadeAtual).toFixed(2)} {i.unidadeMedida})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="md:col-span-3">
                            <label className="block text-xs font-medium mb-1">Quantidade</label>
                            <input
                              type="number"
                              step="0.001"
                              min="0.001"
                              value={item.quantidade}
                              onChange={(e) => handleChangeItem(index, 'quantidade', e.target.value)}
                              className="w-full px-2 py-2 border rounded-md text-sm"
                            />
                          </div>
                          <div className="md:col-span-3">
                            <label className="block text-xs font-medium mb-1">Unidade</label>
                            <input
                              type="text"
                              value={item.unidade}
                              onChange={(e) => handleChangeItem(index, 'unidade', e.target.value)}
                              className="w-full px-2 py-2 border rounded-md text-sm"
                              placeholder="ex: unidades, gramas"
                            />
                          </div>
                          <div className="md:col-span-1">
                            <button
                              onClick={() => handleRemoveItem(index)}
                              className="w-full px-2 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                              title="Remover item"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        {itemEstoqueSelecionado && (
                          <div className="mt-2 text-xs text-gray-600">
                            <span className="font-medium">Estoque disponível:</span> {Number(itemEstoqueSelecionado.quantidadeAtual).toFixed(2)} {itemEstoqueSelecionado.unidadeMedida}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {composicao.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>ℹ️ Como funciona:</strong> Cada vez que 1 unidade deste produto for vendida,
                  o sistema irá reduzir automaticamente as quantidades especificadas acima do estoque.
                </p>
              </div>
            )}
          </>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 border rounded-md hover:bg-gray-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveClick}
            disabled={saving || itensEstoque.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar Composição'}
          </button>
        </div>
      </div>

      {/* Modal de Confirmação de Remoção Total */}
      {confirmRemoveAll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-bold mb-2">ℹ️ Confirmar Remoção</h3>
            <p className="text-gray-700 mb-4">
              Você está removendo toda a composição deste produto. O produto continuará vendável, mas sem controle automático de estoque. Deseja continuar?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmRemoveAll(false)}
                className="px-4 py-2 border rounded-md hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  setConfirmRemoveAll(false)
                  handleSave()
                }}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
              >
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Erro */}
      {errorMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-red-600 text-xl">✕</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro</h3>
                <p className="text-gray-600">{errorMessage}</p>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setErrorMessage(null)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
