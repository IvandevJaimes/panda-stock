import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'

type EmptyStateProps = {
  title: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-200 py-16 text-center dark:border-gray-800">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
        {icon ?? <Inbox size={22} />}
      </div>
      <div>
        <p className="font-display font-semibold text-gray-900 dark:text-gray-50">
          {title}
        </p>
        {description && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  )
}
