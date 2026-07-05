import React from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  return (
    <Card className="w-full border-zinc-200/80 dark:border-zinc-800/80 shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight text-center">
          Welcome back
        </CardTitle>
        <CardDescription className="text-center">
          Enter your email to sign in to your workspace
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mock form fields */}
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
          >
            Email Address
          </label>
          <input
            id="email"
            type="email"
            placeholder="name@company.com"
            disabled
            className="w-full px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-50 outline-none focus:border-zinc-400 dark:focus:border-zinc-700 opacity-60 cursor-not-allowed"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
            >
              Password
            </label>
            <span className="text-xs text-zinc-400 dark:text-zinc-500 cursor-not-allowed">
              Forgot password?
            </span>
          </div>
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            disabled
            className="w-full px-3.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-50 outline-none focus:border-zinc-400 dark:focus:border-zinc-700 opacity-60 cursor-not-allowed"
          />
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        {/* Standard link to bypass and view the app shell */}
        <Link href="/" className="w-full">
          <Button variant="default" size="lg" className="w-full cursor-pointer justify-center font-medium">
            Enter Dashboard (Demo)
          </Button>
        </Link>
        <p className="text-xs text-center text-zinc-400 dark:text-zinc-500 mt-2">
          This is a preview shell. Real authentication is disabled.
        </p>
      </CardFooter>
    </Card>
  )
}
