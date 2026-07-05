"use client"

import React, { useEffect } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service if applicable
    console.error("Global Error boundary caught:", error)
  }, [error])

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] p-8 text-center animate-fade-in">
      <div className="max-w-md w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 mb-4">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
          An unexpected error occurred while processing your request. Please try again.
        </p>
        {error.digest && (
          <div className="mb-6 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-left">
            <span className="block text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">
              Error Digest
            </span>
            <code className="text-xs font-mono text-zinc-600 dark:text-zinc-400 break-all select-all">
              {error.digest}
            </code>
          </div>
        )}
        <div className="flex justify-center">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-zinc-900 dark:bg-zinc-50 dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            Try again
          </button>
        </div>
      </div>
    </div>
  )
}
