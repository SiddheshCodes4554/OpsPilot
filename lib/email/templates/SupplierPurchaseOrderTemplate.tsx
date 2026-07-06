import * as React from "react"
import { Text, Row, Column, Section } from "@react-email/components"
import { EmailLayout } from "./layout/EmailLayout"
import { InfoRow, SectionHeading, Divider, CalloutBox, StatusBadge } from "./layout/Primitives"
import { brand } from "./branding"

export interface PurchaseOrderItem {
  productName: string
  sku: string
  quantity: number
  unitPrice: number
}

export interface SupplierPurchaseOrderTemplateProps {
  supplierName: string
  contactName: string
  supplierEmail: string
  poReference: string
  items: PurchaseOrderItem[]
  totalAmount: number
  eta?: string
  notes?: string
  issuedBy?: string
}

export function SupplierPurchaseOrderTemplate({
  supplierName,
  contactName,
  poReference,
  items,
  totalAmount,
  eta,
  notes,
  issuedBy = "OpsPilot Procurement",
}: SupplierPurchaseOrderTemplateProps) {
  const etaDisplay = eta
    ? new Date(eta).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "To be confirmed"

  return (
    <EmailLayout
      preview={`Purchase Order ${poReference} — ${brand.name}`}
      footerNote="This is an official purchase order issued by OpsPilot AI. Please retain this for your records."
    >
      {/* Header row */}
      <Row style={{ marginBottom: "24px" }}>
        <Column>
          <Text
            style={{
              fontSize: "22px",
              fontWeight: "700",
              color: brand.colors.textPrimary,
              margin: 0,
            }}
          >
            Purchase Order
          </Text>
          <Text
            style={{
              fontSize: "13px",
              color: brand.colors.textSecondary,
              margin: "4px 0 0 0",
            }}
          >
            Reference: <strong style={{ color: brand.colors.primary }}>{poReference}</strong>
          </Text>
        </Column>
        <Column style={{ textAlign: "right" as const }}>
          <StatusBadge label="Approved" color={brand.colors.success} />
        </Column>
      </Row>

      {/* Supplier details */}
      <SectionHeading>Supplier Details</SectionHeading>
      <InfoRow label="Supplier" value={supplierName} />
      <InfoRow label="Contact" value={contactName} />
      <InfoRow label="Expected Delivery" value={etaDisplay} />

      <Divider />

      {/* Line items */}
      <SectionHeading>Order Items</SectionHeading>

      {/* Table header */}
      <Section
        style={{
          backgroundColor: brand.colors.background,
          borderRadius: "4px",
          padding: "8px 12px",
          marginBottom: "4px",
        }}
      >
        <Row>
          <Column style={{ width: "40%" }}>
            <Text style={{ margin: 0, fontSize: "11px", fontWeight: "700", color: brand.colors.textSecondary, textTransform: "uppercase" as const }}>
              Product
            </Text>
          </Column>
          <Column style={{ width: "15%", textAlign: "center" as const }}>
            <Text style={{ margin: 0, fontSize: "11px", fontWeight: "700", color: brand.colors.textSecondary, textTransform: "uppercase" as const }}>
              SKU
            </Text>
          </Column>
          <Column style={{ width: "15%", textAlign: "center" as const }}>
            <Text style={{ margin: 0, fontSize: "11px", fontWeight: "700", color: brand.colors.textSecondary, textTransform: "uppercase" as const }}>
              Qty
            </Text>
          </Column>
          <Column style={{ width: "15%", textAlign: "center" as const }}>
            <Text style={{ margin: 0, fontSize: "11px", fontWeight: "700", color: brand.colors.textSecondary, textTransform: "uppercase" as const }}>
              Unit Price
            </Text>
          </Column>
          <Column style={{ width: "15%", textAlign: "right" as const }}>
            <Text style={{ margin: 0, fontSize: "11px", fontWeight: "700", color: brand.colors.textSecondary, textTransform: "uppercase" as const }}>
              Subtotal
            </Text>
          </Column>
        </Row>
      </Section>

      {/* Line items */}
      {items.map((item, i) => (
        <Section
          key={i}
          style={{
            padding: "10px 12px",
            borderBottom: `1px solid ${brand.colors.border}`,
          }}
        >
          <Row>
            <Column style={{ width: "40%" }}>
              <Text style={{ margin: 0, fontSize: "13px", color: brand.colors.textPrimary, fontWeight: "600" }}>
                {item.productName}
              </Text>
            </Column>
            <Column style={{ width: "15%", textAlign: "center" as const }}>
              <Text style={{ margin: 0, fontSize: "12px", color: brand.colors.textSecondary, fontFamily: brand.fonts.mono }}>
                {item.sku}
              </Text>
            </Column>
            <Column style={{ width: "15%", textAlign: "center" as const }}>
              <Text style={{ margin: 0, fontSize: "13px", color: brand.colors.textPrimary }}>
                {item.quantity}
              </Text>
            </Column>
             <Column style={{ width: "15%", textAlign: "center" as const }}>
              <Text style={{ margin: 0, fontSize: "13px", color: brand.colors.textPrimary }}>
                ₹{item.unitPrice.toFixed(2)}
              </Text>
            </Column>
            <Column style={{ width: "15%", textAlign: "right" as const }}>
              <Text style={{ margin: 0, fontSize: "13px", color: brand.colors.textPrimary, fontWeight: "600" }}>
                ₹{(item.quantity * item.unitPrice).toFixed(2)}
              </Text>
            </Column>
          </Row>
        </Section>
      ))}

      {/* Total */}
      <Section style={{ padding: "14px 12px 0 12px" }}>
        <Row>
          <Column style={{ textAlign: "right" as const }}>
            <Text style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: brand.colors.textPrimary }}>
              Total: <span style={{ color: brand.colors.primary }}>₹{totalAmount.toFixed(2)}</span>
            </Text>
          </Column>
        </Row>
      </Section>


      {/* Notes */}
      {notes && (
        <>
          <Divider margin="20px 0" />
          <SectionHeading>Notes</SectionHeading>
          <CalloutBox>
            <Text
              style={{
                margin: 0,
                fontSize: "13px",
                color: brand.colors.textSecondary,
                lineHeight: "22px",
              }}
            >
              {notes}
            </Text>
          </CalloutBox>
        </>
      )}

      <Divider />

      <Text
        style={{
          fontSize: "12px",
          color: brand.colors.textMuted,
          margin: "16px 0 0 0",
        }}
      >
        Issued by <strong>{issuedBy}</strong>. Please confirm receipt and expected delivery by replying to this email.
      </Text>
    </EmailLayout>
  )
}

export function buildSupplierPurchaseOrderTemplate(props: SupplierPurchaseOrderTemplateProps) {
  return {
    subject: `Purchase Order ${props.poReference} — ${brand.name}`,
    component: <SupplierPurchaseOrderTemplate {...props} />,
  }
}
