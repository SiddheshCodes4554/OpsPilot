import React from "react"
import { cn } from "@/lib/utils"

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  title?: string
  description?: string
  actions?: React.ReactNode
  backHref?: string
}

export function PageContainer({
  children,
  title,
  description,
  actions,
  className,
  ...props
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in",
        className
      )}
      {...props}
    >
      {(title || description || actions) && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 pb-6 border-b border-zinc-900">
          <div className="space-y-1.5">
            {title && (
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl leading-relaxed">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-3 shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}
      <main className="flex-1 flex flex-col gap-6">
        {children}
      </main>
    </div>
  )
}
