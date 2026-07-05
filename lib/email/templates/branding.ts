/**
 * Brand tokens used across all email templates.
 * Edit here to apply changes globally without touching individual templates.
 */
export const brand = {
  name: "OpsPilot AI",
  tagline: "Intelligent Operations, Automated.",
  logoUrl: "https://opspilot.ai/logo.png",
  websiteUrl: "https://opspilot.ai",
  supportEmail: "support@opspilot.ai",

  colors: {
    primary: "#3B82F6",       // blue-500
    primaryDark: "#1D4ED8",   // blue-700
    success: "#10B981",       // emerald-500
    warning: "#F59E0B",       // amber-500
    danger: "#EF4444",        // red-500
    background: "#F9FAFB",    // gray-50
    surface: "#FFFFFF",
    border: "#E5E7EB",        // gray-200
    textPrimary: "#111827",   // gray-900
    textSecondary: "#6B7280", // gray-500
    textMuted: "#9CA3AF",     // gray-400
    footer: "#374151",        // gray-700
  },

  fonts: {
    sans: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    mono: "'Courier New', Courier, monospace",
  },

  spacing: {
    containerWidth: "600px",
    contentPadding: "32px",
    sectionGap: "24px",
  },
} as const

export type Brand = typeof brand
