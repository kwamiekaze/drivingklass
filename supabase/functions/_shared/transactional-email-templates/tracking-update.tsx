/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { brand, SITE, SITE_URL, SUPPORT_PHONE } from './_shared.ts'

interface Props {
  studentName?: string
  sessionStatus?: string
  lastUpdatedLabel?: string
  intervalMinutes?: number
  trackingUrl?: string
}

const Email = ({
  studentName = 'the student',
  sessionStatus = 'in progress',
  lastUpdatedLabel = 'just now',
  intervalMinutes = 30,
  trackingUrl = SITE_URL,
}: Props) => (
  <Html>
    <Head />
    <Preview>Location update for {studentName}'s lesson</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <Heading style={brand.h1}>Location update</Heading>
        <Text style={brand.text}>
          Here's the latest tracking update for <strong>{studentName}</strong>'s driving lesson.
        </Text>
        <Section style={brand.card}>
          <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Session status:</strong> {sessionStatus}</Text>
          <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Last updated:</strong> {lastUpdatedLabel}</Text>
          <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Updates every:</strong> {intervalMinutes} minutes</Text>
        </Section>
        <Text style={brand.text}>Open the secure tracker to see the approximate last-seen location on a map.</Text>
        <Button style={brand.button} href={trackingUrl}>View live tracker</Button>
        <Text style={brand.muted}>Approximate location shown. Location may be delayed depending on signal and device permissions.</Text>
        <Text style={brand.muted}>Questions? Call us at {SUPPORT_PHONE}.</Text>
        <Text style={brand.footer}>{SITE} • {SITE_URL}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'DrivingKlass Location Update',
  displayName: 'Live Tracking Update',
  previewData: { studentName: 'Alex', sessionStatus: 'in progress', lastUpdatedLabel: '2 minutes ago', intervalMinutes: 30, trackingUrl: `${SITE_URL}/tracker/example-token` },
} satisfies TemplateEntry
