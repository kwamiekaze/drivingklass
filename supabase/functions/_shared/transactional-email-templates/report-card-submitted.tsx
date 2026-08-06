/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { brand, SITE, SITE_URL, SUPPORT_PHONE } from './_shared.ts'

interface Props {
  recipientName?: string
  instructorName?: string
  studentName?: string
  reportUrl?: string
  dateLabel?: string
  accessCode?: string
  publicUrl?: string
  isGuardian?: boolean
}

const Email = ({ recipientName, instructorName, studentName, reportUrl, dateLabel, accessCode, publicUrl, isGuardian }: Props) => {
  const primaryUrl = publicUrl || reportUrl || `${SITE_URL}/login`
  const subject = isGuardian
    ? `a report card for ${studentName || 'your student'}`
    : 'your report card'
  return (
    <Html>
      <Head />
      <Preview>Your new report card is ready</Preview>
      <Body style={brand.main}>
        <Container style={brand.container}>
          <Heading style={brand.h1}>Your report card is ready</Heading>
          <Text style={brand.text}>Hi {recipientName || 'there'},</Text>
          <Text style={brand.text}>
            {instructorName || 'Your instructor'} just submitted {subject}
            {dateLabel ? ` for the lesson on ${dateLabel}` : ''}. Tap the button below to open it.
          </Text>
          {accessCode && (
            <Section style={{ marginTop: 16, marginBottom: 16, padding: 12, border: '1px dashed #c8a96a', borderRadius: 8 }}>
              <Text style={{ ...brand.text, margin: 0 }}>Access code (required to view):</Text>
              <Text style={{ ...brand.h1, fontSize: 22, letterSpacing: 2, margin: '6px 0 0' }}>{accessCode}</Text>
            </Section>
          )}
          <Text style={brand.muted}>Questions? Call {SUPPORT_PHONE}.</Text>
          <Text style={brand.footer}>{SITE} • {SITE_URL}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: 'Your new DrivingKlass report card is ready',
  displayName: 'Report Card Submitted',
  previewData: { recipientName: 'Alex', instructorName: 'Coach Kim', dateLabel: 'Jun 12, 2026', accessCode: '4827', publicUrl: 'https://drivingklass.com/report/public/abc123' },
} satisfies TemplateEntry
