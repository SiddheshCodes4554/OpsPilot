import React from "react"
import { cn } from "@/lib/utils"

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode
  title?: string
  description?: string
  badge?: string
}

export function Section({
  children,
  title,
  description,
  badge,
  className,
  ...props
}: SectionProps) {
  return (
    <section
      className={cn(
        "relative w-full space-y-4 py-4 md:py-6",
        className
      )}
      {...props}
    >
      {(title || description || badge) && (
        <div className="space-y-1">
          {badge && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary mb-2 dark:bg-primary/20">
              {badge}
            </span>
          )}
          {title && (
            <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {description}
            </p>
          )}
        </div>
      )}
      <div className="w-full">
        {children}
      </div>
    </section>
  )
}
