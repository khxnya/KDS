# Khanya Digital Studio

Khanya Digital Studio helps businesses improve their digital presence through design, development and visual storytelling. The studio works online from South Africa, without claiming a specific office location.

Available services:

- Website design and development.
- 3D animation and visual content.

Automation and application development are planned capabilities, currently in development. They are not operational offerings or products available to purchase. The roadmap uses status categories rather than dates or artificial completion percentages.

**Updating a working site? Keep your configured config.js. Follow TEAM-SETUP.md; the ZIP does not replace your connection settings.**

## What this project contains

A buildless public website, client portal, owner console and assigned-work developer portal. Revision 8 completes the Kite/Tilt identity interaction, balances Studio Access, adds the developer welcome panel, removes repeated greetings, introduces persistent notification quick/full views, connects project conversations with owner oversight, signs users out on explicit workspace exit, supports private profile images and adds branded XLSX reporting. The supplied project remains the foundation: existing project stages, lead handling, team jobs, inbox replies, analytics and account updates are retained. The public website presents the services, studio approach, collaboration invitation and clearly labelled self-initiated work. No commercial clients, testimonials, outcomes, prices or performance claims have been invented.

```text
index.html             Home, Services, Work, Studio and Contact hash routes
client.html            Client Login, Get started and private workspace
admin.html             Dedicated owner login and console, including Team & jobs
developer.html         Colleague login, assigned jobs and progress handovers
team.js                Team forms, checkpoints, private uploads and client progress
kinetic.js             Motion, provider authentication and REST integration
v6.js                  Shared controls, Studio Access, interlocks, motion and copy refinements
v6.css                 Shared dropdown, access, animation and developer-home styling
v7.js                  Notifications, project messages, account names and RAY refinements
v7.css                 Shared notification, message and settings styling
collaboration.sql       Additive project-message/notification tables, functions and RLS
v8-public.js/css        Identity, Studio Access, developer welcome, RAY and control polish
v8-workspace.js/css     Notification centre and authorised project-conversation interfaces
v8-session.js           Session exit/revalidation, loading, owner clock and profile image flow
v8-export.js            Owner reporting/snapshot actions
xlsx.js                 Dependency-free branded XLSX workbook generator
favicon.svg             Local KD browser icon
production-v8.sql       Additive profiles, messages, notifications, audit, Storage and RLS migration
PRODUCTION-V8.md        Exact revision 8 database, Edge Function and deployment handover
supabase/functions/     Server-side contact delivery function; secrets stay in Supabase
config.js              Your existing PUBLIC settings; preserve when updating
config.example.js      Blank public-settings template for a fresh installation
setup.html             Browser-only helper to preserve existing public settings
README.md              Setup, security, media, verification and handover
package.json           Optional developer checks, tests and build commands
package-lock.json      Reproducible developer dependencies
scripts/check.cjs      Embedded JavaScript, IDs and asset checks
scripts/build.cjs      Build static dist/ output and a credential-free release/ handover
scripts/configure.py   Generate public config from environment variables
tests/platform.cjs     DOM and mocked-provider regression suite
database.sql           Base workspace schema and RLS for a new installation
team.sql               Additive team tables, RPCs, RLS and private file bucket
TEAM-SETUP.md          Upgrade and Supabase team setup, explained step by step
tests/team.cjs         Assigned-work UI and PostgreSQL RLS integration checks
tests/team-db.cjs      Local PostgreSQL fixture with simulated Auth/Storage
tests/v8-db.cjs        Revision 8 function, RLS and event integration checks
tests/xlsx.cjs         XLSX structure, styling and formula-safety checks
tests/v8-public.cjs    Studio Access, Kite/Tilt and RAY regression checks
tests/v8-session.cjs   Protected exit, loading and session-state checks
tests/v8-workspace.cjs Notification, chat and role-settings regression checks
```

HTML contains its own CSS and small page-specific interaction modules. The shared runtime handles authentication and persistence. The production pages have no framework, remote font, CDN library or npm runtime dependency. Local/system fallbacks are used for the original Space Grotesk / Inter / JetBrains Mono stacks; exact font files were not supplied. Newly created visual studies use CSS/SVG. Supplied KD interlock geometry is retained as an internal identity study, not presented as client work.

## Upgrade from the previous working files

Revision 8 builds on the working revision 7 project. **Keep your currently configured config.js.** The handover bundle contains `config.example.js` rather than the working configuration, so extracting it cannot silently blank the existing connection.

1. Back up the current files and Supabase data, then test the change in a staging project with representative, non-sensitive records.
2. Upload the four HTML pages and every shared file from `kinetic.js` through the `v8-*` modules and `xlsx.js` together. Keep the configured `config.js` beside them.
3. If `database.sql`, `team.sql` and `collaboration.sql` are already installed, run only `production-v8.sql`. A new installation uses all four in that order. The revision 8 migration is additive and creates no demonstration activity.
4. Deploy the `contact-submit` Edge Function and set its server-side secrets if persisted contact delivery and owner enquiry notifications are required.
5. Clear cached HTML/JavaScript, sign in separately as owner, developer and client, and complete the isolation checks in [PRODUCTION-V8.md](PRODUCTION-V8.md).

The working Supabase public URL/key is shared by all portals; revision 8 does not require another browser key. Existing account passwords and owner authenticator setup remain with Supabase. No live database records, accounts, passwords, roles or provider settings are changed simply by downloading or building these files.

For a new installation, copy `config.example.js` to `config.js`, enter only public browser settings, and follow [PRODUCTION-V8.md](PRODUCTION-V8.md). `setup.html` can preserve existing public settings locally. Never replace a configured file with an empty template.

Rollback restores a compatible application bundle. Leave database tables and Storage objects intact when reverting visual code; do not drop production data to roll back a frontend release.

## Public configuration and environment variables

Edit config.js:

```js
window.KDS_CONFIG = {
  supabaseUrl: 'https://YOUR_PROJECT_REF.supabase.co',
  supabaseAnonKey: 'YOUR_PUBLIC_PUBLISHABLE_OR_ANON_KEY',
  enquiryEndpoint: 'https://YOUR_SERVER/enquiry',
  web3FormsAccessKey: 'YOUR_WEB3FORMS_ACCESS_KEY'
};
```

For production revision 8, set `enquiryEndpoint` to the deployed Supabase `contact-submit` Edge Function and leave `web3FormsAccessKey` empty. Keep the Web3Forms key in Supabase Function secrets so accepted enquiries can be recorded and notify the owner. Direct browser Web3Forms submission remains a limited fallback when no endpoint is configured; restrict any browser key to the live domain. It cannot create a trusted database notification. A renamed Supabase display name does not change its project reference URL.

Only the publishable/anon key is suitable for the browser. Never put secret/service_role keys in JavaScript. The runtime and setup helper reject recognised service-role/secret-key forms; that check is not a substitute for RLS. Public configuration is intentionally public. Server mail-provider credentials and service-role keys belong exclusively in your backend environment.

For a deployment pipeline, the optional generator reads:

```text
KDS_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
KDS_SUPABASE_PUBLIC_KEY=YOUR_PUBLIC_PUBLISHABLE_OR_ANON_KEY
KDS_ENQUIRY_ENDPOINT=https://YOUR_SERVER/enquiry
```

Then run:

```bash
python3 scripts/configure.py
```

The generated browser configuration is not a secrets store. Do not commit real backend credentials. Browser-only deployment does not automatically read shell environment variables.

## Run, check, test and build

For a direct static preview, no installation is required:

```bash
python3 -m http.server 8000
```

Open http://localhost:8000. Use HTTP locally and HTTPS in production, not file:// for portal testing.

For the developer checks, use Node 25+ (Node 26 recommended) and Python 3:

```bash
npm ci
npm run check
npm test
npm run build
npm run dev
```

The build command recreates two directories. `dist/` contains the complete static application and the local `config.js` when present. Upload its contents to the static host. `release/` is a credential-free handover containing `config.example.js`, all revision 8 modules, migrations, documentation and Edge Function source. Do not publicly host migrations or setup guides merely because they are included in the handover. No local demonstration password or account is included.

The platform tests use jsdom and a mocked provider. Team tests also execute the shipped SQL, functions and RLS in local embedded PostgreSQL (PGlite), with simulated Supabase Auth claims and Storage schemas. No production connection is made. Test account/password fixtures are fictional and are never accepted by the application itself. They are not accounts to create in production.

## Routes, onboarding and owner access

Public routes: index.html#home, #services, #work, #studio, #contact and the discreet #access workspace chooser. Public Login links to client.html. Public Get started opens the project enquiry. Studio Access offers colleague and owner routes only; clients use their dedicated Login destination. The chooser does not grant access or replace authentication. The client page has separate Login and Get started actions: Login uses an existing account; Get started creates a workspace account. Account creation does not purchase a service or automatically start a project. Recovery and onboarding include a return-to-Login route.

Clients use client.html and its Overview, Messages and Account sections. Overview includes the assigned project, recorded activity and file metadata. Messaging combines normal messages with a discreet priority-concern disclosure. Account changes use the authentication provider. The previous redundant connected-workspace strip and rating UI are removed.

Owners use admin.html through the Studio Access chooser or a direct bookmark. There is no prominent public owner button. Route obscurity provides no security. The owner console retains overview, progress board, projects, leads, inbox, analytics, a directory derived from recorded contacts, settings, exports and an accessible command palette, and adds Team & jobs. + New project opens a focused form with a contextual Back button, discard confirmation and a return to the project list after successful creation. The directory is not a list of all Supabase Authentication users. Account provisioning/deletion remains a trusted administrative operation.

Developers use developer.html, reachable from the discreet Studio Access chooser. There is no public colleague signup. The owner must first provision a separate Auth account and active team record. After login, the developer home greets the colleague by the trusted team-profile name, summarises assigned work, offers job shortcuts and lists only recent updates allowed by RLS. Jobs can restore directly at developer.html#job/JOB_UUID. Developer and client permissions are separate.

The sidebar owns the full desktop viewport with compact rows and scrollable navigation. Smaller screens use an off-canvas owner menu. The public mobile menu has one close control, visible above the open panel, with Escape, touch targets and focus handling. The wordmark has no outlined badge; it changes contrast over dark sections.

## Supabase accounts and provider setup

- Enable email/password Auth, email confirmation, a password policy of at least 12 characters, rate limits and appropriate abuse controls.
- Use custom SMTP for production account emails, with SPF/DKIM/DMARC and tested delivery.
- Configure exact Site URL and redirect allowlist entries, including the intended client.html URL. Password recovery uses the provider's implicit recovery-token redirect to that page; PKCE/code-only callbacks are not implemented.
- Enable TOTP enrollment and verification. The owner UI supports first-time QR/manual-key setup, current-code verification, retry and cancellation cleanup. A laptop authenticator can use the manual setup key.
- Provision owner accounts through trusted Supabase administration. Set app_metadata.role = admin through the server Admin API, or this targeted SQL after replacing the email with the intended owner account:

```sql
update auth.users
set raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where lower(email) = lower('YOUR_OWNER_EMAIL')
returning id, email, raw_app_meta_data->>'role' as studio_role;
```

Confirm exactly the intended owner row is returned. Never put role control in user_metadata, a public profile form, localStorage or client-supplied signup data. Normal client accounts need no admin role. Sign out and log in after a role change.

Owners require a provider-validated account, trusted admin app metadata and MFA aal2 before owner records load. Client accounts cannot enter the console. Owner accounts are directed to the separate owner route rather than being silently treated as clients.

## Authentication investigation and correction

The supplied prototypes contained a browser-side owner check and shared hardcoded demonstration credentials. That path could accept the client demonstration password for the owner demonstration email because both used the same hardcoded value. The earlier revision also supported a localhost demo query and a shared session key, which could make session restoration appear to be validation of newly typed credentials.

This revision removes browser-side credential comparisons, demo seeding, fallback logins and plaintext password storage from both application HTML files. Explicit login starts a fresh provider request using the exact submitted email/password, clears the current portal's previous session first and verifies that the authenticated user matches the submitted account. Roles come from the validated provider record. Client, developer and owner session keys are separate.

The original shared-password weakness was reproducible in the isolated archived prototype, and the new suite rejects an owner email paired with the client fixture password, rejects valid client credentials on the owner route and rejects forged owner-session metadata. The tests do not establish the cause of a specific incident on the deployed Supabase project. Provider logs, real account settings and actual deployed source were not available. Two real provider accounts can legitimately have the same password if configured that way; the frontend cannot diagnose or prohibit that by comparing passwords across accounts. Review the actual accounts and rotate reused passwords through the provider if needed.

## Sessions, refresh, logout and recovery

- kds_owner_session, kds_client_session and kds_developer_session are separate sessionStorage entries. Tokens are not printed to logs or embedded in URLs by the application.
- A KD loader remains visible while a saved session refreshes and the provider validates the user. Protected data is not fetched/rendered before authorisation. The console/client section and the developer job route are restored from the URL hash. A selected client project is remembered by an identity-scoped sessionStorage key, and rechecked against that user's projects.
- A provider-invalid or unauthorised session returns to the appropriate login. A network restoration failure retains the stored session and shows Retry rather than pretending the user has no account.
- Logout clears the current portal's local session and protected UI immediately, then requests provider sign-out. A failed network request cannot guarantee remote token revocation; follow provider session-revocation procedures for incidents.
- Recovery tokens are removed from the URL, and a labelled new-password/confirmation form replaces the old prompt. MFA/provider policy still applies to sensitive provider operations. Recovery email delivery and the real redirect domain must be tested externally.
- New mutations recheck the account with Auth and enforce the required role/MFA before issuing requests. Database policies independently enforce access outside the UI.

Refresh uses a periodic token renewal while the page is active. Long-background tabs, provider-side role changes and session revocation require live testing with your configured JWT lifetime. Keep production access-token lifetime appropriate and revoke sessions through trusted administration when removing privileged access. Refresh tokens in sessionStorage are exposed to same-origin JavaScript; there is no claim of HttpOnly server sessions in this static implementation.

## Database and RLS

Review database.sql. The public table uses these kinds: projects, leads, messages, profiles and private_notes. It starts empty. Projects and messages are assigned by trusted owner_email matching the authenticated provider email. Changing an email requires a reviewed reassignment of existing records. Internal notes are separate private_notes records and are never included in client-readable project JSON.

The migration:

- Enables RLS, revokes anonymous/PUBLIC table access and grants authenticated operations subject to policies.
- Gives admin access only with a trusted admin claim AND aal2.
- Lets client-role accounts read only their own projects/messages/profiles. team.sql narrows this condition so developer-role accounts are excluded.
- Lets clients insert only their own messages/concerns, with allowed fields/categories and no forged studio reply.
- Gives clients no project update/delete, lead access, private-note access or studio-reply update policy.
- Refuses to proceed if it detects an unexpected existing policy instead of silently leaving an unknown permissive policy in place.

It retains records and does not replace your production database. Back up and test it in staging before applying to your intended project. A frontend role check alone is not an access-control boundary.

**Live policy verification is still required.** From outside the interface, test with the public key and fresh sessions for client A, client B and the owner: anon reads/writes fail; A cannot read B; A cannot change ownership, project stages, private notes or replies; owner aal1 cannot read/write privileged rows; owner aal2 can perform the intended operations. Review every exposed table/bucket, old tables, grants, Security Advisor findings and storage permissions. These checks were not run against your live Supabase project here.

Multiple related REST writes (for example project conversion and separate private notes) are not atomic transactions. Production workflows that need atomicity should be moved into validated database functions. The JSON schema is intentionally compatible with the existing project and is not a full business-domain schema. The team feature adds private uploads and short-lived signed URLs through separately guarded tables/functions; general user administration is still handled through trusted Supabase administration.

Revision 8 adds `production-v8.sql` after the three earlier migrations. It provides account profiles, persistent per-recipient notifications, message receipts, guarded project-conversation RPCs, contact/agreement event hooks, owner-visible audit records and a private profile-image bucket. Notifications and conversations are added to the Supabase Realtime publication, while the interface retains refresh/polling recovery when a connection is interrupted. The migration replaces named `kds_*` functions, triggers and policies but does not delete business rows or insert fictional activity. Exact deployment and isolation checks are in [PRODUCTION-V8.md](PRODUCTION-V8.md).

Agreement records and completion notifications form a backend foundation only. A legally reviewed signing provider or trusted server callback must verify completion before calling the service-only completion function. The project does not claim that drawing a signature in the browser or changing a status field is a completed signing integration.

## Team jobs, checkpoints and files

See [TEAM-SETUP.md](TEAM-SETUP.md) for the exact migration and account setup. The owner assigns an existing client project to a colleague with a title, brief and optional due date. Several jobs/disciplines can belong to one project. The owner view offers search, status filters, a compact summary, reassignment and handover review. It does not add worker surveillance or time tracking.

Developers read only their currently assigned jobs, brief, checkpoints and deliverables. They post In progress / Ready for review / Needs attention updates. These are append-only records. The owner can accept completion, return the job to work, or archive it, with an internal review note. Assignment status never silently changes the overall client project's stage or budget.

Updates and assets default to **internal**. Selecting Also share with client publishes the item to that project's client Overview; the owner can see internal and shared material. Clients cannot see job briefs, staff roster, internal notes or other clients' assets. A reassigned developer loses future access to the job and its files, including direct API operations. Access already downloaded and still-valid signed links cannot be recalled; new links require current permission.

Supported uploads are JPEG/PNG/WebP/GIF/AVIF, MP4/WebM, PDF, ZIP, GLB/GLTF and Blender (.blend), up to 50 MiB. Use an HTTPS progress link for larger renders. Storage is private. Image/video files open in a controlled viewer with native playback controls; other files use a signed link. Links are created on demand and expire after five minutes. A user must click to open external progress links. No external preview service or autoplay is used. File types are not malware scanned or content-verified by this feature; share work only with intended recipients. Broader backend hardening was deferred as requested.

Upload metadata is prepared as pending, then the object uploads, then a guarded function verifies the stored object before marking it ready. Pending/failed files never appear in client views. A failed upload retains the form draft and attempts cleanup. A lost connection or closed tab may leave a pending item for administrative cleanup. Closed jobs are read-only to developers. Deleting a core project with linked jobs is deliberately blocked by its foreign key rather than discarding the work history.

All new writes use guarded database functions; table grants provide SELECT only to signed-in users. Owner actions require trusted admin metadata plus MFA aal2. Developer permission requires trusted developer metadata, an active team record and current assignment. The private bucket policies also check assignment/client-project ownership. This is the minimum access control required for the new feature, not a claim that the complete production backend has been audited.

## Contact delivery and spam protection

The current form offers Website design/development, 3D animation/visual content and General/collaboration enquiry. It has labels, required fields, limits, a honeypot, separate processing consent and optional unticked marketing consent, pending/error states and request idempotency. The budget slider and number field stay synchronised. FAQ answers form one accessible, single-open accordion.

The configured `enquiryEndpoint` accepts JSON with an `Idempotency-Key` header and returns HTTP 2xx plus `{"success":true}` only after the delivery provider accepts the message and the backend records that result. Failed submission retains the enquiry text and duplicate clicks are suppressed.

The shipped `contact-submit` Edge Function uses a server-held Web3Forms key, exact-origin CORS, validation, a honeypot, request idempotency and database rate limiting. It records a contact submission and produces the owner notification only after provider acceptance. The displayed contact address is `khanyaszn@gmail.com`. Do not put the Supabase service key or backend delivery key in this project. Direct browser Web3Forms remains a fallback when no endpoint exists, but it cannot create a trusted owner notification. This build can verify request and database behaviour locally; it cannot verify your Web3Forms account, allowed domain or inbox. Submit a real enquiry from the deployed domain before claiming delivery is live.

## Media and Work page

The Work page accurately identifies the studio platform, supplied KD identity explorations and a browser-based motion study. The study is not presented as a rendered client animation. Filters, reliable Kite/Tilt identity switching, motion pause and context disclosures are functional. Reduced motion disables the automatic study and hides its animation control.

The 3D service wording uses the supplied low-poly, game-inspired reference as creative context. It describes stylised scenes, branded environments, product animation, promotional visuals and website content without limiting the service to PS1/N64 aesthetics. No reference prices, packages, client names, reviews, results or production claims are copied into the site.

The A closer look section has an animated poster clearly labelled as a studio study until a real film is supplied. No unavailable film is presented as completed work. To add a local MP4:

1. Upload it to media/studio-introduction.mp4 on your host.
2. In index.html find id="studio-film".
3. Set data-video-src="media/studio-introduction.mp4" and leave data-video-embed="".

For a YouTube/Vimeo embed, leave data-video-src empty and set data-video-embed to a supported HTTPS embed URL (youtube-nocookie.com/embed/VIDEO_ID or player.vimeo.com/video/VIDEO_ID). No external player loads until the visitor requests it and permits external media. No autoplay is used. Withdrawal unloads the player. Native controls, a close action, responsive aspect ratios and clear button alignment are included. Add licensed media, captions, an appropriate transcript/audio description and final media accessibility checks when supplying the film. Public studio-video replacement is a host/media configuration task; the private team bucket is for project deliverables, not a public studio-video upload CMS.

## Cookies, notices and legal review

The banner has Accept all, Essential only and Manage preferences choices. There are no analytics, advertising or remote-font scripts in the build. Optional external video defaults off. A footer control reopens preferences; rejection/withdrawal blocks future media and removes an open player. Existing provider cookies may need clearing in browser settings.

Storage inventory:

| Item | Purpose | Duration |
| --- | --- | --- |
| kds_owner_session | Essential owner session | Tab lifetime/logout |
| kds_client_session | Essential client session | Tab lifetime/logout |
| kds_developer_session | Essential colleague session | Tab lifetime/logout |
| kds_client_project_<user id> | Selected own project | Session/logout |
| kds_portal_theme | Functional appearance preference | Until cleared |
| kds_privacy_preferences | Essential + external-media choice | Up to six months |

Dialogs use native modal semantics, keyboard handling, focus restoration, scroll ownership and reduced-motion-aware transitions. Policy labels are professional; legal compliance is not claimed. Confirm the legal operator identity, Information Officer, final retention/deletion procedures, complaints route, third-party operators and processing countries, and obtain appropriate policy approval before public launch. Missing details must not be invented. Consent notices must match your configured enquiry provider and video service.

## Reports, exports and backups

The owner can keep CSV for simple interchange or create a formatted `.xlsx` report with logical worksheets, filters, frozen headings, readable widths, consistent date/number formats and Khanya Digital colours. Text is neutralised when it could be interpreted as a spreadsheet formula. Credentials, tokens and secret configuration are excluded.

The JSON download is labelled an application snapshot. CSV, XLSX and JSON reports are not full Supabase backups: they do not contain Auth credentials, every database object, Storage files or provider configuration. Use Supabase database backups plus a separately tested Storage/Auth recovery process for restoration. Keep all reports restricted because they can contain personal and project information.

## Hosting, maintenance and rollback

Use HTTPS, exact auth redirects and tested security headers. Configure nosniff, a suitable Referrer-Policy and frame-ancestors protection. The retained inline scripts/styles/event handlers need a nonce/hash/event-handler migration before a strict no-inline CSP can be claimed. No hosting headers are installed by merely including these files.

Maintain provider database/Auth backups appropriate to your plan, test a restore in staging and restrict every exported report or snapshot. Keep a compatible previous application bundle and migration history for rollback. Do not drop production tables to roll back a design change. Audit configured backend dependencies and credentials separately; they are outside this static bundle. No actual user records, emails, passwords, MFA factors or production settings were changed by this development session.

## Checks performed and genuine limits

npm run check verifies embedded/standalone JavaScript syntax, unique IDs, local script references and absence of the old application demo credentials. npm test exercises mocked provider sign-in, cross-account password rejection, role isolation, MFA retries/enrollment/cancellation, client data isolation, mutations, failure feedback, refresh/route restoration, offline restoration, recovery, logout, navigation/back behaviour, menu state, form autocomplete/validation, the Studio Access dialog, command-palette keyboard semantics, rapid Kite/Tilt changes, FAQ single-open behaviour, Work interactions, developer welcome/activity isolation, consent/media gating and modal scroll closure.

The team suite additionally executes the migration twice and tests real PostgreSQL RLS/functions in a local simulated Supabase schema: owner aal1/client/anonymous rejection, absent-role denial, assignment isolation, internal/client visibility, append-only access, pending-to-ready uploads, reassignment, handover and the Storage-policy rollback guard. This verifies the shipped SQL under those fixtures, not your live project configuration.

The final build was also rendered in headless Chromium at 1440×960, 834×1112 and 390×844 for the public site, and at tablet/phone widths for authenticated owner, developer and client fixtures. The checks covered viewport overflow, Kite/Tilt, Studio Access, RAY, developer welcome content, notification panel bounds, single greetings, Community Chat, settings and owner export controls without page or console errors. Screen-reader use, physical touch devices and real media playback still need device-level review. Live Supabase RLS/Storage integration, Auth/email redirects, Web3Forms inbox delivery, backups, media licensing and final business policies remain external setup/verification requirements.

The dependency audit covers the developer package lock when run. The production site itself has no npm runtime dependencies. No remote repository or full historical Git secret scan was available for the user's separate repository; old uploaded prototypes were inspected locally.
