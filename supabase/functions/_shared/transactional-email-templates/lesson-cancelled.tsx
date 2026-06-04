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
  studentName?: string
  instructorName?: string
  reason?: string
  cancelledBy?: string
  penaltyApplied?: boolean
  portalUrl?: string
}

const Email = ({
  recipientName,
  audience = 'student',
  dateLabel = 'TBD',
  timeLabel = 'TBD',
  studentName,
  instructorName,
  reason,
  cancelledBy,
  penaltyApplied,
  portalUrl = `${SITE_URL}/login`,
}: Props) => (
  <Html>
    <Head />
    <Preview>Lesson cancelled — {dateLabel} {timeLabel}</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <Heading style={brand.h1}>Lesson cancelled</Heading>
        <Text style={brand.text}>Hi {recipientName || 'there'},</Text>
        <Text style={brand.text}>
          {audience === 'student'
            ? `Your lesson on ${dateLabel} at ${timeLabel} has been cancelled.`
            : `${studentName || 'A student'}'s lesson on ${dateLabel} at ${timeLabel} has been cancelled${cancelledBy ? ` by ${cancelledBy}` : ''}.`}
        </Text>
        <Section style={brand.card}>
          <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Date:</strong> {dateLabel}</Text>
          <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Time:</strong> {timeLabel}</Text>
          {instructorName ? <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Instructor:</strong> {instructorName}</Text> : null}
          {studentName && audience !== 'student' ? <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Student:</strong> {studentName}</Text> : null}
          {reason ? <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Reason:</strong> {reason}</Text> : null}
        </Section>
        {audience === 'student' && penaltyApplied ? (
          <Text style={{ ...brand.text, color: '#b45309' }}>
            A 30-minute late cancellation fee was applied because this was within 24 hours of the lesson.
          </Text>
        ) : null}
        <Button style={brand.button} href={portalUrl}>Open portal</Button>
        <Text style={brand.muted}>Need to reschedule? Call {SUPPORT_PHONE}.</Text>
        <Text style={brand.footer}>{SITE} • {SITE_URL}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Props) => `Lesson cancelled — ${d?.dateLabel || ''} ${d?.timeLabel || ''}`.trim(),
  displayName: 'Lesson Cancelled',
  previewData: { recipientName: 'Alex', dateLabel: 'Jun 12, 2026', timeLabel: '3:00 PM', reason: 'Weather' },
} satisfies TemplateEntry
