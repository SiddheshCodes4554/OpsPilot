import * as React from "react"
import { Text, Section } from "@react-email/components"
import { EmailLayout } from "./layout/EmailLayout"
import { Divider, SectionHeading } from "./layout/Primitives"
import { brand } from "./branding"

export interface CustomerReplyTemplateProps {
  customerName: string
  originalSubject: string
  replyBody: string
  agentName?: string
}

export function CustomerReplyTemplate({
  customerName,
  originalSubject,
  replyBody,
  agentName = "OpsPilot Support",
}: CustomerReplyTemplateProps) {
  return (
    <EmailLayout
      preview={`Re: ${originalSubject} — Reply from ${brand.name}`}
      footerNote={`This reply was drafted by ${brand.name} on behalf of our support team.`}
    >
      {/* Greeting */}
      <Text
        style={{
          fontSize: "14px",
          color: brand.colors.textPrimary,
          lineHeight: "22px",
          margin: "0 0 20px 0",
        }}
      >
        Dear <strong>{customerName}</strong>,
      </Text>

      {/* In-reply-to label */}
      <Section
        style={{
          backgroundColor: brand.colors.background,
          border: `1px solid ${brand.colors.border}`,
          borderRadius: "4px",
          padding: "8px 14px",
          marginBottom: "20px",
        }}
      >
        <Text
          style={{
            fontSize: "11px",
            color: brand.colors.textMuted,
            margin: 0,
            textTransform: "uppercase" as const,
            letterSpacing: "0.4px",
          }}
        >
          In Reply To
        </Text>
        <Text
          style={{
            fontSize: "13px",
            color: brand.colors.textSecondary,
            margin: "2px 0 0 0",
            fontWeight: "600",
          }}
        >
          {originalSubject}
        </Text>
      </Section>

      <SectionHeading>Our Response</SectionHeading>

      {/* Reply body */}
      <Text
        style={{
          fontSize: "14px",
          color: brand.colors.textPrimary,
          lineHeight: "24px",
          margin: "0 0 24px 0",
          whiteSpace: "pre-wrap" as const,
        }}
      >
        {replyBody}
      </Text>

      <Divider />

      {/* Sign-off */}
      <Text
        style={{
          fontSize: "13px",
          color: brand.colors.textSecondary,
          margin: "16px 0 0 0",
          lineHeight: "20px",
        }}
      >
        Warm regards,
        <br />
        <strong>{agentName}</strong>
        <br />
        <span style={{ color: brand.colors.textMuted, fontSize: "12px" }}>
          {brand.name} — {brand.supportEmail}
        </span>
      </Text>
    </EmailLayout>
  )
}

/**
 * Generates the subject, HTML, and plain text for a customer reply email.
 */
export function buildCustomerReplyTemplate(props: CustomerReplyTemplateProps) {
  return {
    subject: `Re: ${props.originalSubject}`,
    component: <CustomerReplyTemplate {...props} />,
  }
}
