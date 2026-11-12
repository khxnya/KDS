# Revision 8 production setup

Revision 8 adds persisted profiles, project conversations, notification state, profile images, audit records, contact-submission records and agreement event hooks. The browser interface is complete only after the additive database migration and contact Edge Function are connected to the same Supabase project.

## Before changing production

1. Download or create a Supabase database backup appropriate to your plan.
2. Restore or reproduce representative records in a separate staging project.
3. Deploy the revision 8 application and migration to staging first.
4. Test with separate owner, developer, client A and client B accounts. Never reuse production passwords in staging.
5. Confirm client A cannot read client B's projects, messages, files or notifications, and confirm a developer loses access after reassignment.

The migrations are additive and do not insert demonstration users, messages, notifications or projects. They replace named `kds_*` functions, triggers and policies so the checked-in definitions become authoritative. Review the SQL before running it, especially if your project contains hand-written policies with the same names.

## Migration order

For a new project, run these files in the Supabase SQL Editor in this order:

1. `database.sql`
2. `team.sql`
3. `collaboration.sql`
4. `production-v8.sql`

For an existing project where the first three migrations have already succeeded, run only `production-v8.sql`. Do not run `database.sql` again merely to install revision 8.

`production-v8.sql` checks for the earlier team and collaboration tables before it starts. It adds:

- `kds_profiles` for account names and role-appropriate preferences.
- Message receipts, idempotent project-message sending and participant-scoped conversation functions.
- Persistent notifications with per-recipient read state and deduplicated event keys.
- Contact-submission records and a trigger that notifies owners after a successful delivery has been recorded.
- Agreement records and a completion-event hook.
- Owner-visible audit events for sensitive actions.
- A private `kds-profile-images` Storage bucket and guarded avatar workflow.
- Realtime publication entries for notifications, project messages and message receipts.
- Row Level Security, grants and guarded RPCs for the new records.

The final queries in the migration list the installed policies and profile-image bucket. Save their output with the deployment record. A successful SQL Editor message alone does not prove that real accounts are isolated correctly.

## Contact delivery Edge Function

The production contact path is `supabase/functions/contact-submit/index.ts`. It validates and rate-limits a submission, sends it through Web3Forms, records the accepted submission through a service-only database function, and then lets the database trigger notify owners. A failed provider response is returned as a failure and must not create a success notification.

Deploy it from a Supabase CLI project linked to the intended environment:

```bash
supabase functions deploy contact-submit --no-verify-jwt
supabase secrets set KDS_ALLOWED_ORIGIN=https://www.example.com
supabase secrets set WEB3FORMS_ACCESS_KEY=YOUR_WEB3FORMS_ACCESS_KEY
supabase secrets set KDS_RATE_SALT=GENERATE_A_LONG_RANDOM_VALUE
```

Hosted Supabase functions provide `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the function. Do not copy the service-role key into `config.js`, HTML, source control or the ZIP. `KDS_ALLOWED_ORIGIN` must be the exact public origin, including `https://` and without a path or trailing slash. Use the staging origin while testing staging.

Set the public endpoint in the deployed site's `config.js`:

```js
window.KDS_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT_REF.supabase.co',
  supabaseAnonKey: 'YOUR_PUBLIC_PUBLISHABLE_OR_ANON_KEY',
  enquiryEndpoint: 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/contact-submit',
  web3FormsAccessKey: ''
};
```

Keep `web3FormsAccessKey` empty when the Edge Function is used. The backend-held Web3Forms key enables persisted owner notifications and keeps delivery configuration out of the browser. The direct browser Web3Forms path remains a limited fallback; it cannot create a trusted database notification.

The form includes consent validation, a honeypot, request idempotency and backend rate limiting. Cloudflare Turnstile support in the Edge Function is optional. Do not set `TURNSTILE_SECRET_KEY` until the matching site widget/token integration is enabled on the public form, or valid submissions will fail the check.

After deployment, send one real enquiry from the allowed public origin. Confirm all three results before claiming delivery works:

1. The visitor sees the success state only once.
2. The message reaches `khanyaszn@gmail.com` through the verified Web3Forms account.
3. One `kds_contact_submissions` row and one owner notification exist for the request.

Web3Forms account verification, allowed-domain configuration and inbox delivery cannot be verified by local tests.

## Authentication, roles and account names

The browser uses the Supabase publishable/anon key. Database RLS and security-definer RPCs enforce access. Trusted roles belong in `auth.users.raw_app_meta_data.role`; users must never be able to edit their own role.

- Owner: trusted `admin` app-metadata role and MFA `aal2` for owner-only operations.
- Developer: trusted `developer` app-metadata role plus an active `kds_team` row and a current project/job assignment.
- Client: authenticated account whose email owns the relevant project record.

Names and preferences are saved through `kds_save_my_profile`. Existing users without names receive a neutral greeting and can complete their profile. The owner display is Khanya Ngema only for the configured owner account; the migration does not overwrite unrelated profiles.

Explicit “Back to live site” workspace exits request provider sign-out, clear local protected state and replace the current history entry. Protected pages revalidate the session when restored from browser history. Browser caches cannot be treated as an authorisation boundary, so RLS remains required for every protected request.

## Notifications and Community Chat

Notifications are persisted in `kds_notifications` and filtered by recipient. Read state is updated through `kds_mark_notifications_read`. Database triggers emit supported events after successful message, assignment, progress, contact and agreement changes. Event keys prevent duplicate inserts for the same recipient and event.

Project conversations use `kds_project_messages` and `kds_message_receipts`. Clients can access their own projects, developers only current assignments, and owners only through the verified owner predicate. The portals call guarded list/send/read RPCs. Realtime publication is enabled by the migration; the browser also refreshes after mutations and provides a periodic fallback if a realtime connection is interrupted.

Test direct API attempts as client A, client B, an unassigned developer, an assigned developer, owner `aal1`, owner `aal2` and anonymous. Hidden navigation is not evidence of access control.

## Profile images

The private `kds-profile-images` bucket accepts JPEG, PNG, WebP and AVIF images up to 5 MiB. The client first requests a user-scoped path, uploads to that path, and completes the profile record through a second guarded function. Bucket objects are not public URLs. Test upload, replacement and sign-out behaviour with each supported role.

## Agreements and signing

Revision 8 contains agreement records, owner creation, a service-role completion hook and completion notifications. It does not supply a legally binding e-signature provider or public signing ceremony. Connect a reviewed signing provider or trusted server integration, and call `kds_record_agreement_completion` only after that provider verifies completion. Until then, agreement-completed notifications are backend-ready but the signing flow is not production-complete.

## Excel reports and backups

The owner console offers two different downloads:

- CSV/XLSX reports for reading, analysis and handover. XLSX has branded sheets, filters, frozen headings, readable widths, date/number formatting and formula-injection protection.
- A JSON application snapshot for compatible application-level records.

Neither download is a full Supabase backup. They exclude Auth credentials, tokens, Storage objects and database internals. Use Supabase database backups plus a separately tested Storage/Auth recovery plan for restoration. Restrict all exports because they may contain customer data.

## Build and deployment

```bash
npm ci
npm run check
npm test
npm run build
```

`dist/` is the static deployment output. It includes `config.js` when one exists locally; inspect it before uploading. `release/` is the credential-free handover bundle. It contains `config.example.js`, all revision 8 modules, migrations, documentation and the Edge Function source. It intentionally excludes the working `config.js`.

Upload the complete contents of `dist/` together so HTML and JavaScript revisions cannot drift. Configure exact Auth redirect URLs for `client.html`, `developer.html` and `admin.html`, use HTTPS, and invalidate cached HTML/JavaScript after release.

## Verification checklist

- Kite and Tilt change the visual, title, description and selected state on desktop and mobile.
- Studio Access offers developer and owner entry only; clients use `client.html`.
- Each protected dashboard shows one greeting from the authenticated profile.
- Notification quick/full views load persisted records, mark read state and follow authorised links.
- Client/developer project messages appear in the owner Community Chat and remain project-scoped.
- Explicit workspace exit requires a fresh login before protected data is usable again.
- Owner avatar, profile settings and Johannesburg 12-hour clock render at phone, tablet and desktop widths.
- XLSX opens in Excel/LibreOffice with expected worksheets, filters and formatting; CSV remains available.
- Contact failure retains the form, success is deduplicated, delivery reaches the intended inbox and the owner receives one notification.
- Anonymous/cross-account REST calls fail under RLS.

Local tests use fixtures and do not touch production. Live Auth email, MFA, Web3Forms delivery, Realtime connectivity, Storage, RLS isolation and signing-provider behaviour still require staging and production validation with real configuration.
