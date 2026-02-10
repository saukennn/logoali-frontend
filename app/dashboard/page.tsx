'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Layout from '@/components/Layout'
import { getUser } from '@/lib/auth'

export default function DashboardPage() {
  const router = useRouter()
  const user = getUser()
  const [showRegisterOrderModal, setShowRegisterOrderModal] = useState(false)

  const handleGoToStorage = () => {
    router.push('/estoque')
  }

  const handleGoToFinanceiro = () => {
    router.push('/financeiro')
  }

  const handleRegisterOrder = () => {
    setShowRegisterOrderModal(true)
  }

  const closeModal = () => {
    setShowRegisterOrderModal(false)
  }

  return (
    <Layout>
      <div className="px-4 py-6 sm:px-0">
        <h1 className="text-3xl font-bold mb-8 text-black">
          Bem-vindo, <span className="text-orange-500">{user?.nome}</span>
        </h1>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl">
          {/* Botão para Área de Estoque */}
          <button
            onClick={handleGoToStorage}
            className="bg-black hover:bg-gray-800 text-white font-semibold py-10 px-8 rounded-lg shadow-lg transition duration-200 transform hover:scale-105 border-2 border-orange-500 hover:border-orange-400"
          >
            <div className="text-center">
              <svg
                className="mx-auto h-14 w-14 mb-4 text-orange-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              <p className="text-xl font-bold">Área de Estoque</p>
            </div>
          </button>

          {/* Botão para Financeiro */}
          <button
            onClick={handleGoToFinanceiro}
            className="bg-white hover:bg-gray-50 text-black font-semibold py-10 px-8 rounded-lg shadow-lg transition duration-200 transform hover:scale-105 border-2 border-orange-500 hover:border-orange-400"
          >
            <div className="text-center">
              <svg
                className="mx-auto h-14 w-14 mb-4 text-orange-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-xl font-bold">Financeiro</p>
            </div>
          </button>

          {/* Botão para Registrar Pedidos */}
          <button
            onClick={handleRegisterOrder}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-10 px-8 rounded-lg shadow-lg transition duration-200 transform hover:scale-105 border-2 border-black hover:border-gray-800"
          >
            <div className="text-center">
              <svg
                className="mx-auto h-14 w-14 mb-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              <p className="text-xl font-bold">Registrar Pedido</p>
            </div>
          </button>
        </div>

        {/* Modal para Registrar Pedidos */}
        {showRegisterOrderModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
            <div className="relative mx-auto p-8 border-2 border-orange-500 w-96 shadow-2xl rounded-lg bg-white">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-black mb-6">
                  Registrar Pedido
                </h3>
                <div className="mt-4 px-7 py-4 bg-gray-50 rounded-lg">
                  <p className="text-base text-gray-700 font-medium">
                    We are creating this service
                  </p>
                </div>
                <div className="items-center px-4 py-4 mt-6">
                  <button
                    onClick={closeModal}
                    className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white text-base font-bold rounded-md w-full shadow-md transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}



