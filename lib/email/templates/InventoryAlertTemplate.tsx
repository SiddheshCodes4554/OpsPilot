import * as React from "react"
import { Text, Row, Column, Section } from "@react-email/components"
import { EmailLayout } from "./layout/EmailLayout"
import { InfoRow, SectionHeading, Divider, CalloutBox, StatusBadge } from "./layout/Primitives"
import { brand } from "./branding"

export type AlertSeverity = "WARNING" | "CRITICAL" | "INFO"

const severityConfig: Record<AlertSeverity, { label: string; color: string; icon: string }> = {
  CRITICAL: { label: "Critical", color: brand.colors.danger, icon: "🔴" },
  WARNING: { label: "Warning", color: brand.colors.warning, icon: "🟡" },
  INFO: { label: "Info", color: brand.colors.primary, icon: "🔵" },
}

export interface InventoryAlertItem {
  productName: string
  sku: string
  currentStock: number
  threshold: number
  reservedStock?: number
  supplierName?: string
}

export interface InventoryAlertTemplateProps {
  severity: AlertSeverity
  recipientName: string
  alertTitle: string
  alertMessage: string
  items: InventoryAlertItem[]
  triggeredAt?: string
  dashboardUrl?: string
}

export function InventoryAlertTemplate({
  severity,
  recipientName,
  alertTitle,
  alertMessage,
  items,
  triggeredAt,
  dashboardUrl = brand.websiteUrl,
}: InventoryAlertTemplateProps) {
  const config = severityConfig[severity]
  const triggeredDisplay = triggeredAt
    ? new Date(triggeredAt).toLocaleString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })

  return (
    <EmailLayout
      preview={`${config.icon} ${config.label} — ${alertTitle}`}
      footerNote="This inventory alert was triggered automatically by the OpsPilot AI monitoring system."
    >
      {/* Severity Banner */}
      <Section
        style={{
          backgroundColor: config.color + "14",
          border: `1px solid ${config.color}44`,
          borderRadius: "6px",
          padding: "14px 18px",
          marginBottom: "24px",
        }}
      >
        <Row>
          <Column>
            <Text
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: "800",
                color: config.color,
                letterSpacing: "-0.2px",
              }}
            >
              {config.icon} {alertTitle}
            </Text>
            <Text style={{ margin: "4px 0 0 0", fontSize: "11px", color: brand.colors.textMuted }}>
              Triggered: {triggeredDisplay}
            </Text>
          </Column>
          <Column style={{ textAlign: "right" as const, verticalAlign: "top" as const }}>
            <StatusBadge label={config.label} color={config.color} />
          </Column>
        </Row>
      </Section>

      {/* Greeting */}
      <Text
        style={{
          fontSize: "14px",
          color: brand.colors.textPrimary,
          margin: "0 0 16px 0",
        }}
      >
        Dear <strong>{recipientName}</strong>,
      </Text>

      <CalloutBox backgroundColor={config.color + "0A"} borderColor={config.color + "33"}>
        <Text
          style={{
            margin: 0,
            fontSize: "13px",
            color: brand.colors.textPrimary,
            lineHeight: "22px",
          }}
        >
          {alertMessage}
        </Text>
      </CalloutBox>

      <Divider margin="24px 0" />

      {/* Affected products table */}
      <SectionHeading accent={config.color}>Affected Products</SectionHeading>

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
          <Column style={{ width: "35%" }}>
            <Text style={{ margin: 0, fontSize: "10px", fontWeight: "700", color: brand.colors.textSecondary, textTransform: "uppercase" as const }}>Product</Text>
          </Column>
          <Column style={{ width: "15%", textAlign: "center" as const }}>
            <Text style={{ margin: 0, fontSize: "10px", fontWeight: "700", color: brand.colors.textSecondary, textTransform: "uppercase" as const }}>SKU</Text>
          </Column>
          <Column style={{ width: "15%", textAlign: "center" as const }}>
            <Text style={{ margin: 0, fontSize: "10px", fontWeight: "700", color: brand.colors.textSecondary, textTransform: "uppercase" as const }}>Stock</Text>
          </Column>
          <Column style={{ width: "15%", textAlign: "center" as const }}>
            <Text style={{ margin: 0, fontSize: "10px", fontWeight: "700", color: brand.colors.textSecondary, textTransform: "uppercase" as const }}>Threshold</Text>
          </Column>
          <Column style={{ width: "20%", textAlign: "right" as const }}>
            <Text style={{ margin: 0, fontSize: "10px", fontWeight: "700", color: brand.colors.textSecondary, textTransform: "uppercase" as const }}>Supplier</Text>
          </Column>
        </Row>
      </Section>

      {items.map((item, i) => {
        const isCritical = item.currentStock <= item.threshold * 0.5
        const stockColor = isCritical ? brand.colors.danger : config.color

        return (
          <Section
            key={i}
            style={{
              padding: "10px 12px",
              borderBottom: `1px solid ${brand.colors.border}`,
            }}
          >
            <Row>
              <Column style={{ width: "35%" }}>
                <Text style={{ margin: 0, fontSize: "13px", color: brand.colors.textPrimary, fontWeight: "600" }}>
                  {item.productName}
                </Text>
              </Column>
              <Column style={{ width: "15%", textAlign: "center" as const }}>
                <Text style={{ margin: 0, fontSize: "11px", color: brand.colors.textSecondary, fontFamily: brand.fonts.mono }}>
                  {item.sku}
                </Text>
              </Column>
              <Column style={{ width: "15%", textAlign: "center" as const }}>
                <Text style={{ margin: 0, fontSize: "13px", fontWeight: "700", color: stockColor }}>
                  {item.currentStock}
                </Text>
              </Column>
              <Column style={{ width: "15%", textAlign: "center" as const }}>
                <Text style={{ margin: 0, fontSize: "13px", color: brand.colors.textSecondary }}>
                  {item.threshold}
                </Text>
              </Column>
              <Column style={{ width: "20%", textAlign: "right" as const }}>
                <Text style={{ margin: 0, fontSize: "12px", color: brand.colors.textSecondary }}>
                  {item.supplierName || "—"}
                </Text>
              </Column>
            </Row>
          </Section>
        )
      })}

      <Divider margin="24px 0" />

      {/* CTA */}
      <Row>
        <Column>
          <Text style={{ margin: "0 0 12px 0", fontSize: "13px", color: brand.colors.textSecondary }}>
            Review the inventory dashboard to trigger replenishment orders.
          </Text>
          <a
            href={dashboardUrl}
            style={{
              display: "inline-block",
              backgroundColor: config.color,
              color: "#FFFFFF",
              fontSize: "13px",
              fontWeight: "700",
              padding: "10px 24px",
              borderRadius: "6px",
              textDecoration: "none",
            }}
          >
            View Inventory Dashboard →
          </a>
        </Column>
      </Row>
    </EmailLayout>
  )
}

export function buildInventoryAlertTemplate(props: InventoryAlertTemplateProps) {
  const config = severityConfig[props.severity]
  return {
    subject: `[${config.label.toUpperCase()}] Inventory Alert — ${props.alertTitle}`,
    component: <InventoryAlertTemplate {...props} />,
  }
}
