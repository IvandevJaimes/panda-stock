type PagePlaceholderProps = {
  title: string
}

export function PagePlaceholder({ title }: PagePlaceholderProps) {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="font-display text-xl font-semibold text-gray-400 dark:text-gray-500">
        {title}
      </p>
    </div>
  )
}
