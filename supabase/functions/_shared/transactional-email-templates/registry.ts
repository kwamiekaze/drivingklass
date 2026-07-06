/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import { template as lessonScheduled } from './lesson-scheduled.tsx'
import { template as lessonCancelled } from './lesson-cancelled.tsx'
import { template as lessonReminder } from './lesson-reminder.tsx'
import { template as reportCardSubmitted } from './report-card-submitted.tsx'
import { template as intakeConverted } from './intake-converted.tsx'
import { template as intakeAccepted } from './intake-accepted.tsx'
import { template as updateAddresses } from './update-addresses.tsx'
import { template as guardianAdded } from './guardian-added.tsx'
import { template as trackingStarted } from './tracking-started.tsx'
import { template as trackingUpdate } from './tracking-update.tsx'
import { template as trackingEnded } from './tracking-ended.tsx'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: any) => string)
  displayName?: string
  previewData?: Record<string, any>
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'lesson-scheduled': lessonScheduled,
  'lesson-cancelled': lessonCancelled,
  'lesson-reminder': lessonReminder,
  'report-card-submitted': reportCardSubmitted,
  'intake-converted': intakeConverted,
  'intake-accepted': intakeAccepted,
  'update-addresses': updateAddresses,
  'guardian-added': guardianAdded,
  'tracking-started': trackingStarted,
  'tracking-update': trackingUpdate,
  'tracking-ended': trackingEnded,
}
