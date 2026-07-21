'use client'

import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
}

const VARIANTS: Record<Variant, string> = {
  primary:   'bg-brand-500 hover:bg-brand-600 text-white shadow-sm',
  secondary: 'bg-surface hover:bg-surface-hover text-text-muted border border-border',
  danger:    'bg-danger hover:bg-danger-dark text-white shadow-sm',
  success:   'bg-success hover:bg-success-dark text-white shadow-sm',
  ghost:     'bg-transparent hover:bg-surface-hover text-text-muted',
}

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-lg',
  lg: 'px-6 py-3 text-base rounded-xl',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth, className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center gap-2 font-semibold
          transition-colors disabled:opacity-50 disabled:cursor-not-allowed
          focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-1
          ${VARIANTS[variant]} ${SIZES[size]} ${fullWidth ? 'w-full' : ''} ${className}
        `}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
