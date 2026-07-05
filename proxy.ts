import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

// Protect all routes under /dashboard
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)"])

const clerkHandler = clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

// Export as both default and named export 'proxy' to ensure compatibility with Next.js 16
export default clerkHandler
export { clerkHandler as proxy }

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Always run for Clerk-specific frontend API routes
    "/__clerk/(.*)",
  ],
}
