# Implementation Plan

## 1. Scheduling: blocked time for instructors
- Loosen the `schedule_blocks` SELECT RLS to allow `authenticated` users with the `instructor` role to read all blocks (admins already covered). Students remain excluded.
- Update the schedule queries used by the instructor calendar to fetch `schedule_blocks` and merge them into the day view alongside sessions.
- In the "all dates" calendar list view, sort the merged session+block list for each day by start time (currently blocks render after sessions). Fix the comparator so `starts_at` is the single sort key.

## 2. Report card form upgrades (instructor-facing)
On `ReportCardForm.tsx` add a new "Sharing & Delivery" card with:
- **Access code**: text input (4–10 chars) pre-filled with current auto-generated code. Saved to `report_cards.access_code` on submit.
- **Show graph in public view**: checkbox writing `report_cards.show_graph_public`.
- **Send to parent/guardian**: checkbox, disabled with tooltip when the student profile has no `guardian_email`. Saved to `report_cards.send_to_guardian` so the submit hook can fan out.
- **Time-spent chart (optional)**: multi-select for `parking_lot | subdivision | city | backroads | interstate`. For each selected category, render a slider/number input; values auto-normalize to 100% on submit. Persist as JSON in new column `report_cards.time_split` (`{parking_lot: 25, city: 50, ...}`).

Add a "Time spent during lesson" visual to `ReportCardView.tsx` and `PublicReportCard.tsx` that renders a horizontal stacked bar (i18n labels) when `time_split` has values.

## 3. Custom entries for highlights
`SkillHighlightsEditor.tsx`: add a "+ Add custom note" option to each of strongest / most improved / focus area pickers. Custom notes are stored with `{ custom: true, label: "..." }` in `report_cards.highlights` so the radar chart and skill averaging exclude any item where `custom === true`. Update `SkillProgressRadar` to filter custom entries.

## 4. Emails
- Update the `report-card-submitted` email template to include the access code and a "View report card" button using the public link.
- When `send_to_guardian` is true, the report-card submit handler additionally enqueues the same template to `profiles.guardian_email` with the same `idempotencyKey` suffix `:guardian`.
- All sends already log to `email_send_log`; no infra changes needed.

## 5. Email log viewer
New page `/portal/emails` reachable from PortalLayout for `admin`, `staff`, and `instructor` roles:
- Admin/staff: full dashboard with the required six features (time range, template filter, status filter, summary stats, table, dedup by `message_id`).
- Instructor: same UI, but server query filters `email_send_log` rows where `metadata->>'instructor_id' = auth.uid()` OR `metadata->>'student_id' IN (their assigned students)`. To make this safe, add a SECURITY DEFINER RPC `get_visible_email_log(_from, _to, _template, _status)` that applies the role-based filter server-side. Admins skip the filter.
- We will backfill `instructor_id` / `student_id` into the `metadata` JSON for the report-card, lesson-reminder, and session-notification templates that already send today.

## 6. Database migration
Single migration adds:
- `report_cards.access_code TEXT` (if not already), `show_graph_public BOOLEAN DEFAULT true`, `send_to_guardian BOOLEAN DEFAULT false`, `time_split JSONB`.
- `schedule_blocks` SELECT policy update for instructors.
- `get_visible_email_log` RPC + GRANT EXECUTE to authenticated.

## 7. End-to-end verification
After deploying edge functions and running the migration:
- Use psql to confirm a sample row writes `time_split`, `access_code`, `send_to_guardian`.
- Use `supabase--curl_edge_functions` to invoke `send-transactional-email` with `templateName: report-card-submitted` and confirm the rendered subject/body includes the access code.
- Drive Playwright through: instructor login → create a report card → set custom passcode, toggle parent send, add a custom focus area, set time split → submit. Then load `/portal/emails` as instructor and as admin to confirm visibility scopes.

## Technical notes
- Schema columns are nullable / have safe defaults so existing rows continue to render.
- The `time_split` chart on the public view uses semantic tokens already in `index.css`; no new colors.
- The custom-entry flag lives in the JSON payload so no enum changes are needed.
- Instructor email visibility relies on `metadata` JSON, which is already populated by the send function — we only need to ensure callers include `instructor_id`/`student_id` going forward.