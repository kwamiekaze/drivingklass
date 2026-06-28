/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { brand, SITE, SITE_URL, SUPPORT_PHONE } from './_shared.ts'

interface Props {
  guardianName?: string
  studentName?: string
  studentEmail?: string
  audience?: 'guardian' | 'instructor'
  instructorName?: string
}

const Email = ({ guardianName, studentName, studentEmail, audience, instructorName }: Props) => {
  const forInstructor = audience === 'instructor'
  const title = forInstructor
    ? 'Guardian information updated'
    : "You've been added as a parent/guardian"
  const greeting = forInstructor
    ? (instructorName ? `Hi ${instructorName},` : 'Hi,')
    : (guardianName ? `Hi ${guardianName},` : 'Hi,')
  const body = forInstructor
    ? `The parent/guardian contact information for your student ${studentName || 'a student'} was just updated on DrivingKlass. Please review the latest contact details in your portal before your next lesson.`
    : `You have been added as the parent/guardian for ${studentName || 'a student'}${studentEmail ? ` (${studentEmail})` : ''} on DrivingKlass. You'll receive lesson updates, reminders, and report cards relevant to their progress.`

  return (
    <Html>
      <Head />
      <Preview>{title}</Preview>
      <Body style={brand.main}>
        <Container style={brand.container}>
          <Heading style={brand.h1}>{title}</Heading>
          <Text style={brand.text}>{greeting}</Text>
          <Text style={brand.text}>{body}</Text>
          <Section style={{ margin: '20px 0' }}>
            <Text style={brand.muted}>
              If this wasn't expected, contact us at {SUPPORT_PHONE} and we'll sort it out right away.
            </Text>
          </Section>
          <Text style={brand.footer}>{SITE} • {SITE_URL}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (data: Props) =>
    data?.audience === 'instructor'
      ? `Guardian info updated for ${data?.studentName || 'your student'}`
      : `You've been added as guardian for ${data?.studentName || 'a student'}`,
  displayName: 'Guardian Added / Updated',
  previewData: { guardianName: 'Pat', studentName: 'Alex Doe', studentEmail: 'alex@example.com', audience: 'guardian' },
} satisfies TemplateEntry
