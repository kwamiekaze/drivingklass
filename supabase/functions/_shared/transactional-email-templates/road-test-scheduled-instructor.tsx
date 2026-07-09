/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Section, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { brand, SITE, SITE_URL, SUPPORT_PHONE } from './_shared.ts'
import { RoadTestStudentEmail } from './road-test-scheduled-student.tsx'

interface Props {
  instructorName?: string
  studentName?: string
  ddsLocation?: string
  dateLabel?: string
  timeLabel?: string
  pickupTimeLabel?: string
  cityLabel?: string
}

const Email = ({
  instructorName,
  studentName = 'the student',
  ddsLocation = 'TBD',
  dateLabel = 'TBD',
  timeLabel = 'TBD',
  pickupTimeLabel = '',
}: Props) => (
  <Html>
    <Head />
    <Preview>Road Test Scheduled — {studentName} — {dateLabel} {timeLabel}</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <Heading style={brand.h1}>Road Test Scheduled</Heading>
        <Text style={brand.text}>Hi {instructorName || 'there'},</Text>
        <Text style={brand.text}>
          A road test has been scheduled for your student. Details below.
        </Text>

        <Section style={brand.card}>
          <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Student:</strong> {studentName}</Text>
          <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Testing Location:</strong> {ddsLocation}</Text>
          <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Date:</strong> {dateLabel}</Text>
          {pickupTimeLabel ? (
            <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Pickup Time:</strong> {pickupTimeLabel}</Text>
          ) : null}
          <Text style={{ ...brand.text, margin: '0' }}><strong>Road Test Start Time:</strong> {timeLabel}</Text>
        </Section>

        <Text style={brand.muted}>Questions? Call us at {SUPPORT_PHONE}.</Text>

        <Hr style={{ margin: '22px 0 16px', borderColor: '#c9b26b' }} />
        <Heading as="h2" style={{ ...brand.h1, fontSize: '15px', margin: '0 0 12px', color: '#8a6b0e' }}>
          Copy of the notification sent to your student
        </Heading>

        <RoadTestStudentEmail
          studentName={studentName}
          ddsLocation={ddsLocation}
          dateLabel={dateLabel}
          timeLabel={timeLabel}
          pickupTimeLabel={pickupTimeLabel}
        />

        <Text style={brand.footer}>{SITE} • {SITE_URL}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Props) =>
    `Road Test Scheduled: ${d?.studentName || 'Student'} — ${d?.dateLabel || ''} ${d?.timeLabel || ''}${d?.cityLabel ? ' ' + d.cityLabel : ''}`.trim(),
  displayName: 'Road Test Scheduled (Instructor)',
  previewData: {
    instructorName: 'Coach Kim',
    studentName: 'Alex Rivera',
    ddsLocation: 'Marietta - 1605 County Services Pkwy. Marietta GA 30008',
    dateLabel: 'Aug 12, 2026',
    timeLabel: '10:00 AM',
    pickupTimeLabel: '9:15 AM',
    cityLabel: 'Marietta',
  },
} satisfies TemplateEntry
