'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import api from '@/lib/api'

interface Produto {
  id: string
  nome: string
  preco: number
  setor: string
}

interface Pedido {
  id: string
  produto: Produto
  quantidade: number
  valorUnitario: number
  setor: string
  status: string
}

interface Conta {
  id: string
  apelido: string
  status: string
  pedidos: Pedido[]
}

interface SessaoMesa {
  id: string
  mesa: {
    numero: number
  }
  garcom: {
    nome: string
  }
  contas: Conta[]
}

export default function SessaoMesaPage() {
  const params = useParams()
  const router = useRouter()
  const sessaoId = params.sessaoId as string
  const [sessao, setSessao] = useState<SessaoMesa | null>(null)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedConta, setSelectedConta] = useState<string | null>(null)
  const [novoApelido, setNovoApelido] = useState('')

  useEffect(() => {
    loadData()
  }, [sessaoId])

  const loadData = async () => {
    try {
      const [sessaoRes, produtosRes] = await Promise.all([
        api.get(`/sessoes-mesa/${sessaoId}`),
        api.get('/produtos'),
      ])
      setSessao(sessaoRes.data)
      setProdutos(produtosRes.data)
      if (sessaoRes.data.contas && sessaoRes.data.contas.length > 0) {
        setSelectedConta(sessaoRes.data.contas[0].id)
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCriarConta = async () => {
    if (!novoApelido.trim()) {
      alert('Digite um apelido para a conta')
      return
    }
    try {
      await api.post('/contas-cliente-mesa', {
        sessaoMesaId: sessaoId,
        apelido: novoApelido,
      })
      setNovoApelido('')
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao criar conta')
    }
  }

  const handleAdicionarPedido = async (produtoId: string) => {
    if (!selectedConta) {
      alert('Selecione uma conta primeiro')
      return
    }
    try {
      await api.post('/pedidos', {
        contaClienteMesaId: selectedConta,
        produtoId,
        quantidade: 1,
      })
      loadData()
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao adicionar pedido')
    }
  }

  const handleFecharConta = async (contaId: string) => {
    try {
      const conta = sessao?.contas.find((c) => c.id === contaId)
      if (!conta) return

      const total = conta.pedidos.reduce((acc, p) => {
        return acc + Number(p.valorUnitario) * p.quantidade
      }, 0)

      const dinheiro = prompt(`Total: R$ ${total.toFixed(2)}\nDigite o valor em dinheiro:`)
      if (!dinheiro) return

      await api.post('/pagamentos', {
        sessaoMesaId: sessaoId,
        dinheiro: parseFloat(dinheiro),
        cartao: 0,
        pix: 0,
      })

      alert('Conta fechada com sucesso!')
      router.push('/mesas')
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao fechar conta')
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="text-center">Carregando...</div>
      </Layout>
    )
  }

  if (!sessao) {
    return (
      <Layout>
        <div className="text-center">Sessão não encontrada</div>
      </Layout>
    )
  }

  const contaAtual = sessao.contas.find((c) => c.id === selectedConta)

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">Mesa {sessao.mesa.numero}</h1>
            <p className="text-gray-600">Garçom: {sessao.garcom.nome}</p>
          </div>
          <button
            onClick={() => router.push('/mesas')}
            className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Voltar
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Contas</h2>
              <div className="space-y-2 mb-4">
                {sessao.contas.map((conta) => (
                  <div
                    key={conta.id}
                    className={`p-3 border rounded cursor-pointer ${
                      selectedConta === conta.id ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedConta(conta.id)}
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">{conta.apelido}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        conta.status === 'ABERTA' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {conta.status}
                      </span>
                    </div>
                    {conta.pedidos.length > 0 && (
                      <p className="text-sm text-gray-600 mt-1">
                        {conta.pedidos.length} pedido(s)
                      </p>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Apelido da conta"
                  value={novoApelido}
                  onChange={(e) => setNovoApelido(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded"
                />
                <button
                  onClick={handleCriarConta}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Nova Conta
                </button>
              </div>
            </div>

            {contaAtual && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Pedidos - {contaAtual.apelido}</h2>
                  {contaAtual.status === 'ABERTA' && (
                    <button
                      onClick={() => handleFecharConta(contaAtual.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Fechar Conta
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {contaAtual.pedidos.map((pedido) => (
                    <div key={pedido.id} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <p className="font-medium">{pedido.produto.nome}</p>
                        <p className="text-sm text-gray-600">
                          {pedido.quantidade}x R$ {Number(pedido.valorUnitario).toFixed(2)} = R${' '}
                          {(Number(pedido.valorUnitario) * pedido.quantidade).toFixed(2)}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs ${
                        pedido.setor === 'CHAPA' ? 'bg-orange-100 text-orange-800' :
                        pedido.setor === 'COZINHA' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {pedido.setor}
                      </span>
                    </div>
                  ))}
                  {contaAtual.pedidos.length === 0 && (
                    <p className="text-gray-500 text-center py-4">Nenhum pedido ainda</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Produtos</h2>
            <div className="space-y-2">
              {produtos.map((produto) => (
                <div
                  key={produto.id}
                  className="p-3 border rounded hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleAdicionarPedido(produto.id)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{produto.nome}</p>
                      <p className="text-sm text-gray-600">R$ {Number(produto.preco).toFixed(2)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs ${
                      produto.setor === 'CHAPA' ? 'bg-orange-100 text-orange-800' :
                      produto.setor === 'COZINHA' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {produto.setor}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}



