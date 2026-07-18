/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text, Section } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { brand, SITE, SITE_URL, SUPPORT_PHONE } from './_shared.ts'

interface Props {
  recipientName?: string
  sessionType?: 'driving' | 'testing'
  dateLabel?: string
  timeLabel?: string
  pickupTimeLabel?: string
  locationLabel?: string
  paymentUrl?: string
}

const Email = ({
  recipientName,
  sessionType = 'driving',
  dateLabel = 'TBD',
  timeLabel = 'TBD',
  pickupTimeLabel,
  locationLabel,
  paymentUrl = `${SITE_URL}/#packages`,
}: Props) => {
  const typeLabel = sessionType === 'testing' ? 'Road Test' : 'Driving Session'
  return (
    <Html>
      <Head />
      <Preview>Action Needed: Your DrivingKlass {typeLabel} is pending payment</Preview>
      <Body style={brand.main}>
        <Container style={brand.container}>
          <Heading style={brand.h1}>Action Needed — Payment Required</Heading>
          <Text style={brand.text}>Hi {recipientName || 'there'},</Text>
          <Text style={brand.text}>
            You've been placed on a <strong>pending {typeLabel.toLowerCase()}</strong> with DrivingKlass. This slot is
            being held for you, but it is <strong>not yet confirmed</strong>.
          </Text>
          <Section style={brand.card}>
            <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Type:</strong> {typeLabel}</Text>
            <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Date:</strong> {dateLabel}</Text>
            {sessionType === 'testing' && pickupTimeLabel ? (
              <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Pickup Time:</strong> {pickupTimeLabel}</Text>
            ) : null}
            <Text style={{ ...brand.text, margin: '0 0 6px' }}>
              <strong>{sessionType === 'testing' ? 'Road Test Start Time' : 'Time'}:</strong> {timeLabel}
            </Text>
            {locationLabel ? (
              <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Location:</strong> {locationLabel}</Text>
            ) : null}
          </Section>
          <Text style={brand.text}>
            <strong>Please note:</strong> Dates and times are subject to change until payment is made to secure
            this slot. To lock in your appointment, please complete your payment as soon as possible.
          </Text>
          <Button style={brand.button} href={paymentUrl}>Make a Payment</Button>
          <Text style={brand.muted}>
            Prefer to pay by phone or have questions? Call us at {SUPPORT_PHONE}.
          </Text>
          <Text style={brand.footer}>{SITE} • {SITE_URL}</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Props) =>
    `Action Needed: Your DrivingKlass ${d?.sessionType === 'testing' ? 'Road Test' : 'Driving Session'} Is Pending Payment`,
  displayName: 'Pending Slot Notice',
  previewData: {
    recipientName: 'Quamie',
    sessionType: 'driving',
    dateLabel: 'Jul 24, 2026',
    timeLabel: '2:00 PM',
  },
} satisfies TemplateEntry
