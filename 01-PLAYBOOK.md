# 01-PLAYBOOK: Khanya Digital Studio rules for AI-built client sites

Version 2.0 | 5 November 2026 | For: Claude (or any coding AI) building South African small business sites.
This is operational guidance, not legal advice or a guarantee of compliance. Items marked [verify] change or are disputed: say so and ask before relying on them.

Read this whole file before writing any code. Read 02-WORKFLOW.md next. If a request conflicts with a rule here, say so and ask before proceeding.

## 1. Never-break rules

1. Never invent facts: registration numbers, addresses, prices, reviews, awards, statistics, client logos, certifications, "years in business", guarantees. Use only facts in project/business-facts.md. If a fact is missing, insert a visible `[PLACEHOLDER]` and list it in COMPLIANCE_REPORT.md.
2. Never claim "100% compliant", "unhackable", "guaranteed uptime" or "guaranteed rankings". Say "built to POPIA, ECTA and CPA best practice".
3. Collect the minimum personal information. No ID numbers, birth dates, home addresses, card data, medical data, children's data (under 18) or file uploads unless the owner explicitly approves and controls exist.
4. Nothing non-essential (analytics, pixels, maps, video embeds, chat widgets) loads before opt-in consent.
5. Secrets never go in front-end code, git, prompts or logs. Only `.env.example` with names.
6. Never state a test passed unless you actually ran it. Separate automated tests, manual checks, and items needing a legal or security professional.
7. Stop and ask before any destructive or externally visible action: production deploys, DNS, billing, data deletion, migrations on production, sending email to real people.
8. Use dummy data in development. Never paste real customer data into tools.
9. Do not copy competitor text, images, branding, paid templates or unlicensed assets.
10. If the client is in a regulated trade (medical, legal, financial services, alcohol, gambling, firearms, children's services) or handles sensitive data or payments, pause and flag that specialist advice is needed.

## 2. South African legal baseline

- POPIA (Act 4 of 2013): any personal information, including emails, phone numbers, IP addresses. Protects companies too. The client is normally the responsible party. The studio is normally an operator. The client needs an Information Officer, named in the Privacy Policy.
- PAIA (Act 2 of 2000): confirm whether the client needs a PAIA manual.
- ECTA (Act 25 of 2002): s43 details block on every site that captures leads, takes bookings or sells: legal name and status, registration number, physical address, phone, email, VAT number if registered, description of goods or services, price and charges, delivery, return and cancellation terms, complaints route. s44: 7-day cooling-off on most online sales to individuals.
- CPA (Act 68 of 2008): plain language, no hidden terms or fees, accurate prices including VAT, no false or misleading claims (s41), rights that cannot be contracted out of.
- Copyright: every image, font and code snippet needs a licence or client ownership.
- Direct marketing (POPIA s69): electronic marketing needs prior opt-in. Every message identifies the sender and has an opt-out.
- Breach notice: the client, as responsible party, notifies the Information Regulator and affected people as soon as reasonably possible. There is no 72-hour rule in SA. The studio tells the client immediately and supplies facts. Never conceal an incident or delete logs.
- Offshore services (Supabase, Web3Forms, hosts, Google Fonts) are allowed under POPIA s72 conditions but must be named with the country in the Privacy Policy. Self-host fonts.

## 3. Required pages by site type

| Page or feature | Brochure | Leads or bookings | Logins or app | Shop |
|---|---|---|---|---|
| Details block in footer (ECTA s43) | Yes | Yes | Yes | Yes |
| Privacy Policy | Yes | Yes | Yes | Yes |
| Cookie Policy (banner only if non-essential items) | If any cookies | If any cookies | Yes | Yes |
| Terms of Use | Short | Yes | Yes | Yes |
| Returns, refunds, cancellation | No | If bookings or deposits | If paid plans | Yes |
| Form consent notice and marketing opt-in | If form | Yes | Yes | Yes |
| Data access and deletion process | Yes | Yes | Yes | Yes |
| Complaints route | Yes | Yes | Yes | Yes |

All legal pages are separate pages linked in the footer of every page and near every form.

## 4. Legal page protocol

- Draft each legal page as `legal/<name>.draft.md` and mark it `DRAFT FOR ATTORNEY REVIEW`. Plain English, short paragraphs, `[PLACEHOLDER]` for unknowns.
- Never publish legal text the client has not approved in writing. Record the approval date in legal/approvals/.
- Privacy Policy sections: who we are, Information Officer, what we collect (per form), why and lawful basis, who we share with (every operator and country), retention, security, rights and how to use them, complaints to the Information Regulator, marketing and opt-out, children, changes, date.
- Cookie Policy: table of every cookie and storage item (name, purpose, duration, provider, essential or not).
- The third-party list in the Privacy Policy must match the real scripts and services in the code.

## 5. Cookies and scripts

- Inventory every cookie, storage item, pixel, embed and widget first.
- Essential items may load without consent but are disclosed.
- Banner (only when non-essential items exist): Accept, Reject, Manage with equal prominence, plain purposes, Cookie Policy link, remembered choice, a way to withdraw.
- Cheapest low-risk default for brochure sites: no cookies or cookieless analytics, self-hosted fonts, no banner. The policy still states this.

## 6. Forms and Web3Forms

- Every form: labels, client and server validation, consent notice linking to the Privacy Policy, a separate unticked marketing checkbox, honeypot plus captcha, clear success and error states.
- Web3Forms: access key tied to the client's business email, botcheck honeypot, redirect to a thank-you page on the client domain, domain restriction where the plan allows [verify].
- Show success only when the service confirms acceptance. "Accepted" is not "delivered".
- Put the consent text in the submission so there is a record.
- No payment, ID or medical details through a basic form.

## 7. Supabase and auth

- One project per client. Prefer a client-owned organisation with the studio added as a member.
- RLS on every exposed table and storage bucket with least-privilege policies. Never `using (true)` on personal data. Test that one user cannot read or change another user's rows, using the anon key and a normal user.
- The publishable/anon key may be in the front end only because RLS protects the data. The service_role key never is. Rotate it at once if exposed.
- Auth: email confirmation, minimum password length, captcha and rate limits on sign-up, login and reset, generic messages that do not reveal whether an email exists, exact redirect URLs (no wildcards), handle the PASSWORD_RECOVERY event, server-side role checks, MFA for admins.
- Custom SMTP for production auth email. SPF, DKIM and DMARC verified. Branded templates. Free projects can pause and have limited backups: use a paid plan for live client sites [verify].
- Add `consent_at`, `consent_version`, `marketing_opt_in` to any sign-up table. Provide a documented deletion path. Decide retention (for example enquiries 12 months).
- Private buckets by default with signed URLs. Restrict upload size and type.
- Backups enabled and one restore tested before launch.

## 8. Application security

HTTPS only. Security headers (CSP, X-Content-Type-Options, Referrer-Policy, frame protection) tested for compatibility. Validate on the server, encode output, parameterised queries. Rate limit login, reset, public forms. No stack traces, tokens or personal information in logs or errors. Review dependencies and remove unused ones.

## 9. Content honesty (CPA s41)

No fake or unattributed reviews. Only real testimonials with permission. No unsupported superlatives ("best", "#1", "guaranteed"). Prices include VAT. No dark patterns: pre-ticked boxes, fake urgency, hidden cancellation, hidden fees. Design references often show "trusted by" rows, user counts and rankings: never reproduce them without real, permitted facts.

## 10. Accessibility

Target WCAG 2.2 AA. Semantic HTML, alt text on every image, 4.5:1 body text contrast, visible focus, keyboard navigation, skip link, labelled inputs, error announcements, respect `prefers-reduced-motion`, touch targets large enough on mobile.

## 11. Design defaults

- When the owner gives design picks (for example `design: 4, font: 7`), follow them. Explicit picks override the default style bans below.
- Default style bans when no pick is given: purple-to-blue gradients, gradient text, emojis in headings, glassmorphism, grain overlays, cursor effects, three-icon feature rows, untouched component-library defaults, em dashes, buzzword copy.
- A flagged design still needs contrast checks. Report any text that fails 4.5:1 and the fix.
- Use a spacing scale in CSS variables (4, 8, 16, 24, 40, 64). One deliberate font pair. Copy in the client's voice with specifics from the interview.
- Never reuse brand names, logos, photos or statistics from reference designs.

## 12. Assets

Only client-supplied or properly licensed assets. Log every file in project/ASSETS.md with source and licence. Self-host fonts and libraries.

## 13. Definition of done

Before saying a build is finished, produce COMPLIANCE_REPORT.md: pages built, every third party and why, data collected per form, cookie list, remaining placeholders, unresolved risks, env var names, migrations, backup and restore plan, rollback steps, and any rule not satisfied. Then confirm:

- Details block, Privacy, Cookie, Terms pages linked in every footer
- Every form has consent notice, unticked marketing box, spam protection
- No non-essential script loads before consent
- RLS tested, no secrets in code or git history
- Auth and email flows tested on production domain
- No `[`, `lorem`, `TODO`, `example.com` left in the repo
- ASSETS.md complete, alt text and contrast checked, keyboard path works
- robots.txt, sitemap.xml, 404 page, favicon, social preview tags
- Backups enabled, monitoring and renewal dates recorded
- Client approval in writing

## 14. Ownership and handover principles

The client owns the domain, hosting, Supabase organisation, repo and content. The studio holds named, revocable admin access. Never keep a client domain in a studio account. Record every account in project/ACCOUNTS.md (no secrets, no passwords). On offboarding remove studio keys and access and leave no hidden admin accounts.

## 15. Sales and cold calling

Use this section when the owner asks for prospecting, call scripts, follow-ups, proposals or sales material. Never contact anyone yourself. Draft only, the owner sends and calls.

### 15.1 Legal reality check

- POPIA s69 restricts unsolicited electronic marketing (email, SMS, WhatsApp, automated calls) unless the person consented or is an existing customer. POPIA protects companies too.
- Regulator guidance as summarised by law firms treats live phone calls as direct marketing too [verify]. The CPA lets consumers refuse direct marketing and limits contact hours [verify current times].
- Cold outreach is a grey area. Remind the owner to clear it with an attorney before scaling. Prefer warm routes first: referrals, walk-ins, chamber events, a Google Business Profile and portfolio that make people contact the studio, and replies to people who contacted the studio.

### 15.2 Outreach rules

1. On a call say who you are, whom you represent and why in the first ten seconds. Ask permission to continue.
2. Stop immediately when asked. Keep a do-not-contact list (name, number, date) and check it before every session.
3. Call weekdays in business hours only. Avoid Sundays and public holidays.
4. Do not follow up by email, SMS or WhatsApp unless the person agreed or asked. When you do, identify the studio and include an opt-out line.
5. No scare tactics about lawsuits or fines. State only real, checkable observations. Do not insult their current site.
6. Record each number's source and what the person agreed to. Treat the prospect list as personal information: minimal fields, protected, deleted when no longer needed.
7. Never invent claims, clients, results or prices in scripts. Use only the studio's real portfolio and price list.

### 15.3 Research (10 minutes per business)

Sources: Google Maps, directories, Facebook pages, chambers, supplier lists. Trades that live on trust and local search: plumbers, electricians, caterers, salons, cleaners, tutors, panel beaters, auto electricians, guesthouses, landscapers. Check: no website, Facebook only, no HTTPS, poor mobile use, no contact or WhatsApp button, forms with no privacy policy, outdated hours. Log in `sales/prospects.csv`: business, contact person, number, source, what you noticed, best time to call, the one thing the studio can improve. Prepare a one-page sample using their real name and services.

### 15.4 Call script (about 90 seconds to the ask)

- **Opener:** "Hi, is that [Name]? This is Khanya from Khanya Digital Studio. We build simple websites for local businesses. Did I catch you at an okay moment, or should I call back later?"
- **Reason (if yes):** "I was looking for [trade] in [area] and found [Business] on Google Maps. I noticed [one real observation]. I help businesses like yours get found and get enquiries by WhatsApp and email."
- **Discovery (pick two or three):** "How do most customers find you today?" "When someone asks your prices or hours, how do you respond?" "Do you lose work because people can't find you online or can't book?" "Is something stopping a website from happening?"
- **Bridge:** "Rather than sell you anything on the phone, I can do a free 15-minute website check. I look at how you show up, send three practical fixes, and you decide if you want help. Which day this week suits you?"
- **Close:** "Great. I'll confirm by [their channel] on [day]. Your details will only be used for this, and you can ask me to stop any time."
- **Voicemail (20 seconds, then stop):** "Hi [Name], Khanya from Khanya Digital Studio in [town]. I help local businesses get found online. You can reach me on [number]. Thanks, and have a good day."
- **Follow-up message (only after they agree or reply):** "Hi [Name], Khanya here from Khanya Digital Studio, following our call. As agreed, here is a short sample of how [Business] could look: [link]. Reply STOP at any time and I won't contact you again." A request for information is not permission to add someone to a marketing list.

### 15.5 Objection handling

| They say | Reply |
|---|---|
| "We have a Facebook page." | "Great for regulars. A simple site helps new customers who search Google, shows prices, hours and a quote button, and you own it. Many clients keep both." |
| "We use social media." | "Good for discovery. A website gives customers one central place for services, details and contact." |
| "Too expensive." | "Fair. We start with a small package so you see value first. May I send a quote with two options?" |
| "My nephew will do it." | "That can work. I'd ask him who owns the domain, whether the legal pages are done, and who fixes it when email stops. We include that." |
| "Send me an email." | "Happy to. Which address is right? I'll send one message with an unsubscribe line." |
| "Call me later." | "Of course. What day and time suit you?" |
| "Word of mouth is enough." | "Great sign. People check you online after a referral. Can I show you a one-page example?" |
| "Is this a scam?" | "Understandable. I'm Khanya from Khanya Digital Studio. Here is my number and website. Check me before deciding." |
| "We already have a site." | "Lovely. I can do a free check for speed, mobile use and legal pages. Would you like it?" |
| "Not interested." | "No problem, thanks for your time. I won't call again." Add to the do-not-contact list. |

### 15.6 The offer

Three packages and a care plan, in simple language. Prices come from the owner, never from you.

- **Starter:** one or three pages, WhatsApp and call buttons, Web3Forms contact form, privacy policy draft for client approval, ECTA details block, domain and hosting set up in the client's name.
- **Business:** up to 6 pages, services and gallery, Google Business Profile help, cookie banner if needed, branded email setup, monthly care plan.
- **Growth:** bookings, logins or client area on Supabase, custom auth emails, admin view, backups, quarterly review.
- **Care plan (monthly):** hosting oversight, monitoring, backups, small edits, security and legal-page updates, monthly report.

### 15.7 Rhythm, log and meeting

- Block 60 to 90 minutes. Prepare ten researched prospects the day before.
- After every call log in `sales/call-log.csv`: date, outcome, what they agreed to, next step and date, any do-not-contact request.
- Proposal within 24 hours of the meeting. Follow up once, then once more after a week.
- Monthly review of which source and message produced bookings, then refine the script.
- 30-minute meeting: greeting and goal, show the sample and three fixes, explain the package and the legal basics in two sentences, agree next steps (proposal, deposit, timeline, who supplies what, approval date).
- Red flags before quoting: client wants fake reviews, scraped marketing lists, copied competitor material, unlimited revisions or guaranteed rankings, or refuses to own the domain. Pause and scope separately.
