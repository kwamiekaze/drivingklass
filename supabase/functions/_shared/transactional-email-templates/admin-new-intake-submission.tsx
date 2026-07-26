/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Section, Link } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { brand, SITE, SITE_URL } from './_shared.ts'

interface Props {
  studentName?: string
  studentEmail?: string
  phone?: string
  dob?: string
  pickupAddress?: string
  dropoffAddress?: string
  permitNumber?: string
  permitIssueDate?: string
  permitExpirationDate?: string
  guardianName?: string
  guardianPhone?: string
  guardianEmail?: string
  notes?: string
  permitFileNote?: string
  permitFileUrl?: string
  submittedAtLabel?: string
}

const row = { ...brand.text, margin: '0 0 6px' }

const Email = ({
  studentName,
  studentEmail,
  phone,
  dob,
  pickupAddress,
  dropoffAddress,
  permitNumber,
  permitIssueDate,
  permitExpirationDate,
  guardianName,
  guardianPhone,
  guardianEmail,
  notes,
  permitFileNote,
  permitFileUrl,
  submittedAtLabel,
}: Props) => {
  const name = studentName || 'New Student'
  const replyHref = studentEmail
    ? `mailto:${studentEmail}?subject=${encodeURIComponent(`Re: DrivingKlass intake — ${name}`)}`
    : ''
  return (
    <Html>
      <Head />
      <Preview>New Intake Submission — {name}</Preview>
      <Body style={brand.main}>
        <Container style={brand.container}>
          <Heading style={brand.h1}>New Intake Submission</Heading>
          <Text style={brand.text}>A student has completed their intake form.</Text>

          <Text style={{ ...brand.text, margin: '16px 0 6px' }}><strong>Student</strong></Text>
          <Section style={brand.card}>
            <Text style={row}><strong>Name:</strong> {name}</Text>
            {studentEmail ? (
              <Text style={row}>
                <strong>Email:</strong>{' '}
                <Link href={`mailto:${studentEmail}`} style={{ color: '#b8860b' }}>{studentEmail}</Link>
              </Text>
            ) : null}
            {phone ? (
              <Text style={row}>
                <strong>Phone:</strong>{' '}
                <Link href={`tel:${phone}`} style={{ color: '#b8860b' }}>{phone}</Link>
              </Text>
            ) : null}
            <Text style={row}><strong>Date of Birth:</strong> {dob || 'Not collected'}</Text>
          </Section>

          <Text style={{ ...brand.text, margin: '16px 0 6px' }}><strong>Addresses</strong></Text>
          <Section style={brand.card}>
            <Text style={row}><strong>Pickup:</strong> {pickupAddress || '—'}</Text>
            <Text style={row}><strong>Drop-off:</strong> {dropoffAddress || '—'}</Text>
          </Section>

          <Text style={{ ...brand.text, margin: '16px 0 6px' }}><strong>Permit / License</strong></Text>
          <Section style={brand.card}>
            <Text style={row}><strong>Number:</strong> {permitNumber || '—'}</Text>
            <Text style={row}><strong>Issued:</strong> {permitIssueDate || '—'}</Text>
            <Text style={row}><strong>Expires:</strong> {permitExpirationDate || '—'}</Text>
            {permitFileUrl ? (
              <Text style={row}>
                <strong>Uploaded file:</strong>{' '}
                <Link href={permitFileUrl} style={{ color: '#b8860b' }}>View secure link (7 days)</Link>
              </Text>
            ) : permitFileNote ? (
              <Text style={row}><strong>Uploaded file:</strong> {permitFileNote}</Text>
            ) : (
              <Text style={row}><strong>Uploaded file:</strong> None</Text>
            )}
          </Section>

          <Text style={{ ...brand.text, margin: '16px 0 6px' }}><strong>Guardian / Emergency Contact</strong></Text>
          <Section style={brand.card}>
            <Text style={row}><strong>Name:</strong> {guardianName || '—'}</Text>
            <Text style={row}><strong>Phone:</strong> {guardianPhone || '—'}</Text>
            <Text style={row}><strong>Email:</strong> {guardianEmail || '—'}</Text>
          </Section>

          {notes ? (
            <>
              <Text style={{ ...brand.text, margin: '16px 0 6px' }}><strong>Notes</strong></Text>
              <Section style={{ ...brand.card, whiteSpace: 'pre-wrap' as const }}>
                <Text style={{ ...brand.text, margin: 0, whiteSpace: 'pre-wrap' as const }}>{notes}</Text>
              </Section>
            </>
          ) : null}

          {submittedAtLabel ? (
            <Text style={brand.muted}><strong>Submitted (ET):</strong> {submittedAtLabel}</Text>
          ) : null}

          {replyHref ? (
            <Text style={brand.text}>
              <Link href={replyHref} style={{ color: '#b8860b', fontWeight: 'bold' }}>Reply directly to {name} →</Link>
            </Text>
          ) : null}

          <Text style={brand.footer}>{SITE} • {SITE_URL}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Props) => `New Intake Submission — ${d?.studentName || 'New Student'}`,
  displayName: 'Admin — New Intake Submission',
  previewData: {
    studentName: 'Jane Doe',
    studentEmail: 'jane@example.com',
    phone: '(404) 555-1212',
    pickupAddress: '123 Peachtree St, Atlanta GA',
    dropoffAddress: 'Jane HS',
    permitNumber: '123456789',
    permitIssueDate: '2025-01-15',
    permitExpirationDate: '2027-01-15',
    guardianName: 'John Doe',
    guardianPhone: '(404) 555-1000',
    guardianEmail: 'john@example.com',
    permitFileNote: 'Permit/License uploaded ✓',
    submittedAtLabel: 'Jul 24, 2026 3:14 PM ET',
  },
} satisfies TemplateEntry
