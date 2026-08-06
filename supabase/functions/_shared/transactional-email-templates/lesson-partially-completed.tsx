/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { brand, SITE, SITE_URL, SUPPORT_PHONE } from './_shared.ts'

interface Props {
  recipientName?: string
  instructorName?: string
  studentName?: string
  dateLabel?: string
  timeLabel?: string
  minutesCompleted?: number
  scheduledMinutes?: number
  reason?: string
  audience?: 'student' | 'instructor' | 'admin'
}

const Email = ({
  recipientName,
  instructorName,
  dateLabel,
  timeLabel,
  minutesCompleted,
  scheduledMinutes,
  reason,
}: Props) => (
  <Html>
    <Head />
    <Preview>Your lesson was marked partially complete</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <Heading style={brand.h1}>Your lesson was marked partially complete</Heading>
        <Text style={brand.text}>Hi {recipientName || 'there'},</Text>
        <Text style={brand.text}>
          {instructorName || 'Your instructor'} marked your lesson
          {dateLabel ? ` on ${dateLabel}` : ''}
          {timeLabel ? ` at ${timeLabel}` : ''} as <strong>partially complete</strong>.
        </Text>

        <Section style={brand.card}>
          {dateLabel && (
            <Text style={{ ...brand.text, margin: '0 0 8px' }}>
              <strong>Date:</strong> {dateLabel}
              {timeLabel ? ` at ${timeLabel}` : ''}
            </Text>
          )}
          {typeof minutesCompleted === 'number' && (
            <Text style={{ ...brand.text, margin: '0 0 8px' }}>
              <strong>Minutes completed:</strong> {minutesCompleted}
              {typeof scheduledMinutes === 'number' ? ` of ${scheduledMinutes} scheduled` : ''}
            </Text>
          )}
          {reason && (
            <Text style={{ ...brand.text, margin: 0 }}>
              <strong>Instructor's note:</strong> {reason}
            </Text>
          )}
        </Section>

        <Text style={brand.muted}>
          Only the minutes actually completed were counted toward your driving hours.
        </Text>
        <Text style={brand.muted}>Questions? Call {SUPPORT_PHONE}.</Text>
        <Text style={brand.footer}>{SITE} • {SITE_URL}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Your DrivingKlass lesson was marked partially complete',
  displayName: 'Lesson Partially Completed',
  previewData: {
    recipientName: 'Alex',
    instructorName: 'Coach Kim',
    dateLabel: 'Aug 05, 2026',
    timeLabel: '4:00 PM',
    minutesCompleted: 45,
    scheduledMinutes: 120,
    reason: 'Student felt unwell and we ended the lesson early.',
  },
} satisfies TemplateEntry
