# Khanya Digital — Digital Studio Platform

A production-ready platform for an independent digital studio that designs, builds, and manages complete digital systems — websites, applications, automation, and 3D. The repository ships three integrated surfaces (public studio site, client workspace, and owner operations console) as dependency-free, single-file HTML/CSS/JS.

> _Khanya means "light" in isiZulu. The platform is built on that idea: systems that switch a business on, and infrastructure that keeps the lights running._

---

## 1. Overview

Khanya Digital is positioned as a technology partner rather than a single-service provider. The platform is intentionally modular: new capabilities — 3D visualisation, a knowledge centre, additional client tools — attach to the existing structure without a redesign. What exists today is the first phase of a system built to expand.

The repository is three coordinated surfaces that share one data loop:

| Surface            | File          | Audience                | Purpose                                            |
| ------------------ | ------------- | ----------------------- | -------------------------------------------------- |
| Public studio site | `index.html`  | Everyone                | Positioning, capabilities, work, and lead capture  |
| Client workspace   | `client.html` | Clients                 | Live project tracking, messaging, and self-service |
| Operations console | `admin.html`  | Owner (passcode-locked) | Leads, project board, analytics, and settings      |

**All three files must live in the same folder on the same domain** — they share state through the browser's `localStorage`.

---

## 2. Architecture

The platform follows a deliberately simple architecture chosen for reliability, speed, and zero operational overhead.

- **Presentation:** Each surface is a single self-contained HTML document. Styling is native CSS with a shared design-token palette (CSS custom properties); motion is CSS and canvas, never a framework.
- **Client-side routing:** `index.html` is a single-page application. A `PAGES` array and a `go(page)` function toggle `.page` sections and their matching nav state — no full reloads. New pages are added by extending that array and adding a matching `#page-<key>` section.
- **State & data:** A thin `load()` / `save()` layer reads and writes JSON to `localStorage`. This is the single integration seam — replacing it with a hosted backend is the primary migration path (see Roadmap).
- **Integration loop:** A form submission becomes a lead, a lead becomes a project, a project drives the client workspace, and a client concern routes back to the owner — all live, all through the shared store.

The architecture is intentionally decoupled at the data layer so the interface can remain unchanged while the backend evolves.

---

## 3. Project structure

```
.
├── index.html          # Public studio site (SPA: home, work, about, automation,
│                       #   apps, 3D studio, resources, contact)
├── client.html         # Client workspace — auth, live project tracker, messaging
├── admin.html          # Operations console — leads, board, analytics, settings
├── README.md           # This document
├── images/             # Project imagery used on the Work page
└── logo concepts/      # Brand explorations (logo.html, interlocks.html)
```

Navigation on the public site: **Home · Work · About · Automation · Apps · 3D · Resources · Contact.** The 3D Studio and Resources sections are live scaffolds — structured, themed, and wired into navigation — presenting capabilities that expand over time.

---

## 4. Features

### Public studio site (`index.html`)

- Animated preloader (0→100%), kinetic hero reveal, and scroll-triggered reveals throughout.
- Glass "pill" navigation with a hover slider and working dropdown deep-links that jump to exact sections.
- Hero "Command Centre" dashboard mock with live counters and an embedded studio feed.
- Work page with three distinct illustrated project cases.
- Automation page with six plain-language, n8n-style animated pipeline diagrams.
- 3D Studio and Resources sections positioned for continuous expansion.
- Contact form that **saves every submission as a lead** for the operations console.
- Uploadable profile photo, side scroll indicator, and an assistant with optional live-AI mode.

### Client workspace (`client.html`)

- Cinematic greeting → sign in / sign up / password-recovery flows.
- Live project tracker: stage stepper, % complete, "what's happening now / what's next", days in stage, and launch estimate — so clients never have to chase a status update.
- **Report a concern** (priority-flagged) across delay, quality, automation, and billing categories.
- Message the studio (routes to the owner's inbox), status-tracked feed, account self-service, and experience rating.
- Signing in with owner credentials routes straight to the operations console.

### Operations console (`admin.html`)

- Passcode lock screen matching the restricted-access theme.
- **Overview:** leads, weekly activity, open pipeline value, open concerns, projects in motion.
- **Board:** columns (Scoping → In Development → In Review → Ready → Live) with movable cards.
- **Projects:** add/edit/delete, clickable stage stepper, client-email linking, private notes.
- **Leads:** every submission with budget and brief, status pipeline, search, filter chips, quick-add, CSV export; concerns arrive flagged.
- **Analytics:** conversion rate, won value, leads per week, funnel, service and stage breakdowns — computed from real data.
- **Settings:** light/dark/system theme, passcode and login name, JSON backup & restore, demo-data removal.

---

## 5. Technology

- **HTML5, native CSS, vanilla JavaScript** — no framework, no build tooling.
- **CSS custom properties** for a single shared theme (deep navy, professional blues, glass surfaces).
- **Canvas** for particle fields and pipeline diagrams; **SVG** for iconography and brand marks.
- **`localStorage`** as the current persistence layer (JSON).
- **Optional live-AI assistant** via a user-supplied API key, entered at runtime and never committed.

Chosen deliberately: nothing to compile, nothing to patch, and a payload light enough to load instantly anywhere.

---

## 6. Configuration & credentials

Change these before any public deployment.

| Account         | Login                                                         | Password     | Where to change                           |
| --------------- | ------------------------------------------------------------- | ------------ | ----------------------------------------- |
| **Owner**       | `Khanya` or `hello@khanyadigital.co.za` (on the client login) | `khanya2026` | Console → Settings                        |
| **Demo client** | `demo@client.co.za`                                           | `demo1234`   | Remove via Console → Settings → demo data |

The owner passcode also unlocks `admin.html` directly and powers the "Log in as developer" option on the client workspace. Google/Apple sign-in buttons are placeholders until hosted auth lands (see Roadmap).

### Data model (`localStorage` keys)

| Key                         | Contents                                                              |
| --------------------------- | --------------------------------------------------------------------- |
| `kd_leads`                  | Contact submissions, client messages, concerns, ratings               |
| `kd_projects`               | Projects: name, client, budget, email, stage (0–4), notes, timestamps |
| `kd_clients`                | Client workspace accounts                                             |
| `kd_pass` / `kd_owner_user` | Owner passcode and login name                                         |
| `kd_theme`                  | Console theme preference                                              |
| `kd_avatar`                 | Uploaded profile photo (base64)                                       |

All state is plain JSON; backup/restore in Settings exports and imports it as a single file.

---

## 7. Deployment

No build step, no dependencies.

```bash
# any static server
npx serve .
# or
python3 -m http.server 8000
```

Open `http://localhost:8000`. A local server (rather than `file://`) guarantees the three surfaces share `localStorage`.

**Production:** any static host — Netlify, Vercel, GitHub Pages, or cPanel. Upload all three files to the same directory on the same origin so they share state. Serve over HTTPS, set a long cache lifetime on `images/`, and change all default credentials before going live.

---

## 8. Scalability philosophy

The platform is designed to grow without being rebuilt.

- **Modular pages.** Sections are independent `.page` blocks driven by one array. Adding a capability means adding a page and a nav entry — never reworking the layout.
- **One integration seam.** All persistence flows through a thin data layer, so moving from `localStorage` to a hosted backend touches a handful of helpers, not the UI.
- **Shared design tokens.** A single palette and component vocabulary keep new surfaces consistent by default.
- **Nothing looks finished by accident.** The structure signals a studio that keeps evolving; future modules are meant to feel like a natural next step.

---

## 9. Roadmap

Ordered by impact.

1. **Hosted backend for leads** — the highest-value change. A managed Postgres project (e.g. Supabase) with `leads`, `projects`, and `clients` tables plus row-level security. The UI is unchanged; only `load()` / `save()` move.
2. **Real authentication** — email + magic links; owner becomes an admin role.
3. **Notifications** — new lead → owner alert; stage change → client update (email / WhatsApp).
4. **File sharing** — deliverables, invoices, and approvals per project in the client workspace.
5. **Payments** — deposit links on quotes (PayFast / Yoco for ZA).
6. **3D Studio buildout** — configurators and product renders behind the scaffolded section.
7. **Knowledge Centre** — publish the Resources library (journal, guides, templates).
8. **Codebase split** — extract shared CSS/JS as surfaces grow.
9. **Live public analytics** — feed real visit data into the Command Centre.

---

## 10. Repository standards

- **Commits:** conventional prefixes — `feat:`, `fix:`, `style:`, `docs:`, `refactor:`.
- **Branches:** short-lived feature branches merged into `main`; keep `main` deployable.
- **Consistency:** reuse existing CSS classes and design tokens rather than introducing new patterns.
- **Assets:** optimise images before committing; keep brand explorations under `logo concepts/`.
- **Secrets:** never commit API keys or real client data; demo data is clearly fictional.

### Versioning

Semantic tags mark meaningful milestones — e.g. `v1.0-static` (current single-file platform) and `v2.0-hosted` (backend + auth). Tag releases as capabilities land so deployments are traceable.

### Production deployment notes

Rotate default credentials, serve over HTTPS, and confirm all three files share an origin before launch. Treat client-side auth as gating, not security, until the hosted backend is in place — see limitations below.

---

## 11. Honest limitations

Read before deploying with real client data.

1. **Client-side auth is not security.** Passcodes and passwords live in the browser and page source. It keeps casual visitors out; it will not stop anyone technical. Fine for a demo or local tool — not for real client data on a public URL until a backend is in place.
2. **`localStorage` is per-browser, per-device.** State does not sync across devices until wired to a backend.
3. **No server-side email.** Password recovery resets locally; forms don't notify you — the console is the source of truth.
4. **Single-file pages are large.** Continued growth argues for splitting shared CSS/JS.
5. **Passwords are stored in plain text** in `localStorage` (see #1).

None of these are structural dead ends — each is resolved by the backend migration on the roadmap.

---

## 12. Long-term maintenance philosophy

Keep the platform boring to run and easy to extend. Prefer native web primitives over dependencies, keep the data seam thin and well-labelled, and let the design system — not one-off styles — carry new work. Every addition should feel like part of a coherent, evolving whole rather than a bolt-on. The goal is a system that stays production-quality as it grows, not one that has to be rebuilt to grow.

---

_Built by Khanya Ngema · Khanya Digital — Pretoria, South Africa._
