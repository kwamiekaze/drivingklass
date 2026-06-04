/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { brand, SITE, SITE_URL, SUPPORT_PHONE } from './_shared.ts'

interface Props {
  recipientName?: string
  instructorName?: string
  reportUrl?: string
  dateLabel?: string
}

const Email = ({ recipientName, instructorName, reportUrl = `${SITE_URL}/login`, dateLabel }: Props) => (
  <Html>
    <Head />
    <Preview>Your new report card is ready</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <Heading style={brand.h1}>Your report card is ready</Heading>
        <Text style={brand.text}>Hi {recipientName || 'there'},</Text>
        <Text style={brand.text}>
          {instructorName || 'Your instructor'} just submitted your report card{dateLabel ? ` for your lesson on ${dateLabel}` : ''}.
          Open the portal to review your scores, feedback and progress.
        </Text>
        <Button style={brand.button} href={reportUrl}>Open report card</Button>
        <Text style={brand.muted}>Questions? Call {SUPPORT_PHONE}.</Text>
        <Text style={brand.footer}>{SITE} • {SITE_URL}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Your new DrivingKlass report card is ready',
  displayName: 'Report Card Submitted',
  previewData: { recipientName: 'Alex', instructorName: 'Coach Kim', dateLabel: 'Jun 12, 2026' },
} satisfies TemplateEntry
