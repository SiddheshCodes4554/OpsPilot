import * as React from "react"
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Row,
  Column,
  Text,
  Hr,
  Link,
} from "@react-email/components"
import { brand } from "../branding"

interface EmailLayoutProps {
  preview?: string
  children: React.ReactNode
  /** Override footer tagline per template */
  footerNote?: string
}

export function EmailLayout({ preview, children, footerNote }: EmailLayoutProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head>
        {preview && (
          <meta name="description" content={preview} />
        )}
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </Head>
      <Body
        style={{
          backgroundColor: brand.colors.background,
          fontFamily: brand.fonts.sans,
          margin: 0,
          padding: "40px 0",
        }}
      >
        <Container
          style={{
            maxWidth: brand.spacing.containerWidth,
            margin: "0 auto",
            backgroundColor: brand.colors.surface,
            borderRadius: "8px",
            border: `1px solid ${brand.colors.border}`,
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <Section
            style={{
              backgroundColor: brand.colors.primary,
              padding: "20px 32px",
            }}
          >
            <Row>
              <Column>
                <Text
                  style={{
                    color: "#FFFFFF",
                    fontSize: "20px",
                    fontWeight: "700",
                    margin: 0,
                    letterSpacing: "-0.3px",
                  }}
                >
                  {brand.name}
                </Text>
                <Text
                  style={{
                    color: "rgba(255,255,255,0.75)",
                    fontSize: "11px",
                    margin: "2px 0 0 0",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  {brand.tagline}
                </Text>
              </Column>
            </Row>
          </Section>

          {/* Body */}
          <Section
            style={{
              padding: brand.spacing.contentPadding,
            }}
          >
            {children}
          </Section>

          {/* Footer */}
          <Hr style={{ borderColor: brand.colors.border, margin: 0 }} />
          <Section
            style={{
              backgroundColor: brand.colors.background,
              padding: "20px 32px",
            }}
          >
            <Text
              style={{
                color: brand.colors.textMuted,
                fontSize: "11px",
                lineHeight: "18px",
                margin: 0,
                textAlign: "center" as const,
              }}
            >
              {footerNote || `This is an automated message from ${brand.name}.`}
              {" "}
              <Link
                href={brand.websiteUrl}
                style={{ color: brand.colors.textMuted, textDecoration: "underline" }}
              >
                {brand.websiteUrl}
              </Link>
            </Text>
            <Text
              style={{
                color: brand.colors.textMuted,
                fontSize: "10px",
                margin: "8px 0 0 0",
                textAlign: "center" as const,
              }}
            >
              © {new Date().getFullYear()} {brand.name}. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
