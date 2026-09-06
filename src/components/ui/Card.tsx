import type { HTMLAttributes } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  title?: string
  description?: string
}

export function Card({ title, description, children, className, ...props }: CardProps) {
  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 ${className ?? ''}`}
      {...props}
    >
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h3 className="font-display text-base font-semibold text-gray-900 dark:text-gray-50">
              {title}
            </h3>
          )}
          {description && (
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  )
}
