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
        bg-white rounded-xl border p-6
        ${hover ? 'hover:shadow-lg hover:border-primary-300 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer' : 'shadow-sm'}
        ${selected ? 'border-primary-400 border-2 shadow-md ring-2 ring-primary-100' : 'border-gray-200'}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}
