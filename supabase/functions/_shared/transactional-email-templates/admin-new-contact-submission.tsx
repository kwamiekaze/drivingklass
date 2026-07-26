/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Section, Link } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { brand, SITE, SITE_URL } from './_shared.ts'

interface Props {
  fullName?: string
  senderEmail?: string
  phone?: string
  message?: string
  packageSelected?: string
  sourceLabel?: string
  submittedAtLabel?: string
  attachmentNote?: string
}

const row = { ...brand.text, margin: '0 0 6px' }

const Email = ({
  fullName,
  senderEmail,
  phone,
  message,
  packageSelected,
  sourceLabel,
  submittedAtLabel,
  attachmentNote,
}: Props) => {
  const name = fullName || 'Unknown'
  const replyHref = senderEmail
    ? `mailto:${senderEmail}?subject=${encodeURIComponent(`Re: DrivingKlass inquiry from ${name}`)}`
    : ''
  return (
    <Html>
      <Head />
      <Preview>New Message from {name} — DrivingKlass</Preview>
      <Body style={brand.main}>
        <Container style={brand.container}>
          <Heading style={brand.h1}>New Message — DrivingKlass</Heading>
          <Text style={brand.text}>A new contact submission just came in.</Text>
          <Section style={brand.card}>
            <Text style={row}><strong>Name:</strong> {name}</Text>
            {senderEmail ? (
              <Text style={row}>
                <strong>Email:</strong>{' '}
                <Link href={`mailto:${senderEmail}`} style={{ color: '#b8860b' }}>{senderEmail}</Link>
              </Text>
            ) : null}
            {phone ? (
              <Text style={row}>
                <strong>Phone:</strong>{' '}
                <Link href={`tel:${phone}`} style={{ color: '#b8860b' }}>{phone}</Link>
              </Text>
            ) : null}
            {packageSelected ? (
              <Text style={row}><strong>Selected Package:</strong> {packageSelected}</Text>
            ) : null}
            {sourceLabel ? (
              <Text style={row}><strong>Source:</strong> {sourceLabel}</Text>
            ) : null}
            {submittedAtLabel ? (
              <Text style={row}><strong>Submitted (ET):</strong> {submittedAtLabel}</Text>
            ) : null}
            {attachmentNote ? (
              <Text style={row}><strong>Attachment:</strong> {attachmentNote}</Text>
            ) : null}
          </Section>
          <Text style={{ ...brand.text, margin: '16px 0 6px' }}><strong>Message</strong></Text>
          <Section style={{ ...brand.card, whiteSpace: 'pre-wrap' as const }}>
            <Text style={{ ...brand.text, margin: 0, whiteSpace: 'pre-wrap' as const }}>
              {message && message.trim() ? message : '(no message provided)'}
            </Text>
          </Section>
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
  subject: (d: Props) => `New Message from ${d?.fullName || 'Website Visitor'} — DrivingKlass`,
  displayName: 'Admin — New Contact Submission',
  previewData: {
    fullName: 'Jane Doe',
    senderEmail: 'jane@example.com',
    phone: '(404) 555-1212',
    message: 'Hi, I would like info about the 6-hour package.',
    sourceLabel: 'Homepage Contact Form',
    submittedAtLabel: 'Jul 24, 2026 3:14 PM ET',
    attachmentNote: 'Permit/License uploaded ✓',
  },
} satisfies TemplateEntry
