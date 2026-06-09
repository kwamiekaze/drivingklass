/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { brand, SITE, SITE_URL, SUPPORT_PHONE } from './_shared.ts'

interface Props {
  recipientName?: string
  portalUrl?: string
}

const Email = ({ recipientName, portalUrl = `${SITE_URL}/login` }: Props) => (
  <Html>
    <Head />
    <Preview>Your DrivingKlass intake is approved — let’s schedule your lessons</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <Heading style={brand.h1}>Your intake has been accepted 🎉</Heading>
        <Text style={brand.text}>Hi {recipientName || 'there'},</Text>
        <Text style={brand.text}>
          Great news — your intake has been reviewed and approved. You’re officially set up as a {SITE} student.
        </Text>
        <Text style={brand.text}>
          To sign in, head to our homepage and <strong>tap the gold car in the center of the packages</strong> —
          that’s your login. If you aren’t logged in automatically after updating your password,
          just tap the gold car again to sign in.
        </Text>
        <Text style={brand.text}>
          To coordinate your schedule and get your first lesson on the calendar, please give us a call at{' '}
          <strong>{SUPPORT_PHONE}</strong>. Our team will help you pick the times that work best for you.
        </Text>
        <Button style={brand.button} href={portalUrl}>Go to DrivingKlass</Button>
        <Text style={brand.muted}>We’re looking forward to driving with you.</Text>
        <Text style={brand.footer}>{SITE} • {SITE_URL}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Your DrivingKlass intake is approved — call us to schedule',
  displayName: 'Intake Accepted',
  previewData: { recipientName: 'Alex' },
} satisfies TemplateEntry
