/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text, Section, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { brand, SITE, SITE_URL, SUPPORT_PHONE } from './_shared.ts'

interface ProposalItem {
  dateLabel: string
  timeLabel: string
  sessionType: 'driving' | 'testing'
  locationLabel?: string
}

interface Props {
  recipientName?: string
  instructorName?: string
  noteToStudent?: string
  items?: ProposalItem[]
  packageLabel?: string
  packageHours?: number
  packagePrice?: string
  paymentUrl?: string
  portalUrl?: string
}

const Email = ({
  recipientName,
  instructorName,
  noteToStudent,
  items = [],
  packageLabel,
  packageHours,
  packagePrice,
  paymentUrl,
  portalUrl = `${SITE_URL}/student/proposals`,
}: Props) => {
  return (
    <Html>
      <Head />
      <Preview>Your DrivingKlass schedule proposal — review and complete payment</Preview>
      <Body style={brand.main}>
        <Container style={brand.container}>
          <Heading style={brand.h1}>Your Schedule Proposal</Heading>
          <Text style={brand.text}>Hi {recipientName || 'there'},</Text>
          <Text style={brand.text}>
            {instructorName ? `${instructorName} has` : "We've"} put together a proposed schedule for you.
            Review the dates below and complete your payment to lock in your appointments.
          </Text>

          {noteToStudent ? (
            <Section style={brand.card}>
              <Text style={{ ...brand.muted, margin: '0 0 4px' }}>Note from your instructor</Text>
              <Text style={{ ...brand.text, margin: 0 }}>{noteToStudent}</Text>
            </Section>
          ) : null}

          {items.length > 0 ? (
            <Section style={brand.card}>
              <Text style={{ ...brand.text, margin: '0 0 8px', fontWeight: 'bold' }}>
                Proposed Dates ({items.length})
              </Text>
              {items.map((it, i) => (
                <Text key={i} style={{ ...brand.text, margin: '0 0 4px' }}>
                  • {it.dateLabel} — {it.timeLabel}
                  {it.sessionType === 'testing' ? ' (Road Test)' : ''}
                  {it.sessionType === 'testing' && it.locationLabel ? ` — ${it.locationLabel}` : ''}
                </Text>
              ))}
            </Section>
          ) : null}

          {packageLabel && paymentUrl ? (
            <Section style={brand.card}>
              <Text style={{ ...brand.text, margin: '0 0 6px', fontWeight: 'bold' }}>
                Recommended Package: {packageLabel.replace(/\n/g, ' ')}
              </Text>
              {typeof packageHours === 'number' ? (
                <Text style={{ ...brand.text, margin: '0 0 4px' }}>
                  <strong>Hours:</strong> {packageHours}
                </Text>
              ) : null}
              {packagePrice ? (
                <Text style={{ ...brand.text, margin: '0 0 12px' }}>
                  <strong>Price:</strong> {packagePrice}
                </Text>
              ) : null}
              <Button style={brand.button} href={paymentUrl}>Complete Your Payment</Button>
              <Text style={{ ...brand.muted, margin: '10px 0 0' }}>
                Your slot is confirmed once payment is received.
              </Text>
            </Section>
          ) : null}

          <Hr />
          <Text style={brand.muted}>
            You can also review, accept, or request edits in your portal:
          </Text>
          <Button style={{ ...brand.button, backgroundColor: '#374151' }} href={portalUrl}>
            Open Portal
          </Button>
          <Text style={brand.muted}>
            Questions? Call or text us at {SUPPORT_PHONE}.
          </Text>
          <Text style={brand.footer}>{SITE} • {SITE_URL}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Props) => `Your DrivingKlass Schedule Proposal${d?.instructorName ? ` from ${d.instructorName}` : ''}`,
  displayName: 'Schedule Proposal',
  previewData: {
    recipientName: 'Alex',
    instructorName: 'Quamie',
    items: [
      { dateLabel: 'Mon, Aug 3, 2026', timeLabel: '4:00 PM – 6:00 PM', sessionType: 'driving' },
      { dateLabel: 'Wed, Aug 5, 2026', timeLabel: '4:00 PM – 6:00 PM', sessionType: 'driving' },
    ],
    packageLabel: '4 HR',
    packageHours: 4,
    packagePrice: '$230.00',
    paymentUrl: 'https://square.link/u/p0Oq0ixi?src=sheet',
  },
} satisfies TemplateEntry
