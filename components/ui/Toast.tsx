'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'
interface Toast { id: number; type: ToastType; message: string }

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
  success: (message: string) => void
  error: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

let nextId = 1

const STYLES: Record<ToastType, { bg: string; icon: string; iconBg: string }> = {
  success: { bg: 'border-success', icon: '✓', iconBg: 'bg-success text-white' },
  error:   { bg: 'border-danger',  icon: '✕', iconBg: 'bg-danger text-white' },
  info:    { bg: 'border-info',    icon: 'i', iconBg: 'bg-info text-white' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId++
    setToasts((t) => [...t, { id, type, message }])
    setTimeout(() => remove(id), 4000)
  }, [remove])

  const value: ToastContextValue = {
    showToast,
    success: (m) => showToast(m, 'success'),
    error: (m) => showToast(m, 'error'),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] sm:w-auto">
        {toasts.map((t) => {
          const s = STYLES[t.type]
          return (
            <div
              key={t.id}
              className={`bg-surface rounded-lg shadow-lg border-l-4 ${s.bg} px-4 py-3 flex items-center gap-3 animate-[slideIn_0.2s_ease-out]`}
              onClick={() => remove(t.id)}
              role="alert"
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${s.iconBg}`}>
                {s.icon}
              </span>
              <p className="text-sm text-text flex-1">{t.message}</p>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast deve ser usado dentro de <ToastProvider>')
  return ctx
}
