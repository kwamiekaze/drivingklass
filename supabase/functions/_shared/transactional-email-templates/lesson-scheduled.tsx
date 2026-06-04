/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { brand, SITE, SITE_URL, SUPPORT_PHONE } from './_shared.ts'

interface Props {
  recipientName?: string
  audience?: 'student' | 'instructor' | 'admin'
  dateLabel?: string
  timeLabel?: string
  instructorName?: string
  studentName?: string
  pickupAddress?: string
  durationMinutes?: number
  portalUrl?: string
}

const Email = ({
  recipientName,
  audience = 'student',
  dateLabel = 'TBD',
  timeLabel = 'TBD',
  instructorName,
  studentName,
  pickupAddress,
  durationMinutes,
  portalUrl = `${SITE_URL}/login`,
}: Props) => (
  <Html>
    <Head />
    <Preview>New lesson scheduled — {dateLabel} at {timeLabel}</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <Heading style={brand.h1}>New lesson scheduled</Heading>
        <Text style={brand.text}>Hi {recipientName || 'there'},</Text>
        <Text style={brand.text}>
          {audience === 'student'
            ? `A new driving lesson has been scheduled for you${instructorName ? ` with ${instructorName}` : ''}.`
            : `A new lesson has been assigned${studentName ? ` with ${studentName}` : ''}.`}
        </Text>
        <Section style={brand.card}>
          <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Date:</strong> {dateLabel}</Text>
          <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Time:</strong> {timeLabel}</Text>
          {durationMinutes ? <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Duration:</strong> {durationMinutes} minutes</Text> : null}
          {pickupAddress ? <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Pickup:</strong> {pickupAddress}</Text> : null}
        </Section>
        <Button style={brand.button} href={portalUrl}>View in portal</Button>
        <Text style={brand.muted}>Questions? Call us at {SUPPORT_PHONE}.</Text>
        <Text style={brand.footer}>{SITE} • {SITE_URL}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Props) => `New lesson scheduled — ${d?.dateLabel || ''} ${d?.timeLabel || ''}`.trim(),
  displayName: 'Lesson Scheduled',
  previewData: { recipientName: 'Alex', dateLabel: 'Jun 12, 2026', timeLabel: '3:00 PM', instructorName: 'Coach Kim', durationMinutes: 60 },
} satisfies TemplateEntry
