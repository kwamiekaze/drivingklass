/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { brand, SITE, SITE_URL, SUPPORT_PHONE } from './_shared.ts'

interface Props {
  recipientName?: string
}

const Email = ({ recipientName }: Props) => (
  <Html>
    <Head />
    <Preview>Your DrivingKlass account is ready — check your inbox for your password link</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <Heading style={brand.h1}>Welcome to {SITE}</Heading>
        <Text style={brand.text}>Hi {recipientName || 'there'},</Text>
        <Text style={brand.text}>
          We received your message and created a student intake for you.
          In a moment you’ll receive a separate email with a secure link to set your password.
          Click that link, choose a password, and you’ll be signed in to your student portal automatically.
        </Text>
        <Text style={brand.text}>
          Once you’re in, your intake will be reviewed by our team. We’ll follow up once it’s approved.
        </Text>
        <Text style={brand.muted}>Need help? Call us at {SUPPORT_PHONE}.</Text>
        <Text style={brand.footer}>{SITE} • {SITE_URL}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Your DrivingKlass intake is set up — set your password next',
  displayName: 'Intake Converted',
  previewData: { recipientName: 'Alex' },
} satisfies TemplateEntry
