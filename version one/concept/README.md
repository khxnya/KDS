# Khanya Digital — Concept v3

A self-contained redesign concept. **Nothing outside this folder was touched** — your live
`index.html`, `client.html` and `admin.html` are untouched, and this build stores its data
under separate `kdc_*` localStorage keys so it cannot corrupt your existing data either.

```bash
python -m http.server 8000 --directory concept
```

Then open `http://localhost:8000`.

---

## Logins

| Surface | Where | Login | Password |
| --- | --- | --- | --- |
| **Client workspace** | `client.html` | `demo@client.co.za` | `demo1234` |
| **Owner console** | `admin.html` (or the "Studio owner?" link on the client login) | `hello@khanyadigital.co.za` | `khanya2026` |

The owner credentials also work on the client sign-in form — it detects the owner and
redirects to the console, the same behaviour your current build has.

**Try the loop end to end:** sign in as the client → "Report a concern" → sign out →
open the owner console → the concern is in **Inbox** and flagged on **Overview** → reply
to it and move the project on the **Board** → sign back in as the client and the stage,
the activity timeline and your reply are all there.

---

## The direction

**Navy is the dark. Gold is the light. Blue is the system.**

Your logo already carries a blue K and a gold D, and *Khanya* means light — but the old
site used blue-on-navy only, which is the most generic combination in tech. Promoting the
gold to a co-lead colour gives the brand a story that writes itself, and separates it from
every other blue studio site instantly. Gold is used sparingly and always means the same
thing: *this is switched on.*

Type is **Space Grotesk** for display and **Inter** for text. Geometric and characterful
without being decorative — no serif, no cursive, nothing that reads as a template.

### The motion system

Six named primitives, one shared engine (`kinetic.js`), one IntersectionObserver, one
rAF loop and one pointer listener for the whole site — so it stays fast:

1. **Mask reveal** — headlines wipe up from behind an invisible edge, line by line.
2. **The beam** — a bar of light that draws itself left to right under section headings.
3. **Light sweep** — a gold wash that fills in behind the key word as it lands.
4. **Light field** — the hero canvas: a grid of dots that breathe, and turn gold near
   your cursor. The brand metaphor made literal and interactive.
5. **Magnetic / tilt** — primary buttons lean toward the cursor; cards tilt in 3D with a
   light source that follows the pointer.
6. **Stagger** — grids arrive in sequence rather than all at once.

Plus the signature interaction: **THE SWITCH** on the home page — drag the gold divider
across to wipe between "in the dark" and "switched on." It self-demonstrates once when it
scrolls into view, and it's keyboard-operable with ← →.

All of it respects `prefers-reduced-motion`, and every hidden-until-revealed rule is gated
on `html.js` — if JavaScript fails, the page is simply static and fully readable rather
than blank.

---

## What I removed, and why

Ordered by how much damage each one does.

### 1. The three fake testimonials — **the most important removal**

"Lebohang M., Owner, Bloom Beauty Studio · ★★★★★" and two more, on the Work page.

These are invented endorsements from named people at businesses that are not your clients.
In South Africa that runs into the Consumer Protection Act's prohibition on false
representations, and the ARB Code treats fabricated testimonials as a straightforward
breach. Set the law aside though — the practical risk is worse. One prospect Googles
"Bloom Beauty Studio", finds nothing, and now everything else on your site is suspect,
including the true parts. Fabricated social proof is the single highest-risk asset a new
studio can put on a page.

### 2. The fabricated performance metrics

"+68% online bookings", "−60% admin time", "+3× qualified enquiries". Same category as
above: specific, checkable-sounding claims attached to work that wasn't a client
engagement. Delete the numbers and you lose nothing; keep them and you're one question
away from an unanswerable conversation.

### 3. The three concept mini-sites — you were right

Bloom, Peak Fitness and Harvest Homes, each in browser chrome with a fake live domain in
the URL bar. Presenting a concept mock inside a browser frame with `bloomstudio.co.za`
in the address bar implies a shipped site. They're also the reason `index.html` is 569KB
— they're built from base64-inlined JPEGs.

They're replaced by something stronger and true: **the platform itself is the case study.**
You built a public site, a client workspace and an owner console that share one data loop,
single-handed, with no framework. That is a more impressive thing to show a prospect than
three mockups, and every claim about it can be verified by clicking.

### 4. The invented studio numbers

"248 leads captured", "27,398 monthly visits", "12 projects delivered", "36 automations
running", "12+ projects shipped" on About. Presented as your studio's figures.

The Command Centre mock is a genuinely good sales asset, so I kept it — but reframed as a
**labelled product demo** with an explicit "these are demo figures, not the studio's
trading numbers" note underneath. It now sells the console instead of misrepresenting your
traction, and it lets you show the interface honestly.

They're replaced on the home page by **claims you can actually keep**: 24h reply, 0
templates, 1 revision round included, 100% ownership handed over, 50% deposit. Every one
is a commitment rather than a boast, which is far more persuasive to someone deciding
whether to trust a new studio.

### 5. The chatbot's API-key input — **remove this before anything else ships**

`<input placeholder="Paste Anthropic API key (sk-ant-...)">` on a public page.

Two problems. It trains visitors to paste secrets into a web page, which is a habit you
never want to encourage. And any key pasted there is exposed in the browser and sent
directly from the client — if that were ever your key, it would be billable by anyone who
opened dev tools. Replaced with a **scripted studio-desk concierge**: instant answers on
pricing, timelines and what you actually build, no key, no cost, no risk — and it hands
off to the contact form, which is what a lead widget is for anyway.

### 6. "Restricted Access", "Module 04 — Phase 02", "Transmit signal"

The corporate-cosplay register. "Module 06 — Native & Cross-Platform" and "Phase 02 ·
Restricted Access" on a page anyone can open reads as a hobby project dressing up as an
enterprise, which is the opposite of the intended effect. Sections are still numbered —
that's good structural design — but the language is now plain.

### 7. Dead links

Every social icon was `href="#"`, and Privacy and Terms went nowhere. Broken links on a
studio site are the fastest credibility leak available, because a visitor reads them as
"this was never finished." Now: the email link is real, and the rest say plainly what
they're waiting on rather than silently failing.

### 8. The fake preloader

A 0→100% counter that measures nothing, costing a second of every first visit. The hero
now animates in on its own — which is the same drama, for free.

### 9. Duplicate navigation

You had a pill nav bar and a slide-out panel listing the same seven links, plus a "Login"
button rendered twice. Seven top-level items is also more than a studio needs. Now: five
(Home · Work · Services · Studio · Contact), with Apps and 3D as anchored sections inside
Services, and the panel does something the bar can't — roadmap, status, portal link.

### 10. Duplicated page structure

The Apps page and the 3D page used the same `.apps-lab` grid, the same `apps-soon` block
and identically-shaped cards. Reading them back to back makes the site feel copy-pasted.
Consolidated into Services, where they read as one coherent capability list.

---

## What I kept — deliberately

- **Your kinetic identity.** Not toned down: extended into a named system and applied
  consistently instead of ad hoc.
- **Coming-soon slots.** You asked to keep them, so Apps and 3D are still there, still
  badged, but now honestly labelled ("In build", "First release Q2 2026", "Prototype",
  "Concept stage") rather than implied as shipping.
- **Your Blender showcase**, the founder section, the automation philosophy
  (trigger → logic → action), and the FAQ answers — those were the strongest writing on
  the site and they're largely intact.
- **The Supabase contact pipeline**, wired exactly as it is in your live build.
- **Your own pricing numbers**, taken from your existing FAQ, just moved out of the FAQ
  and onto a real pricing section where buyers can find them.

---

## What I added

| Addition | Why |
| --- | --- |
| **THE SWITCH** interactive section | You needed one thing people remember. This is it, and it's on-brand rather than decorative. |
| **Published pricing** (Signal / Grid / Engine) | Your FAQ already admitted the numbers. Hiding them until someone asks costs you every prospect who won't ask. |
| **Three founding-client slots** | Turns "no portfolio yet" from a weakness into scarcity and a reason to move now. It also gives the Work page a genuine call to action. |
| **The platform as the flagship case study** | The honest answer to "show me your work", and a better one than mockups. |
| **A build standard** (six commitments) | Replaces fake metrics with verifiable promises. |
| **Client portal: activity timeline, files & approvals, progress ring, derived stage copy** | The old portal told a client their stage; this one tells them what happened, what's happening, and what's next. |
| **Owner console: command palette (Ctrl K), drag-and-drop board, lead drawer, lead → project conversion, client inbox with reply, area chart** | The old console was a list of records. This one is something you'd actually open daily. |
| **Stage changes write to the client's timeline** | Moving a card now generates a client-visible update automatically — the loop closes without you writing anything. |

---

## Files

```
concept/
├── theme.css      # design tokens + the six kinetic primitives (shared by all three)
├── kinetic.js     # the motion engine — one observer, one rAF loop, one pointer listener
├── index.html     # public site: Home · Work · Services · Studio · Contact
├── client.html    # client workspace
├── admin.html     # owner console
└── images/        # copied from your originals, unchanged
```

Images are referenced as files rather than base64-inlined, so the pages are a fraction of
the original 569KB and the browser can cache them.

---

## Before this goes anywhere near a real client

Two things carried over from the current build that are worth stating plainly:

1. **Client-side auth is a gate, not security.** Passwords live in the browser and in page
   source. Fine for a demo; not fine for real client data on a public URL. The fix is
   Supabase Auth with row-level security — the UI does not need to change.
2. **Your Supabase anon key is committed to the repo.** That is normal for an anon key
   *provided* row-level security is enabled on every table. Worth confirming that it is
   before launch, because without RLS an anon key is a public read/write handle on your
   database.

Neither is a dead end — both are the same migration, and it's already first on your
roadmap.
