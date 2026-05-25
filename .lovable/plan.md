
This is a large, cross-cutting change. Before I implement, here is the plan so you can confirm scope and so nothing else gets touched.

## 1. Shared report card: splash after access code

`PublicReportCard.tsx` already moves to a `splash` state right after the code is verified and plays `report-card-splash.mov` before revealing the report. I will verify and harden the flow (autoplay, 4s fallback, fade) but no major rewrite is needed unless QA shows it skipping the splash.

## 2. Intake form — exactly 5 sequential steps

Replace the current single-page intake with a 5-step wizard. **Only** these fields:

1. **Full Name** (single field — split into `first_name` / `last_name` on save)
2. **Phone Number**
3. **Permit** — attach OR take a picture (camera on mobile). Uploads to existing `permits` storage bucket and writes to `permit_documents` like today.
4. **Pickup & Dropoff Location(s)** — two address fields on one step
5. **Emergency Contact** — name + phone on one step

Removed from the visible flow: permit number, permit issue/expiration dates, guardian email, availability days/windows/notes, avatar upload. (DB columns stay — we just stop requiring them. Existing admin views keep working.)

Emergency contact maps to the existing `guardian_name` / `guardian_phone` columns so admin tools, notifications, and approvals keep functioning unchanged.

Submit at end of step 5 marks `intake_submitted = true` (same as today) and clears the draft.

## 3. Draft autosave across all steps

Each step autosaves on field change via the existing `useFormDraft` localStorage hook **plus** a new server-side draft so it survives device changes:

- New table `public.intake_drafts` keyed by `user_id` with `data jsonb`, `current_step int`, `updated_at`. RLS: owner read/write, staff/admin read.
- Permit file: upload immediately to `permits` bucket as a draft on step 3 (status `pending_review`, source `intake_form_draft`). If the user abandons, the file is still preserved and admins see it in the Permit Queue as an in-progress upload.
- On returning to `/intake`, hydrate from the server draft and resume on the saved step.

## 4. Public contact form (homepage)

`ContactForm.tsx` will be reduced to the same fields as the intake (Full Name, Phone, Permit attachment optional, Pickup, Dropoff, Emergency Contact name + phone, plus the existing email + optional message). Other fields are removed from the UI. The `contact_submissions` row stores everything in existing columns; new fields (pickup/dropoff/permit/emergency contact) are saved into the existing `message` column as a structured block **and** mirrored into new nullable columns on `contact_submissions` so admins can convert cleanly:

```
pickup_address, dropoff_address, permit_attachment_path,
emergency_contact_name, emergency_contact_phone
```

## 5. Admin: convert message → intake

On `AdminMessages.tsx` (and `AdminLeads.tsx` where relevant), add a **"Convert to Intake"** button visible when the submission's `email` matches a `profiles.email` for a student that has not yet submitted intake. It:

1. Copies name/phone/pickup/dropoff/emergency contact into that student's `profiles` row.
2. Copies permit attachment (if present) into `permits` bucket under the student's id and inserts `permit_documents` row.
3. Sets `intake_submitted = true`, `approval_status = 'pending'`.
4. Marks the submission `status = 'converted'` and links it via a new `converted_profile_id` column.

After this, when that student signs up and logs in, they bypass `/intake` (gate already checks `intake_submitted`).

## 6. Verification

After implementation I will:

- Build the project (auto-run by harness).
- Manually walk the 5 intake steps in the preview, refresh mid-flow to confirm server draft hydration, and confirm submission gates correctly.
- Submit a public message with all fields and convert it from the admin Messages page; confirm the target student's profile is populated and they skip intake on next login.
- Enter an access code on a shared report and confirm the splash video plays before the report appears.

## What I will NOT change

- Authentication, role system, scheduling, report cards, ratings, hours, calendar, permit queue review UI, dashboards, theme. Existing DB columns and policies stay; new columns/tables are additive only.

If this matches what you want, approve and I will implement end-to-end in one pass.
