import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    'font-semibold rounded-lg border transition-colors transition-transform duration-150 disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-px focus-visible:outline-none focus-visible:ring-2'

  const variantStyles = {
    primary: 'border-primary bg-primary text-white hover:border-primary-600 hover:bg-primary-600 focus-visible:ring-primary-200',
    secondary: 'border-gray-200 bg-gray-100 text-gray-900 hover:border-gray-300 hover:bg-gray-200 focus-visible:ring-gray-200',
    outline: 'border-gray-300 bg-white text-gray-700 hover:border-primary hover:bg-primary-50 hover:text-primary focus-visible:ring-primary-200',
    ghost: 'border-transparent bg-transparent text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus-visible:ring-gray-200',
  }

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
