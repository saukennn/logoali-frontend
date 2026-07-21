'use client'

import { ReactNode, useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Se false, não fecha ao clicar no fundo (útil em formulários longos). Default true. */
  closeOnOverlay?: boolean
}

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnOverlay = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={closeOnOverlay ? onClose : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`bg-surface rounded-xl shadow-xl w-full ${SIZES[size]} max-h-[90vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="px-6 py-4 border-b border-border flex-shrink-0">
            <h2 className="text-lg font-bold text-text">{title}</h2>
          </div>
        )}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-border flex gap-3 justify-end flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
