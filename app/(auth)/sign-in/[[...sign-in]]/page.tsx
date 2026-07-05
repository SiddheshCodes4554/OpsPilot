import React from "react"
import { SignIn } from "@clerk/nextjs"

export default function SignInPage() {
  return (
    <div className="flex w-full items-center justify-center">
      <SignIn routing="path" path="/sign-in" />
    </div>
  )
}
