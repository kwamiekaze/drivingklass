/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { brand, SITE, SITE_URL, SUPPORT_PHONE } from './_shared.ts'

interface Props {
  recipientName?: string
  dateLabel?: string
  timeLabel?: string
  instructorName?: string
  pickupAddress?: string
  dropoffAddress?: string
  durationMinutes?: number
  window?: '24h' | '1h'
  portalUrl?: string
}

const Email = ({
  recipientName,
  dateLabel = 'TBD',
  timeLabel = 'TBD',
  instructorName,
  pickupAddress,
  dropoffAddress,
  durationMinutes,
  window = '24h',
  portalUrl = `${SITE_URL}/login`,
}: Props) => {
  const headline = window === '1h' ? 'Your lesson starts in about 1 hour' : 'Reminder: your lesson is tomorrow'
  return (
    <Html>
      <Head />
      <Preview>{headline} — {dateLabel} at {timeLabel}</Preview>
      <Body style={brand.main}>
        <Container style={brand.container}>
          <Heading style={brand.h1}>{headline}</Heading>
          <Text style={brand.text}>Hi {recipientName || 'there'},</Text>
          <Text style={brand.text}>Here are the details for your upcoming lesson:</Text>
          <Section style={brand.card}>
            <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Date:</strong> {dateLabel}</Text>
            <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Time:</strong> {timeLabel}</Text>
            {durationMinutes ? <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Duration:</strong> {durationMinutes} minutes</Text> : null}
            {instructorName ? <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Instructor:</strong> {instructorName}</Text> : null}
            {pickupAddress ? <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Pickup:</strong> {pickupAddress}</Text> : null}
            {dropoffAddress ? <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Drop-off:</strong> {dropoffAddress}</Text> : null}
          </Section>
          <Button style={brand.button} href={portalUrl}>View lesson</Button>
          <Text style={brand.muted}>Need to reach us? Call {SUPPORT_PHONE}.</Text>
          <Text style={brand.footer}>{SITE} • {SITE_URL}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Props) =>
    d?.window === '1h'
      ? `Starting in 1 hour — lesson at ${d?.timeLabel || ''}`
      : `Reminder: lesson tomorrow at ${d?.timeLabel || ''}`,
  displayName: 'Lesson Reminder',
  previewData: { recipientName: 'Alex', dateLabel: 'Jun 12, 2026', timeLabel: '3:00 PM', window: '24h' },
} satisfies TemplateEntry
