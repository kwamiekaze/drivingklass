/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { brand, SITE, SITE_URL, SUPPORT_PHONE } from './_shared.ts'

interface Props {
  studentName?: string
  guardianName?: string
  sessionDateLabel?: string
  sessionTimeLabel?: string
  intervalMinutes?: number
  trackingUrl?: string
}

const Email = ({
  studentName = 'the student',
  guardianName,
  sessionDateLabel = '',
  sessionTimeLabel = '',
  intervalMinutes = 30,
  trackingUrl = SITE_URL,
}: Props) => (
  <Html>
    <Head />
    <Preview>Live lesson tracking has started for {studentName}</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <Heading style={brand.h1}>Live lesson tracking started</Heading>
        <Text style={brand.text}>Hi {guardianName || 'there'},</Text>
        <Text style={brand.text}>
          The driving lesson for <strong>{studentName}</strong> is now in progress and live tracking is enabled.
        </Text>
        <Section style={brand.card}>
          {sessionDateLabel ? <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Date:</strong> {sessionDateLabel}</Text> : null}
          {sessionTimeLabel ? <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Time:</strong> {sessionTimeLabel}</Text> : null}
          <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Update frequency:</strong> every {intervalMinutes} minutes</Text>
        </Section>
        <Text style={brand.text}>Use the secure link below to view the approximate last-seen location on a map.</Text>
        <Button style={brand.button} href={trackingUrl}>View live tracker</Button>
        <Text style={brand.muted}>Location may be approximate or delayed depending on device signal and permissions.</Text>
        <Text style={brand.muted}>Questions? Call us at {SUPPORT_PHONE}.</Text>
        <Text style={brand.footer}>{SITE} • {SITE_URL}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'DrivingKlass Live Session Tracker Started',
  displayName: 'Live Tracking Started',
  previewData: { studentName: 'Alex', sessionDateLabel: 'Jun 12, 2026', sessionTimeLabel: '3:00 PM', intervalMinutes: 30, trackingUrl: `${SITE_URL}/tracker/example-token` },
} satisfies TemplateEntry
