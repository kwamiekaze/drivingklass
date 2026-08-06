/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { brand, SITE, SITE_URL, SUPPORT_PHONE } from './_shared.ts'

interface Props {
  studentName?: string
  guardianName?: string
  endedAtLabel?: string
}

const Email = ({ studentName = 'the student', guardianName, endedAtLabel = 'just now' }: Props) => (
  <Html>
    <Head />
    <Preview>Live lesson tracking has ended for {studentName}</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <Heading style={brand.h1}>Live lesson tracking ended</Heading>
        <Text style={brand.text}>Hi {guardianName || 'there'},</Text>
        <Text style={brand.text}>
          Live tracking for <strong>{studentName}</strong>'s driving lesson has ended ({endedAtLabel}). No further updates will be sent.
        </Text>
        <Text style={brand.muted}>Questions? Call us at {SUPPORT_PHONE}.</Text>
        <Text style={brand.footer}>{SITE} • {SITE_URL}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'DrivingKlass Live Session Tracker Ended',
  displayName: 'Live Tracking Ended',
  previewData: { studentName: 'Alex', endedAtLabel: 'just now' },
} satisfies TemplateEntry
