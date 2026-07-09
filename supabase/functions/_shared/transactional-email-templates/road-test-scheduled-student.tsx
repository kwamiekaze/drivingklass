/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Section, Hr } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { brand, SITE, SITE_URL, SUPPORT_PHONE } from './_shared.ts'

export interface RoadTestStudentProps {
  studentName?: string
  ddsLocation?: string
  dateLabel?: string
  timeLabel?: string
  pickupTimeLabel?: string
}

const step: React.CSSProperties = { ...brand.text, margin: '0 0 10px' }

export const RoadTestStudentEmail = ({
  studentName,
  ddsLocation = 'your DDS testing location',
  dateLabel = 'TBD',
  timeLabel = 'TBD',
  pickupTimeLabel = '',
}: RoadTestStudentProps) => (
  <Html>
    <Head />
    <Preview>Your DrivingKlass Road Test — How to schedule on DDS 2 GO</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <Heading style={brand.h1}>Your DrivingKlass Road Test</Heading>
        <Text style={brand.text}>Hi {studentName || 'there'},</Text>
        <Text style={brand.text}>
          Congratulations on reaching the road test stage! Below are the details of your road test
          appointment followed by simple step-by-step instructions to schedule your official
          Georgia road test through the DDS 2 GO app.
        </Text>

        <Section style={brand.card}>
          <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Testing Location:</strong> {ddsLocation}</Text>
          <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Date:</strong> {dateLabel}</Text>
          {pickupTimeLabel ? (
            <Text style={{ ...brand.text, margin: '0 0 6px' }}><strong>Pickup Time:</strong> {pickupTimeLabel}</Text>
          ) : null}
          <Text style={{ ...brand.text, margin: '0' }}><strong>Road Test Start Time:</strong> {timeLabel}</Text>
        </Section>

        <Heading as="h2" style={{ ...brand.h1, fontSize: '17px', margin: '4px 0 12px' }}>
          How to schedule on DDS 2 GO
        </Heading>

        <Text style={step}><strong>1.</strong> Download the <strong>DDS 2 GO</strong> app from the iOS App Store or Google Play Store.</Text>
        <Text style={step}><strong>2.</strong> After opening the app, select <strong>“Make a road test appointment”</strong> in the bottom-left corner.</Text>
        <Text style={step}><strong>3.</strong> On the <strong>“What type of appointment?”</strong> screen, choose <strong>“Automobile Road Test”</strong> from the dropdown menu.</Text>
        <Text style={step}><strong>4.</strong> For <strong>“Where are you looking to test?”</strong>, select: <strong>{ddsLocation}</strong>.</Text>
        <Text style={step}>
          <strong>5.</strong> Complete the contact information, date of birth, and Georgia
          License or Permit DL/ID # sections to schedule your appointment. Please use the
          agreed date and time shown above: <strong>{dateLabel} at {timeLabel}</strong>.
        </Text>
        <Text style={step}>
          <strong>6.</strong> After scheduling, check your email for a confirmation link from
          DDS and click it to fully confirm your appointment.
        </Text>

        <Hr style={{ margin: '20px 0', borderColor: '#e7e2cf' }} />

        <Text style={brand.text}>
          If you need any help or assistance, please contact us at <strong>{SUPPORT_PHONE}</strong>.
        </Text>
        <Text style={brand.muted}>Good luck — you’ve got this!</Text>
        <Text style={brand.footer}>{SITE} • {SITE_URL}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RoadTestStudentEmail,
  subject: 'Your DrivingKlass Road Test — How to Schedule on DDS 2 GO',
  displayName: 'Road Test Scheduled (Student)',
  previewData: {
    studentName: 'Alex',
    ddsLocation: 'Marietta - 1605 County Services Pkwy. Marietta GA 30008',
    dateLabel: 'Aug 12, 2026',
    timeLabel: '10:00 AM',
    pickupTimeLabel: '9:15 AM',
  },
} satisfies TemplateEntry
