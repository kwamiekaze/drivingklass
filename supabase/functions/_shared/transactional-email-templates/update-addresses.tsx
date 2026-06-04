/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { brand, SITE, SITE_URL, SUPPORT_PHONE } from './_shared.ts'

interface Props {
  recipientName?: string
  profileUrl?: string
}

const Email = ({ recipientName, profileUrl }: Props) => (
  <Html>
    <Head />
    <Preview>Please confirm your pickup and drop-off addresses</Preview>
    <Body style={brand.main}>
      <Container style={brand.container}>
        <Heading style={brand.h1}>Confirm your pickup & drop-off</Heading>
        <Text style={brand.text}>Hi {recipientName || 'there'},</Text>
        <Text style={brand.text}>
          Your DrivingKlass intake is ready. To schedule your first lesson,
          please sign in and confirm or update your <strong>pickup address</strong> and
          <strong> drop-off address</strong> on your profile.
        </Text>
        <Section style={{ textAlign: 'center', margin: '24px 0' }}>
          <Button href={profileUrl || `${SITE_URL}/profile`} style={brand.button as any}>
            Update my addresses
          </Button>
        </Section>
        <Text style={brand.muted}>
          Accurate addresses help your instructor reach you on time and plan the lesson route.
        </Text>
        <Text style={brand.muted}>Questions? Call us at {SUPPORT_PHONE}.</Text>
        <Text style={brand.footer}>{SITE} • {SITE_URL}</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Please confirm your pickup & drop-off addresses',
  displayName: 'Update Addresses',
  previewData: { recipientName: 'Alex', profileUrl: 'https://drivingklass.com/profile' },
} satisfies TemplateEntry
