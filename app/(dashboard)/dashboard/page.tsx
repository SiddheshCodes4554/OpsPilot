import React from "react"
import { PageContainer } from "@/components/layout/PageContainer"
import { Section } from "@/components/layout/Section"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bot, BrainCircuit, Activity, Cpu, Sparkles } from "lucide-react"

export default function DashboardPage() {
  const stats = [
    { title: "AI Agents Active", value: "14", change: "+2 today", icon: Bot, color: "text-emerald-500 bg-emerald-500/10" },
    { title: "Total Tasks Processed", value: "1,248", change: "+12.5% this week", icon: BrainCircuit, color: "text-indigo-500 bg-indigo-500/10" },
    { title: "Workforce Performance", value: "98.4%", change: "+0.3% vs last week", icon: Activity, color: "text-sky-500 bg-sky-500/10" },
  ]

  const actionButtons = (
    <>
      <Button variant="outline" size="sm">Export Report</Button>
      <Button variant="default" size="sm" className="gap-1 cursor-pointer">
        <Sparkles className="h-3.5 w-3.5" /> Deploy Agent
      </Button>
    </>
  )

  return (
    <PageContainer
      title="Workforce Dashboard"
      description="Monitor and orchestrate your autonomous AI workforce, agent performance, and business operations."
      actions={actionButtons}
    >
      {/* Overview Stats Section */}
      <Section title="Overview Statistics" description="Real-time status of your SME's digital operations.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, i) => (
            <Card key={i} hoverEffect className="border-zinc-200/65 dark:border-zinc-800/65">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  {stat.title}
                </span>
                <div className={`p-1.5 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {stat.value}
                </div>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Agents List */}
        <div className="lg:col-span-2">
          <Section title="Active AI Agents" description="Agents currently performing operational jobs.">
            <Card className="border-zinc-200/65 dark:border-zinc-800/65">
              <CardHeader>
                <CardTitle>Autonomous Worker Status</CardTitle>
                <CardDescription>Live agents managing customer support, CRM entry, and invoicing.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: "SupportCopilot", role: "Customer Service Agent", status: "Idle", task: "Monitoring inbox", uptime: "4d 12h" },
                  { name: "LeadScout", role: "Sales Prospecting Agent", status: "Running", task: "Enriching new leads list", uptime: "2h 45m" },
                  { name: "FinFlow", role: "Accounting & Invoicing", status: "Running", task: "Reconciling outstanding invoices", uptime: "12d 8h" },
                ].map((agent, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 rounded-xl border border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-900/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-zinc-900/5 dark:bg-zinc-50/5 text-zinc-700 dark:text-zinc-350">
                        <Cpu className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-50">{agent.name}</div>
                        <div className="text-xs text-zinc-400">{agent.role}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className={`h-1.5 w-1.5 rounded-full ${agent.status === "Running" ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"}`} />
                        <span className="text-xs font-medium text-zinc-650 dark:text-zinc-400">{agent.status}</span>
                      </div>
                      <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">{agent.task}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </Section>
        </div>

        {/* Task Console Panel */}
        <div className="lg:col-span-1">
          <Section title="System Controls" description="Operational overrides.">
            <Card hoverEffect className="bg-gradient-to-br from-white to-zinc-50/30 dark:from-zinc-950 dark:to-zinc-900/10 border-zinc-200/65 dark:border-zinc-800/65">
              <CardHeader>
                <CardTitle>Global Automation Console</CardTitle>
                <CardDescription>Adjust execution settings for all deployed AI workers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3.5 rounded-lg bg-indigo-500/5 border border-indigo-500/10 text-xs text-indigo-650 dark:text-indigo-400 leading-relaxed">
                  <strong>Notice:</strong> High-performance scaling modes are currently locked to template settings.
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                    Orchestration Mode
                  </div>
                  <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Semi-Autonomous (Review Required)
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Button className="w-full justify-center text-xs" variant="outline">
                  Configure Controls
                </Button>
              </CardFooter>
            </Card>
          </Section>
        </div>
      </div>
    </PageContainer>
  )
}
