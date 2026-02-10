import { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  hover?: boolean
  selected?: boolean
}

export function Card({ children, hover = false, selected = false, className = '', ...props }: CardProps) {
  return (
    <div
      className={`
        bg-white rounded-xl border p-4 sm:p-6 transition-colors duration-200
        ${hover ? 'cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 active:translate-y-px' : ''}
        ${selected ? 'border-primary-400 border-2 ring-2 ring-primary-100' : 'border-gray-200'}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}
