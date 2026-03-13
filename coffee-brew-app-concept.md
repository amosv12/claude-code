# Coffee Brewing App Concept: **Brewcraft**

## 1) Product Vision
**Brewcraft** is a premium-yet-friendly mobile app that helps people brew better coffee every day through guided workflows, data-backed insights, and elegant tracking. It serves both specialty coffee enthusiasts and beginners by pairing expert tools with approachable coaching.

The core promise: **"Great coffee, repeatably."**

---

## 2) Target Users

### Primary Segments
1. **Specialty Enthusiasts**
   - Own grinders/scales and brew with intent.
   - Care about extraction quality, repeatability, and flavor expression.
   - Want advanced controls, deep logging, and trend analysis.

2. **Beginners Leveling Up**
   - May have a basic setup and inconsistent outcomes.
   - Need confidence-building guidance and simplified instructions.
   - Want to understand *why* a brew tasted sour/bitter/flat and what to adjust next.

3. **Home Espresso Improvers**
   - Struggle with dialing in beans across changing roast dates.
   - Need shot timing, dose/yield consistency, and grinder setting memory.

4. **Casual Daily Brewers**
   - Prefer convenience, but still want better taste with minimal complexity.
   - Benefit from one-tap "recommended recipe" and lightweight tracking.

---

## 3) Core User Pain Points
1. **Inconsistent results** due to changing grind, dose, water temp, and technique.
2. **Recipe overload** from internet sources with no personalization.
3. **Poor memory of what worked** (can't remember grind click, bloom time, ratio, etc.).
4. **Difficulty diagnosing taste problems** (sour vs bitter vs weak confusion).
5. **Method fragmentation**: different tools and notes for espresso vs pour-over.
6. **Lack of progression**: users improve slowly without clear feedback loops.
7. **Data friction**: logging feels tedious, causing drop-off.

---

## 4) Product Principles
1. **Approachable by default, deep on demand** (simple mode + pro controls).
2. **Brew guidance in the moment** (during the actual brew, not just pre-read recipes).
3. **Repeatability first** (capture critical variables automatically where possible).
4. **Personalized recommendations** based on user history, brew method, beans, and taste outcomes.
5. **Beautiful utility**: premium visual language without sacrificing clarity.

---

## 5) Core Feature Set

### A) Guided Brewing by Method
Support: **Espresso, Pour-over, AeroPress, French Press, Moka Pot, Cold Brew**.

Each method includes:
- Step-by-step workflow (prep, bloom/preinfusion, pours/press, finish).
- Contextual timer cues (e.g., "Start bloom", "Pour to 200g", "Swirl now").
- Visual progress indicators and haptic/audio prompts.
- Beginner explanations + optional expert tips.

### B) Recipe Management
- Library of curated base recipes by method and roast level.
- Save custom recipes with parameters:
  - Dose, yield, ratio, grind setting, water temp, agitation, brew time, filter type.
- Fork/duplicate recipes for experimentation.
- Tags: "daily", "competition style", "low-acid", "iced", etc.
- Bean-linked recipes (auto-surface recipes previously successful for selected coffee).

### C) Brew Tracking & History
- Fast post-brew logging with default carry-over from active recipe.
- Track variables:
  - Bean, roast date, grinder, setting, method, water profile, total time, yield.
- Track outcomes:
  - Strength perception, acidity, sweetness, bitterness, body, clarity, overall score.
- Timeline history with filters (method, bean, grinder, date range).
- Compare brews side-by-side.

### D) Personalized Recommendations Engine
- "What to change next" suggestions after each brew:
  - Sour/under-extracted → finer grind, hotter water, longer contact.
  - Bitter/over-extracted → coarser grind, cooler water, shorter contact.
  - Weak → higher dose or lower beverage yield.
- Adapts to user skill level:
  - Beginner: one recommended change at a time.
  - Advanced: ranked option list with expected impact.
- "Best-known profile" surfaced per bean + method.

### E) Smart Brewing Tools
1. **Adaptive timers**
   - Multi-stage timers per method with cue prompts.
2. **Brew ratio calculator**
   - Convert between dose ↔ water/yield.
   - Includes presets per method.
3. **Grind tracker**
   - Store grinder models and normalized settings.
   - Track setting changes and associated taste outcomes.
4. **Dial-in assistant**
   - Espresso-focused helper for dose/yield/time targeting.
5. **Tasting notes system**
   - Flavor wheel quick-select + free text notes.
6. **Brew history analytics**
   - Success trend charts, consistency score, and "personal best" brews.

### F) Bean & Inventory Layer (Optional but High Value)
- Bean cards: origin, process, roast level, roast date, roaster.
- "Peak window" reminders based on roast date.
- Remaining quantity estimator based on logged brews.

---

## 6) End-to-End App Flow

### First-Time Onboarding (2–3 minutes)
1. Welcome + value proposition.
2. Select skill level (Beginner / Intermediate / Advanced).
3. Choose available equipment (methods, grinder, scale, kettle).
4. Set preference goals (clarity, sweetness, body, convenience).
5. Create first brew recommendation instantly.

### Daily Use Loop
1. **Home** shows suggested brew (based on bean + prior history).
2. User taps **Start Brew**.
3. Guided brewing session with timer cues and step prompts.
4. Post-brew quick review (taste sliders + optional notes).
5. App returns targeted adjustment recommendation for next time.
6. Brew logged to history and contributes to trend analytics.

### Exploration Loop
- Browse recipes → save/fork → test → compare results → promote best variant to "favorite".

---

## 7) Main Screens

1. **Home Dashboard**
   - Today's suggested brew card.
   - "Brew again" shortcuts for recent successful recipes.
   - Bean status and peak freshness reminders.

2. **Brew Session Screen**
   - Large timer + stage timeline.
   - Step instructions with optional expanded details.
   - Live target checks (e.g., current pour weight vs target).

3. **Recipe Library**
   - Curated + user recipes with filtering by method/bean/goal.
   - Recipe detail with version history and performance badge.

4. **Log Brew / Post-Brew Review**
   - One-screen quick entry with sliders/chips.
   - Suggestion card generated immediately ("Try 2 clicks finer next brew").

5. **History & Analytics**
   - Calendar/timeline of brews.
   - Trend charts for score consistency, extraction proxy indicators, method success.
   - Comparison mode for two brews.

6. **Bean & Gear Profiles**
   - Manage grinders, methods, kettles, and bean inventory.
   - Per-grinder conversion notes (if multiple grinders are used).

7. **Settings & Experience Level**
   - Toggle "Simple" vs "Pro" mode.
   - Notifications for brew reminders and peak windows.

---

## 8) Personalization Logic (Conceptual)
A lightweight recommendation model can run on-device and improve over time:
- Inputs:
  - Brew method, recipe variables, bean metadata, roast age, grinder setting, taste ratings.
- Output:
  - Ranked variable adjustments with confidence score.
- Learning behavior:
  - Increase confidence when a suggested adjustment improves user score.
  - Decrease confidence when outcomes worsen.

This makes recommendations feel practical and evidence-based without requiring heavy complexity from users.

---

## 9) UX Strategy: Beginner-Friendly + Expert-Capable

### Beginner Experience
- Simplified terminology ("stronger" instead of "higher extraction yield").
- Single "next best action" recommendation.
- Guided recipes with reduced editable fields.

### Expert Experience
- Full control over variables and brew stages.
- Advanced charts and detailed brew metadata.
- Recipe branching/versioning and custom target profiles.

### Progressive Disclosure
- Start with essentials only.
- Reveal advanced fields when user enables Pro mode or demonstrates repeated use.

---

## 10) UI Direction (Clean, Premium, Practical)

### Visual Identity
- **Style**: modern editorial + precision instrument aesthetic.
- **Color palette**:
  - Warm neutrals (cream, stone, charcoal) as base.
  - Accent tones inspired by coffee cherries and brass hardware.
- **Typography**:
  - Elegant serif for section headers.
  - Highly legible sans-serif for operational UI and numbers.

### Component Behavior
- Card-based layout with generous spacing.
- High-contrast metric tiles (dose, yield, time, ratio).
- Subtle microinteractions and haptic confirmations for stage transitions.
- Animations should be calm and purposeful (never gimmicky).

### Information Design
- Prioritize "what to do now" during brew sessions.
- Put detail behind expandable panels.
- Use icon + text labels to reduce ambiguity.

### Tone of Voice
- Calm, supportive, and knowledgeable.
- Non-judgmental coaching language:
  - "Let's try a slightly finer grind next time" vs "Your extraction was poor."

---

## 11) Feature Prioritization (MVP → V2)

### MVP (Launch)
- Method support for all 6 brew styles.
- Guided brew sessions with timers.
- Recipe save/edit/fork.
- Brew logging + tasting notes.
- Basic recommendation engine.
- History timeline + simple analytics.

### V1.5
- Bean inventory and roast freshness reminders.
- Enhanced comparison views.
- Shareable recipes and brew cards.

### V2
- Smart integrations (Bluetooth scale, connected grinder support where available).
- Water chemistry guidance.
- Community recipe rankings and creator profiles.
- Optional AI assistant for conversational troubleshooting.

---

## 12) Success Metrics
1. **Brew consistency improvement**
   - Reduction in taste score variance over 30 days.
2. **Retention**
   - D7 / D30 active brew sessions.
3. **Guided brew completion rate**
   - % of started sessions completed with logged outcomes.
4. **Recommendation acceptance rate**
   - % of users applying suggested adjustments.
5. **Perceived brew quality lift**
   - Self-reported average score increase after onboarding.

---

## 13) Example "Delight" Details
- "Brew Streak" framed as craft practice, not gamified pressure.
- Smart defaults that adapt by method and roast level.
- One-tap "Repeat Last Great Brew" action on Home.
- Beautiful post-brew card users can save/share.

---

## 14) Positioning Statement
**Brewcraft helps anyone—from curious beginners to obsessive enthusiasts—brew better coffee with confidence through guided technique, intelligent recommendations, and elegant data tracking.**


---

## 15) How to Launch It

Right now, this repository contains a **product concept document**, not a runnable mobile app yet. To launch Brewcraft, use this practical sequence:

### Step 1 — Build a Clickable Prototype (1–2 weeks)
- Use Figma to design the 7 core screens:
  - Home, Brew Session, Recipe Library, Log Brew, History, Bean & Gear, Settings.
- Test with 5–10 users (mix of beginners + enthusiasts).
- Validate:
  - Can users complete a brew without confusion?
  - Do recommendations feel useful and trustworthy?

### Step 2 — Build an MVP App (4–8 weeks)
Recommended stack for speed:
- **Frontend**: React Native with Expo.
- **Local DB**: SQLite (or Realm).
- **State**: Zustand or Redux Toolkit.
- **Charts**: Victory Native or Recharts (web fallback).
- **Notifications**: Expo Notifications for reminders.

MVP scope:
- Guided brew flow + timers.
- Recipe CRUD.
- Brew logging + tasting notes.
- Basic recommendations from simple rules.
- Brew history list + 1–2 trend charts.

### Step 3 — Beta Launch (2–3 weeks)
- Release via TestFlight (iOS) and Internal Testing (Android).
- Recruit 50–200 coffee users from communities and local cafes.
- Track:
  - Brew session completion.
  - 7-day retention.
  - Recommendation acceptance rate.

### Step 4 — Public Launch
- Launch with a focused message: **"Brew better coffee, repeatably."**
- Publish starter recipes for all 6 methods.
- Offer a frictionless free tier; add premium analytics later.

### If you want to launch a technical starter immediately
You can scaffold the app in minutes:

```bash
npx create-expo-app brewcraft
cd brewcraft
npx expo start
```

Then implement in this order:
1. Brew Session timer screen.
2. Recipe model + save/edit.
3. Post-brew logging.
4. History timeline.
5. Recommendations card.

This order gets you to a usable first version quickly, then you can layer premium polish and personalization.
