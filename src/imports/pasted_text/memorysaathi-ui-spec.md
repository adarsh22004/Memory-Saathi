Design a complete, high-fidelity mobile app UI for "MemorySaathi" — an AI-powered cognitive companion and memory-assistance app for elderly dementia patients in India's North Eastern Region, with role-based views for Patient, Caregiver, Doctor, and Admin. This is a real product for a healthcare hackathon, so treat it as a production-grade, investor-demo-ready design, not a wireframe.

FRAME / DEVICE
- Mobile app only. Use iPhone 14/15 frame size, 390 x 844 px, portrait, status bar included.
- Every screen must be fully scrollable where content exceeds the viewport (show scroll affordance / content overflowing below the fold).
- All buttons, tabs, icons, cards, and nav items must look and behave like real interactive elements (visible pressed/active/selected states), not flat decoration.
- Design as a connected prototype: link buttons to the destination screens so it's clickable end-to-end (Welcome → Onboarding → Login → Role Dashboard → sub-screens → Games).

DESIGN LANGUAGE
- Style: minimal, calm, accessible, elder-friendly, trustworthy, and technical — like a real deployed healthcare product designed by a human product team. AVOID any look that reads as generic "AI-generated UI": no default purple-gradient hero blobs, no generic glassmorphism, no stock-looking blob illustrations, no over-decorated empty space filled with random shapes. Every visual element must have a clear functional purpose.
- Color palette: white / near-white background (#FFFFFF, #F7FAFA), deep teal as the single primary accent (#0F6B66 style) for buttons, active states, and key highlights, a lighter teal tint (#E4F3F1 style) for card backgrounds and selected states, soft charcoal/graphite for body text (#2B2F31, not pure black), one muted slate-grey for secondary/disabled elements, and one warm amber used ONLY for alerts/notifications so it stays meaningful and rare. No purple/lavender, no brown/terracotta. Keep contrast high and text legible for older adults.
- Typography: clean humanist sans-serif (Nunito), generous size (base 16-18px, headings bold 22-28px), high line spacing, no dense paragraphs, consistent type scale reused everywhere (don't invent new sizes per screen).
- Corner radius: consistent, moderate (12-16px) — soft but restrained, not bubbly.
- Anti-clutter rule: each screen should have ONE clear primary focus. If a screen is starting to hold too much information (e.g. metrics + chart + notification + activity list all at once), SPLIT it into a dedicated sub-page reached by a "View all / See more" link rather than stacking everything on one screen. Use generous white space and clear section breaks (dividers or spacing, not boxes-in-boxes) instead of packing cards edge to edge.
- Iconography: simple single-weight line icons only, no duotone/filled icon clutter — leaf logo mark for brand identity, heart outline = patient, people outline = caregiver, medical cross/pulse outline = doctor, shield outline = admin.
- Touch targets minimum 48px height, large tap-friendly buttons throughout — this app is used by elderly patients and their families.
- Include a language switcher (English / Hindi / Assamese / Bengali) visible in the top bar on every screen, styled as a plain small dropdown, not a decorated pill.
- Include a small, understated "AI personalized" text label (not a loud badge) wherever content is AI-selected — it should look like a quiet product detail, not a marketing sticker.
- Show a small, plain "Synced [time]" or "Offline · will sync" status text near the top of dashboards to reflect the offline-first architecture — text label, not a heavy pill/graphic.

SCREEN 1 — SPLASH / WELCOME (on app open)
Full-bleed clean white background, centered MemorySaathi leaf logo, app name in large bold type, short calm tagline "Your gentle companion for memory and connection." Small "Preparing your journey..." microcopy at bottom.

SCREEN 2 — ONBOARDING / "LET'S GET STARTED" (2-3 swipeable slides)
Slide 1: family + elderly person illustration, headline "Let's Get Started". Slide 2: Memory Bank concept, headline "Your Memories, Personalized". Slide 3: caregiver + doctor dashboard, headline "Family and Doctors, Together". Pagination dots, "Skip" top-right, primary "Next"/"Get Started" button pinned bottom.

SCREEN 3 — LOGIN (role-based)
Header with back arrow, leaf logo, language dropdown. "Welcome Back" + "Let's continue your journey." Role selector: 2x2 grid of large cards — Patient (heart), Caregiver (people), Doctor (medical), Admin (shield) — selected state = filled deep-teal background + checkmark. "Patient ID, mobile or email" field. "Password or PIN" field (masked, eye icon). Full-width "Sign in securely →" button in deep teal. Caption "Demo access works offline · Secure role-based access". "Forgot password?" link. Secondary link for caregiver-assisted new patient setup.

SCREEN 4A — PATIENT DASHBOARD
Top bar: logo, language dropdown, "Patient view" pill. "Good morning, [Name] 👋", avatar top-right, "Synced [time]" status text. "Today's progress" block: X of Y activities, progress bar, circular % ring labeled "observed" (not "score"), caption "Participation is progress." "AI Personalized — Today's journey" section with "See all →". Large featured activity card (deep-teal filled, "AI selected" label, duration chip): title, description, "Start activity ▶" button. "Next up" list of activity rows with chevrons. Bottom tab bar: Home, Activities, Memory, Routine, Profile.

SCREEN 4B — ACTIVITIES / GAMES LIBRARY
Header "Your Activities", segmented filter row (All/Recognition/Recall/Orientation/Attention/Language). Scrollable cards for: Family Recall, Who Is This?, Relationship Match, Focus & Find, What's Missing?, Daily Orientation, Routine Next, Category Sort, Word Association, Sound Recognition — each with icon, name, description, difficulty badge (Gentle/Guided/Focused), time estimate, tappable.

SCREEN 4C — GAME SCREEN (reusable template + 3 worked examples)
Template: top bar (back/close, activity name, progress dots), large content area, big multiple-choice buttons OR mic button for voice, "Hint" secondary button, bottom encouragement bar. Build: 1) Family Recall — photo, "Who is this?", 3 answer choices, mic, hint reveals relationship. 2) What's Missing? — grid of 4-5 objects, one removed, "Which one is missing?". 3) Daily Orientation — "Today is...", day/time/next-routine multiple choice, calendar icon. Plus a Session Complete screen: calm illustration, "2 of 3 activities complete today", soft encouraging stats, "Continue journey"/"Back to home" buttons.

SCREEN 5 — MEMORY BANK
Header "Familiar & Close — Memory Bank", back arrow, "+" add button. Tabs: People/Places/Objects/Events. 2-column grid of photo cards (name + relationship, e.g. "Rahul — Son"). "Add memory" flow: photo upload, name field, relationship dropdown, voice note option, consent checkbox, save button. Bottom info card: "Memory → AI → Activity" 3-step diagram.

SCREEN 6 — ROUTINE & REMINDERS
Header "Today's Routine" with date. Vertical timeline (8:00 AM Breakfast, 10:00 AM Walk, etc.) with completed/upcoming states. "Add reminder" button, voice reminder toggle. Caregiver edit-mode variant.

SCREEN 4D — CAREGIVER DASHBOARD
Top bar: logo, language dropdown, "Caregiver view" pill. "Welcome back, [Name]", "A calm overview of [Patient]'s engagement.", patient chip top-right, synced status. ONE focus: 3 plain metric blocks (Recall/Attention/Orientation %) separated by thin dividers, not boxed. One subtle amber-accent notification row: "Today's session is 2 of 3 complete. A reminder may help when it feels right." "Performance overview →" link to a SEPARATE screen. Bottom tabs: Home, Patients, Memories, Reports, More.

SCREEN 4D-ii — CAREGIVER PERFORMANCE REPORTS (separate page)
Header "This Month — Performance Overview". One clean teal bar chart "Observed activity performance — Last 30 days". Separate divided blocks below: "Recent activity log" list, then "Memory Bank contributions" shortcut.

SCREEN 4E — DOCTOR / CLINICIAN DASHBOARD
Top bar with "Doctor view" pill. Patient selector dropdown. Longitudinal trend charts (Recall/Recognition/Attention/Orientation, single teal line chart at a time via tab control), plain-text "Observed:" captions — never diagnostic claims. "Session history" on its own separate screen/tab. "Add clinical note" + "Export authorized report" buttons. Persistent disclaimer strip: "This dashboard supports observation. It does not diagnose dementia or its stage."

SCREEN 4F — ADMIN DASHBOARD
Top bar with "Admin view" pill. "Content Operations — Activities" header, "Add activity →" link. Activity management rows with icon, subtitle, "Active" status pill. Info banner: "The library supports engagement. It does not assess or diagnose dementia." Bottom tabs: Users, Patients, Activities, Analytics, More. Separate "Analytics" tab state: total active patients, average engagement, language distribution chart.

SCREEN 7 — PROFILE / SETTINGS (role-aware)
Avatar, name, role badge. Rows: Language, Voice settings, Accessibility (text size, high contrast), Notification preferences, Connected caregivers/clinicians, Privacy & consent, Data sync status, Help & support, red "Log out" clearly separated.

GLOBAL COMPONENTS
Role-aware bottom nav bar, primary button (filled deep teal), secondary outline button, role badge pills, metric block (ring/number+trend+label), activity/game card, progress bar + circular ring, subtle alert row, bottom sheet modals for Add memory/Add reminder, empty state, offline banner/sync-status text.

Produce all screens as separate, clearly labeled frames in one Figma page, using one consistent design system (color styles, text styles, reusable components) across every screen so it feels like one cohesive, technical, production-ready app.

IMPORTANT: Do not just output a plan, outline, or summary. Directly generate the full high-fidelity visual UI for every screen listed above right now, as real rendered frames with actual layout, text, colors, icons and components filled in — not empty dashed placeholder boxes.