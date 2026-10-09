/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { Body, Button, Column, Container, Head, Heading, Html, Link, Preview, Row, Section, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { SITE, SITE_URL, SUPPORT_PHONE } from './_shared.ts'

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
  /** true when this is a revised proposal that replaces an earlier one */
  revised?: boolean
}

// DrivingKlass look: deep navy header, gold accents, warm cream cards.
const C = { navy: '#0e2a5c', navyDeep: '#091d42', gold: '#d4a017', goldSoft: '#f3dfa2', cream: '#faf6e9', line: '#eadfbd', ink: '#16213a', body: '#374151', muted: '#6b7280' }
const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const SERIF = "Georgia, 'Times New Roman', serif"

const s = {
  page: { backgroundColor: '#eef1f6', fontFamily: FONT, margin: 0, padding: '24px 12px' },
  shell: { maxWidth: '560px', margin: '0 auto', backgroundColor: '#ffffff', borderRadius: '16px', overflow: 'hidden' as const, border: `1px solid ${C.line}` },
  head: { backgroundColor: C.navy, padding: '28px 24px 22px', textAlign: 'center' as const, borderBottom: `3px solid ${C.gold}` },
  brandName: { fontFamily: SERIF, fontSize: '28px', letterSpacing: '1px', color: C.gold, margin: 0, fontWeight: 'bold' as const },
  stars: { fontSize: '14px', letterSpacing: '6px', color: C.gold, margin: '8px 0 6px' },
  tagline: { fontFamily: SERIF, fontStyle: 'italic' as const, fontSize: '14px', color: C.goldSoft, margin: 0 },
  main: { padding: '28px 24px 8px' },
  h1: { fontFamily: SERIF, fontSize: '24px', color: C.ink, margin: '0 0 14px', fontWeight: 'bold' as const },
  text: { fontSize: '15px', lineHeight: '1.65', color: C.body, margin: '0 0 16px' },
  card: { backgroundColor: C.cream, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '16px 18px', margin: '0 0 18px' },
  cardTitle: { fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase' as const, color: '#8a6a0a', fontWeight: 'bold' as const, margin: '0 0 10px' },
  rowLine: { borderTop: `1px solid ${C.line}`, padding: '10px 0 0', margin: '10px 0 0' },
  date: { fontSize: '15px', fontWeight: 'bold' as const, color: C.ink, margin: 0 },
  time: { fontSize: '14px', color: C.body, margin: '2px 0 0' },
  pill: { display: 'inline-block', backgroundColor: C.navy, color: C.goldSoft, fontSize: '11px', letterSpacing: '1px', fontWeight: 'bold' as const, borderRadius: '999px', padding: '3px 10px', textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const },
  pay: { backgroundColor: C.navy, borderRadius: '14px', padding: '22px 20px', margin: '0 0 18px', textAlign: 'center' as const, border: `1px solid ${C.gold}` },
  payKicker: { fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase' as const, color: C.goldSoft, margin: '0 0 6px' },
  payPackage: { fontFamily: SERIF, fontSize: '22px', color: '#ffffff', margin: '0 0 8px', fontWeight: 'bold' as const },
  payPrice: { fontFamily: SERIF, fontSize: '34px', color: C.gold, margin: '0 0 16px', fontWeight: 'bold' as const },
  payButton: { backgroundColor: C.gold, color: C.navyDeep, fontSize: '16px', fontWeight: 'bold' as const, borderRadius: '999px', padding: '14px 34px', textDecoration: 'none', display: 'inline-block' },
  payNote: { fontSize: '12px', color: C.goldSoft, margin: '12px 0 0', lineHeight: '1.5' },
  fallback: { fontSize: '12px', color: C.muted, margin: '0 0 18px', wordBreak: 'break-all' as const, textAlign: 'center' as const },
  portalBtn: { backgroundColor: '#ffffff', color: C.navy, fontSize: '14px', fontWeight: 'bold' as const, borderRadius: '999px', padding: '11px 26px', textDecoration: 'none', display: 'inline-block', border: `2px solid ${C.navy}` },
  foot: { backgroundColor: C.cream, borderTop: `1px solid ${C.line}`, padding: '18px 24px', textAlign: 'center' as const },
  footText: { fontSize: '13px', color: C.body, margin: '0 0 6px' },
  footSmall: { fontSize: '12px', color: C.muted, margin: 0 },
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
  revised = false,
}: Props) => {
  const pkg = packageLabel ? packageLabel.replace(/\n/g, ' ') : ''
  return (
    <Html>
      <Head />
      <Preview>{revised ? 'Your schedule proposal was updated' : 'Your DrivingKlass schedule proposal'}: review your dates and complete payment</Preview>
      <Body style={s.page}>
        <Container style={s.shell}>
          <Section style={s.head}>
            <Heading as="h2" style={s.brandName}>DrivingKlass</Heading>
            <Text style={s.stars}>★ ★ ★ ★ ★</Text>
            <Text style={s.tagline}>Where 5 Star Drivers Are Made</Text>
          </Section>

          <Section style={s.main}>
            <Heading style={s.h1}>{revised ? 'Your schedule was updated' : 'Your schedule proposal'}</Heading>
            <Text style={s.text}>Hi {recipientName || 'there'},</Text>
            <Text style={s.text}>
              {revised
                ? `${instructorName ? instructorName : 'We'} revised your proposed schedule. Please review the new dates below and complete your payment to lock them in.`
                : `${instructorName ? `${instructorName} has` : "We've"} put together a proposed schedule for you. Review the dates below and complete your payment to lock in your appointments.`}
            </Text>

            {noteToStudent ? (
              <Section style={s.card}>
                <Text style={s.cardTitle}>Note from {instructorName || 'your instructor'}</Text>
                <Text style={{ ...s.text, margin: 0 }}>{noteToStudent}</Text>
              </Section>
            ) : null}

            {items.length > 0 ? (
              <Section style={s.card}>
                <Text style={s.cardTitle}>Proposed dates ({items.length})</Text>
                {items.map((it, i) => (
                  <Section key={i} style={i === 0 ? undefined : s.rowLine}>
                    <Row>
                      <Column>
                        <Text style={s.date}>{it.dateLabel}</Text>
                        <Text style={s.time}>
                          {it.timeLabel}
                          {it.sessionType === 'testing' && it.locationLabel ? ` · ${it.locationLabel}` : ''}
                        </Text>
                      </Column>
                      <Column align="right" style={{ verticalAlign: 'middle' }}>
                        <span style={s.pill}>{it.sessionType === 'testing' ? 'Road Test' : 'Driving'}</span>
                      </Column>
                    </Row>
                  </Section>
                ))}
              </Section>
            ) : null}

            {pkg && paymentUrl ? (
              <>
                <Section style={s.pay}>
                  <Text style={s.payKicker}>Your package{typeof packageHours === 'number' ? ` · ${packageHours} ${packageHours === 1 ? 'hour' : 'hours'}` : ''}</Text>
                  <Text style={s.payPackage}>{pkg}</Text>
                  {packagePrice ? <Text style={s.payPrice}>{packagePrice}</Text> : null}
                  <Button style={s.payButton} href={paymentUrl}>Complete Your Payment</Button>
                  <Text style={s.payNote}>Secure checkout with Square. Your slot is confirmed once payment is received.</Text>
                </Section>
                <Text style={s.fallback}>
                  Button not working? Copy this link into your browser:<br />
                  <Link href={paymentUrl} style={{ color: C.navy }}>{paymentUrl}</Link>
                </Text>
              </>
            ) : null}

            <Text style={{ ...s.text, margin: '0 0 12px', textAlign: 'center' as const }}>
              You can also review, accept, or request edits in your portal.
            </Text>
            <Section style={{ textAlign: 'center' as const, margin: '0 0 24px' }}>
              <Button style={s.portalBtn} href={portalUrl}>Open Portal</Button>
            </Section>
          </Section>

          <Section style={s.foot}>
            <Text style={s.footText}>Questions? Call or text us at <strong>{SUPPORT_PHONE}</strong></Text>
            <Text style={s.footSmall}>{SITE} · <Link href={SITE_URL} style={{ color: C.muted }}>{SITE_URL.replace('https://', '')}</Link></Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Props) => `${d?.revised ? 'Updated: your' : 'Your'} DrivingKlass Schedule Proposal${d?.instructorName ? ` from ${d.instructorName}` : ''}`,
  displayName: 'Schedule Proposal',
  previewData: {
    recipientName: 'Alex',
    instructorName: 'Quamie',
    noteToStudent: 'Bring your permit and wear comfortable shoes.',
    items: [
      { dateLabel: 'Mon, Aug 3, 2026', timeLabel: '4:00 PM – 6:00 PM', sessionType: 'driving' },
      { dateLabel: 'Wed, Aug 5, 2026', timeLabel: '4:00 PM – 6:00 PM', sessionType: 'driving' },
      { dateLabel: 'Fri, Aug 7, 2026', timeLabel: '9:00 AM – 10:00 AM', sessionType: 'testing', locationLabel: 'DDS Carrollton' },
    ],
    packageLabel: '4 HR',
    packageHours: 4,
    packagePrice: '$230.00',
    paymentUrl: 'https://square.link/u/p0Oq0ixi?src=sheet',
  },
} satisfies TemplateEntry
