import * as React from "react"
import { Text, Row, Column, Section } from "@react-email/components"
import { EmailLayout } from "./layout/EmailLayout"
import { InfoRow, SectionHeading, Divider, CalloutBox, StatusBadge } from "./layout/Primitives"
import { brand } from "./branding"

export type ApprovalType = "REFUND" | "PURCHASE_ORDER" | "RETURN" | "CUSTOM"

const approvalTypeLabels: Record<ApprovalType, string> = {
  REFUND: "Refund Request",
  PURCHASE_ORDER: "Purchase Order",
  RETURN: "Return Request",
  CUSTOM: "Approval Request",
}

const approvalTypeColors: Record<ApprovalType, string> = {
  REFUND: brand.colors.danger,
  PURCHASE_ORDER: brand.colors.primary,
  RETURN: brand.colors.warning,
  CUSTOM: brand.colors.textSecondary,
}

export interface ApprovalRequestTemplateProps {
  approvalId: string
  type: ApprovalType
  reviewerName: string
  requesterName: string
  requesterEmail: string
  summary: string
  amount?: number
  details?: Record<string, string>
  approveUrl?: string
  rejectUrl?: string
  deadline?: string
}

export function ApprovalRequestTemplate({
  approvalId,
  type,
  reviewerName,
  requesterName,
  requesterEmail,
  summary,
  amount,
  details,
  approveUrl,
  rejectUrl,
  deadline,
}: ApprovalRequestTemplateProps) {
  const typeLabel = approvalTypeLabels[type]
  const typeColor = approvalTypeColors[type]
  const deadlineDisplay = deadline
    ? new Date(deadline).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : null

  return (
    <EmailLayout
      preview={`${typeLabel} requires your approval — ID ${approvalId}`}
      footerNote="This approval request was generated automatically by OpsPilot AI. Do not forward this email."
    >
      {/* Urgency banner */}
      <Section
        style={{
          backgroundColor: typeColor + "14",
          border: `1px solid ${typeColor}44`,
          borderRadius: "6px",
          padding: "12px 16px",
          marginBottom: "24px",
        }}
      >
        <Row>
          <Column style={{ verticalAlign: "middle" as const }}>
            <Text
              style={{
                margin: 0,
                fontSize: "13px",
                fontWeight: "700",
                color: typeColor,
              }}
            >
              ⚡ Action Required — {typeLabel}
            </Text>
          </Column>
          <Column style={{ textAlign: "right" as const, verticalAlign: "middle" as const }}>
            <StatusBadge label="PENDING" color={typeColor} />
          </Column>
        </Row>
      </Section>

      {/* Greeting */}
      <Text
        style={{
          fontSize: "14px",
          color: brand.colors.textPrimary,
          lineHeight: "22px",
          margin: "0 0 20px 0",
        }}
      >
        Dear <strong>{reviewerName}</strong>,
      </Text>

      <Text
        style={{
          fontSize: "14px",
          color: brand.colors.textSecondary,
          lineHeight: "22px",
          margin: "0 0 20px 0",
        }}
      >
        The following <strong>{typeLabel.toLowerCase()}</strong> has been submitted and requires your review and decision.
      </Text>

      {/* Request details */}
      <SectionHeading accent={typeColor}>Request Details</SectionHeading>
      <InfoRow label="Approval ID" value={approvalId} />
      <InfoRow label="Type" value={typeLabel} />
      <InfoRow label="Requested by" value={`${requesterName} <${requesterEmail}>`} />
      {amount !== undefined && (
        <InfoRow label="Amount" value={`₹${amount.toFixed(2)}`} />
      )}
      {deadlineDisplay && (
        <InfoRow label="Deadline" value={deadlineDisplay} />
      )}

      {/* Extra details */}
      {details && Object.entries(details).map(([key, value]) => (
        <InfoRow key={key} label={key} value={value} />
      ))}

      <Divider />

      {/* Summary */}
      <SectionHeading>Summary</SectionHeading>
      <CalloutBox backgroundColor={typeColor + "0A"} borderColor={typeColor + "33"}>
        <Text
          style={{
            margin: 0,
            fontSize: "13px",
            color: brand.colors.textPrimary,
            lineHeight: "22px",
          }}
        >
          {summary}
        </Text>
      </CalloutBox>

      {/* Action buttons — only shown if URLs provided */}
      {(approveUrl || rejectUrl) && (
        <>
          <Divider margin="24px 0 20px 0" />
          <SectionHeading>Your Decision</SectionHeading>
          <Row>
            {approveUrl && (
              <Column style={{ paddingRight: "8px" }}>
                <a
                  href={approveUrl}
                  style={{
                    display: "inline-block",
                    backgroundColor: brand.colors.success,
                    color: "#FFFFFF",
                    fontSize: "13px",
                    fontWeight: "700",
                    padding: "10px 24px",
                    borderRadius: "6px",
                    textDecoration: "none",
                    letterSpacing: "0.3px",
                  }}
                >
                  ✓ Approve
                </a>
              </Column>
            )}
            {rejectUrl && (
              <Column>
                <a
                  href={rejectUrl}
                  style={{
                    display: "inline-block",
                    backgroundColor: brand.colors.danger,
                    color: "#FFFFFF",
                    fontSize: "13px",
                    fontWeight: "700",
                    padding: "10px 24px",
                    borderRadius: "6px",
                    textDecoration: "none",
                    letterSpacing: "0.3px",
                  }}
                >
                  ✕ Reject
                </a>
              </Column>
            )}
          </Row>
          <Text
            style={{
              fontSize: "11px",
              color: brand.colors.textMuted,
              margin: "12px 0 0 0",
            }}
          >
            Alternatively, log in to the{" "}
            <a href={brand.websiteUrl} style={{ color: brand.colors.primary }}>
              OpsPilot dashboard
            </a>{" "}
            to manage this request.
          </Text>
        </>
      )}

      <Divider margin="24px 0 0 0" />
      <Text
        style={{
          fontSize: "11px",
          color: brand.colors.textMuted,
          margin: "16px 0 0 0",
        }}
      >
        Approval Reference: <strong style={{ fontFamily: brand.fonts.mono }}>{approvalId}</strong>
      </Text>
    </EmailLayout>
  )
}

export function buildApprovalRequestTemplate(props: ApprovalRequestTemplateProps) {
  const typeLabel = approvalTypeLabels[props.type]
  return {
    subject: `[Action Required] ${typeLabel} — ID ${props.approvalId}`,
    component: <ApprovalRequestTemplate {...props} />,
  }
}
