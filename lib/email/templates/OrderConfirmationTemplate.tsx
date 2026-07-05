import * as React from "react"
import { Text, Row, Column, Section } from "@react-email/components"
import { EmailLayout } from "./layout/EmailLayout"
import { InfoRow, SectionHeading, Divider, CalloutBox, StatusBadge } from "./layout/Primitives"
import { brand } from "./branding"

export interface OrderItem {
  productName: string
  sku: string
  quantity: number
  unitPrice: number
}

export interface OrderConfirmationTemplateProps {
  customerName: string
  customerEmail: string
  orderId: string
  items: OrderItem[]
  totalAmount: number
  estimatedDelivery?: string
  shippingAddress?: string
  trackingUrl?: string
  orderPlacedAt?: string
}

export function OrderConfirmationTemplate({
  customerName,
  orderId,
  items,
  totalAmount,
  estimatedDelivery,
  shippingAddress,
  trackingUrl,
  orderPlacedAt,
}: OrderConfirmationTemplateProps) {
  const placedDisplay = orderPlacedAt
    ? new Date(orderPlacedAt).toLocaleString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : new Date().toLocaleString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })

  const deliveryDisplay = estimatedDelivery
    ? new Date(estimatedDelivery).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "3–5 business days"

  return (
    <EmailLayout
      preview={`Order confirmed! Your order ${orderId} is being processed.`}
      footerNote="Thank you for your order. You'll receive a shipping confirmation once your items are dispatched."
    >
      {/* Success banner */}
      <Section
        style={{
          backgroundColor: brand.colors.success + "14",
          border: `1px solid ${brand.colors.success}44`,
          borderRadius: "6px",
          padding: "16px 20px",
          marginBottom: "28px",
          textAlign: "center" as const,
        }}
      >
        <Text
          style={{
            margin: 0,
            fontSize: "28px",
            lineHeight: 1,
          }}
        >
          ✅
        </Text>
        <Text
          style={{
            margin: "8px 0 4px 0",
            fontSize: "18px",
            fontWeight: "800",
            color: brand.colors.success,
          }}
        >
          Order Confirmed!
        </Text>
        <Text
          style={{
            margin: 0,
            fontSize: "12px",
            color: brand.colors.textSecondary,
          }}
        >
          Your order is being processed and will ship soon.
        </Text>
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
        Hi <strong>{customerName}</strong>, thank you for your order! Here are your order details:
      </Text>

      {/* Order summary */}
      <SectionHeading accent={brand.colors.success}>Order Summary</SectionHeading>
      <InfoRow label="Order ID" value={orderId} />
      <InfoRow label="Placed On" value={placedDisplay} />
      <InfoRow label="Est. Delivery" value={deliveryDisplay} />
      {shippingAddress && <InfoRow label="Ship To" value={shippingAddress} />}

      <Divider />

      {/* Items */}
      <SectionHeading>Items Ordered</SectionHeading>

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
          <Column style={{ width: "45%" }}>
            <Text style={{ margin: 0, fontSize: "10px", fontWeight: "700", color: brand.colors.textSecondary, textTransform: "uppercase" as const }}>
              Product
            </Text>
          </Column>
          <Column style={{ width: "15%", textAlign: "center" as const }}>
            <Text style={{ margin: 0, fontSize: "10px", fontWeight: "700", color: brand.colors.textSecondary, textTransform: "uppercase" as const }}>
              SKU
            </Text>
          </Column>
          <Column style={{ width: "15%", textAlign: "center" as const }}>
            <Text style={{ margin: 0, fontSize: "10px", fontWeight: "700", color: brand.colors.textSecondary, textTransform: "uppercase" as const }}>
              Qty
            </Text>
          </Column>
          <Column style={{ width: "25%", textAlign: "right" as const }}>
            <Text style={{ margin: 0, fontSize: "10px", fontWeight: "700", color: brand.colors.textSecondary, textTransform: "uppercase" as const }}>
              Subtotal
            </Text>
          </Column>
        </Row>
      </Section>

      {items.map((item, i) => (
        <Section
          key={i}
          style={{
            padding: "10px 12px",
            borderBottom: `1px solid ${brand.colors.border}`,
          }}
        >
          <Row>
            <Column style={{ width: "45%" }}>
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
              <Text style={{ margin: 0, fontSize: "13px", color: brand.colors.textPrimary }}>
                ×{item.quantity}
              </Text>
            </Column>
            <Column style={{ width: "25%", textAlign: "right" as const }}>
              <Text style={{ margin: 0, fontSize: "13px", color: brand.colors.textPrimary, fontWeight: "600" }}>
                ${(item.quantity * item.unitPrice).toFixed(2)}
              </Text>
            </Column>
          </Row>
        </Section>
      ))}

      {/* Total */}
      <Section style={{ padding: "14px 12px 0 12px" }}>
        <Row>
          <Column style={{ textAlign: "right" as const }}>
            <Text style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: brand.colors.textPrimary }}>
              Total:{" "}
              <span style={{ color: brand.colors.success }}>${totalAmount.toFixed(2)}</span>
            </Text>
          </Column>
        </Row>
      </Section>

      <Divider margin="24px 0" />

      {/* Tracking CTA */}
      {trackingUrl ? (
        <>
          <Text style={{ margin: "0 0 12px 0", fontSize: "13px", color: brand.colors.textSecondary }}>
            Track your shipment in real-time:
          </Text>
          <a
            href={trackingUrl}
            style={{
              display: "inline-block",
              backgroundColor: brand.colors.success,
              color: "#FFFFFF",
              fontSize: "13px",
              fontWeight: "700",
              padding: "10px 24px",
              borderRadius: "6px",
              textDecoration: "none",
            }}
          >
            Track Order →
          </a>
        </>
      ) : (
        <CalloutBox>
          <Text style={{ margin: 0, fontSize: "13px", color: brand.colors.textSecondary, lineHeight: "21px" }}>
            A tracking number will be sent to you once your order ships. Expected delivery:{" "}
            <strong>{deliveryDisplay}</strong>.
          </Text>
        </CalloutBox>
      )}

      <Divider margin="24px 0 0 0" />
      <Text
        style={{
          fontSize: "12px",
          color: brand.colors.textMuted,
          margin: "16px 0 0 0",
          lineHeight: "20px",
        }}
      >
        Questions about your order? Contact us at{" "}
        <a href={`mailto:${brand.supportEmail}`} style={{ color: brand.colors.primary }}>
          {brand.supportEmail}
        </a>
      </Text>
    </EmailLayout>
  )
}

export function buildOrderConfirmationTemplate(props: OrderConfirmationTemplateProps) {
  return {
    subject: `Order Confirmed — ${props.orderId}`,
    component: <OrderConfirmationTemplate {...props} />,
  }
}
