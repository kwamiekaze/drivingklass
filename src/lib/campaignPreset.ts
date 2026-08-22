// Canonical marketing campaign preset. Loading a preset never sends anything.

export const GAME_INVITE_PRESET = {
  name: 'Game Invite',
  subject: 'Think You Have 5 Star Driving Skills?',
  body: `Hi,
Before the real road comes the challenge.
Driving Klass created a quick driving mini game to help students test their focus, reaction time, and decision making skills in a fun way.
Play now: https://drivingklass.com/play
You can also request full road test videos using the message form on our homepage.
Driving Klass - Where 5 Star Drivers Are Made.
Give it a try and see how your driving instincts stack up.`,
} as const;

export type CampaignAudience = 'student' | 'guardian' | 'both';

export interface CampaignCounts {
  considered: number;
  eligible: number;
  duplicates: number;
  invalid: number;
  unsubscribed: number;
  suppressed: number;
  missingConsent: number;
  revokedConsent: number;
}

export interface CampaignReadiness {
  hasKey: boolean;
  keyName: string | null;
  domainVerified: boolean;
  domainDetail: string;
  marketingDomain: string;
  fromEmail: string;
  fromName: string;
  replyTo: string;
  businessName: string;
  businessAddress: string;
  canSendLive: boolean;
  blockers: string[];
}

/** Confirmation phrase required for campaigns over 100 recipients. */
export const confirmationPhraseFor = (count: number) => `SEND ${count}`;
export const requiresPhrase = (count: number) => count > 100;
