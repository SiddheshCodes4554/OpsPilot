import React from "react"
import Link from "next/link"
import { Bot, Sparkles, Shield, ArrowRight, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function LandingPage() {
  return (
    <div className="flex-1 flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header bar */}
      <header className="w-full h-16 border-b border-zinc-200/50 dark:border-zinc-900/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between px-6 lg:px-12">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold text-lg">
            O
          </div>
          <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-50">
            OpsPilot AI
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="font-medium cursor-pointer">
              Sign In
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="default" size="sm" className="font-medium cursor-pointer">
              Launch App
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero section */}
      <main className="flex-1 flex flex-col items-center justify-center py-20 px-6 text-center max-w-5xl mx-auto space-y-12">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-650 dark:text-zinc-350 shadow-sm animate-fade-in">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            Empowering Small & Medium Enterprises
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-[1.1] max-w-4xl mx-auto">
            The AI-First Operating System for your{" "}
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-sky-500 bg-clip-text text-transparent">
              Business Workforce
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Orchestrate autonomous AI agents, streamline back-office workflows, and scale your operational efficiency with zero friction.
          </p>
        </div>

        {/* Call to Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-4 justify-center">
          <Link href="/dashboard">
            <Button size="lg" className="h-12 px-6 font-semibold gap-2 cursor-pointer shadow-md bg-indigo-650 hover:bg-indigo-700 text-white">
              Launch Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="h-12 px-6 font-semibold cursor-pointer">
              Sign In Screen Mockup
            </Button>
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-12">
          {[
            {
              title: "Autonomous Agents",
              desc: "Deploy specialized digital workers to handle ticketing, billing, CRM management, and scheduling.",
              icon: Bot,
              color: "text-indigo-500"
            },
            {
              title: "Secure Operations",
              desc: "Role-based controls, local guardrails, and sandboxed runtimes ensuring complete safety.",
              icon: Shield,
              color: "text-emerald-500"
            },
            {
              title: "High Performance",
              desc: "Instant synchronization, automated triggers, and robust queue managers running 24/7.",
              icon: Zap,
              color: "text-sky-500"
            }
          ].map((item, idx) => (
            <Card key={idx} hoverEffect className="border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 text-left">
              <CardContent className="pt-6 space-y-3">
                <div className={`p-2.5 w-fit rounded-lg bg-zinc-100 dark:bg-zinc-900 ${item.color}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-50">{item.title}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-8 border-t border-zinc-200/50 dark:border-zinc-900/50 bg-white dark:bg-zinc-950/50 text-center text-xs text-zinc-400">
        © 2026 OpsPilot AI. All rights reserved. Built for modern business orchestration.
      </footer>
    </div>
  )
}
