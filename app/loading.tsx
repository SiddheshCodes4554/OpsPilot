"use client"

import React from "react"

export default function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] p-8">
      <div className="relative flex items-center justify-center">
        {/* Pulsing glow effect */}
        <div className="absolute w-16 h-16 rounded-full bg-primary/10 blur-xl animate-pulse" />
        {/* Spinning track */}
        <div className="w-12 h-12 rounded-full border-2 border-zinc-200 dark:border-zinc-800" />
        {/* Spinning indicator */}
        <div className="absolute w-12 h-12 rounded-full border-2 border-transparent border-t-zinc-900 dark:border-t-zinc-100 animate-spin" />
      </div>
      <p className="mt-6 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest animate-pulse">
        Initializing Workspace
      </p>
    </div>
  )
}
