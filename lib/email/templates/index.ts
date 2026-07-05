/**
 * Template Renderer — converts React Email components to { subject, html, text }.
 *
 * Usage:
 *   import { renderTemplate } from "@/lib/email/templates"
 *   import { buildOrderConfirmationTemplate } from "@/lib/email/templates/OrderConfirmationTemplate"
 *
 *   const { subject, html, text } = await renderTemplate(
 *     buildOrderConfirmationTemplate({ ... })
 *   )
 */

import { render } from "@react-email/render"
import * as React from "react"

export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

export interface TemplateDescriptor {
  subject: string
  component: React.ReactElement
}

/**
 * Render a template descriptor produced by any `build*Template()` function.
 * Returns a plain { subject, html, text } object ready to pass to EmailService.
 */
export async function renderTemplate(descriptor: TemplateDescriptor): Promise<RenderedEmail> {
  const [html, text] = await Promise.all([
    render(descriptor.component, { plainText: false }),
    render(descriptor.component, { plainText: true }),
  ])

  return {
    subject: descriptor.subject,
    html,
    text,
  }
}

// Re-export all template builders for convenient single-import access
export { buildCustomerReplyTemplate } from "./CustomerReplyTemplate"
export type { CustomerReplyTemplateProps } from "./CustomerReplyTemplate"

export { buildSupplierPurchaseOrderTemplate } from "./SupplierPurchaseOrderTemplate"
export type { SupplierPurchaseOrderTemplateProps, PurchaseOrderItem } from "./SupplierPurchaseOrderTemplate"

export { buildApprovalRequestTemplate } from "./ApprovalRequestTemplate"
export type { ApprovalRequestTemplateProps, ApprovalType } from "./ApprovalRequestTemplate"

export { buildInventoryAlertTemplate } from "./InventoryAlertTemplate"
export type { InventoryAlertTemplateProps, InventoryAlertItem, AlertSeverity } from "./InventoryAlertTemplate"

export { buildOrderConfirmationTemplate } from "./OrderConfirmationTemplate"
export type { OrderConfirmationTemplateProps, OrderItem } from "./OrderConfirmationTemplate"
