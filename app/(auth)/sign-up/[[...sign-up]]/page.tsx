import React from "react"
import { SignUp } from "@clerk/nextjs"

export default function SignUpPage() {
  return (
    <div className="flex w-full items-center justify-center">
      <SignUp routing="path" path="/sign-up" />
    </div>
  )
}
