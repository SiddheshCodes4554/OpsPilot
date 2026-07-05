import * as React from "react"
import { Section, Row, Column, Text, Hr } from "@react-email/components"
import { brand } from "../branding"

interface InfoRowProps {
  label: string
  value: string
}

/**
 * Reusable key-value info row — used in PO, Order Confirmation, and Approval templates.
 */
export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <Row style={{ marginBottom: "10px" }}>
      <Column style={{ width: "40%", verticalAlign: "top" as const }}>
        <Text
          style={{
            margin: 0,
            fontSize: "12px",
            color: brand.colors.textSecondary,
            fontWeight: "600",
          }}
        >
          {label}
        </Text>
      </Column>
      <Column style={{ width: "60%", verticalAlign: "top" as const }}>
        <Text
          style={{
            margin: 0,
            fontSize: "12px",
            color: brand.colors.textPrimary,
          }}
        >
          {value}
        </Text>
      </Column>
    </Row>
  )
}

interface StatusBadgeProps {
  label: string
  color?: string
}

/**
 * Inline status pill badge — used in alerts and approval requests.
 */
export function StatusBadge({ label, color = brand.colors.primary }: StatusBadgeProps) {
  return (
    <span
      style={{
        display: "inline-block",
        backgroundColor: color + "22",
        color,
        fontSize: "10px",
        fontWeight: "700",
        padding: "3px 8px",
        borderRadius: "4px",
        textTransform: "uppercase" as const,
        letterSpacing: "0.5px",
        border: `1px solid ${color}44`,
      }}
    >
      {label}
    </span>
  )
}

interface SectionHeadingProps {
  children: React.ReactNode
  accent?: string
}

/**
 * Section heading with optional left accent bar.
 */
export function SectionHeading({ children, accent = brand.colors.primary }: SectionHeadingProps) {
  return (
    <Text
      style={{
        fontSize: "15px",
        fontWeight: "700",
        color: brand.colors.textPrimary,
        margin: "0 0 16px 0",
        paddingLeft: "10px",
        borderLeft: `3px solid ${accent}`,
      }}
    >
      {children}
    </Text>
  )
}

interface DividerProps {
  margin?: string
}

export function Divider({ margin = "24px 0" }: DividerProps) {
  return <Hr style={{ borderColor: brand.colors.border, margin }} />
}

interface CalloutBoxProps {
  children: React.ReactNode
  backgroundColor?: string
  borderColor?: string
}

/**
 * Highlighted callout / info box.
 */
export function CalloutBox({
  children,
  backgroundColor = brand.colors.primary + "0F",
  borderColor = brand.colors.primary + "44",
}: CalloutBoxProps) {
  return (
    <Section
      style={{
        backgroundColor,
        border: `1px solid ${borderColor}`,
        borderRadius: "6px",
        padding: "16px 20px",
        margin: "16px 0",
      }}
    >
      {children}
    </Section>
  )
}
