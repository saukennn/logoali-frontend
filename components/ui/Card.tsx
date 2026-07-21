import { ReactNode, HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  padding?: boolean
}

export function Card({ children, padding = true, className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-surface rounded-xl border border-border shadow-sm ${padding ? 'p-5' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
