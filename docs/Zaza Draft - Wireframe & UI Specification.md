# Zaza Draft - Wireframe & UI Specification

**Version:** 2.0  
**Last Updated:** October 6, 2025  
**Document Owner:** Design Team  
**Status:** Ready for Design & Development

---

## Table of Contents

1. [Design Philosophy & Principles](#1-design-philosophy--principles)
2. [Visual Design System](#2-visual-design-system)
3. [Navigation Architecture](#3-navigation-architecture)
4. [Screen-by-Screen Wireframes](#4-screen-by-screen-wireframes)
5. [Component Library](#5-component-library)
6. [Responsive Design Specifications](#6-responsive-design-specifications)
7. [Interaction Patterns](#7-interaction-patterns)
8. [Accessibility Requirements](#8-accessibility-requirements)

---

## 1. Design Philosophy & Principles

### 1.1 Core Design Values

**Warmth Over Sterility**
- Avoid cold, corporate tech aesthetics
- Use warm, encouraging colors and language
- Friendly but professional tone throughout

**Clarity Over Cleverness**
- Simple, obvious UI patterns
- No hidden features or confusing interactions
- Progressive disclosure: show what's needed when needed

**Empowerment Over Intimidation**
- Make teachers feel capable and supported
- Celebrate wins, minimize failures
- AI as helpful assistant, not replacement

**Speed Over Perfection**
- Fast, responsive interactions
- Minimal clicks to value
- Smart defaults reduce decision fatigue

### 1.2 Target User Context

**Environmental Considerations:**
- Teachers often multitask (students nearby, limited time)
- May be on phone during lunch, planning period, or at home
- Need quick access during parent phone calls or email responses
- Often switching between multiple apps and tools

**Emotional State:**
- Often stressed or time-pressured
- May feel anxious about difficult communications
- Looking for confidence and support
- Want to feel in control, not replaced

---

## 2. Visual Design System

### 2.1 Color Palette

**Primary Colors:**
```
Brand Primary:   #4F46E5 (Indigo 600) - Trust, professionalism
Primary Light:   #818CF8 (Indigo 400) - Hover states
Primary Dark:    #3730A3 (Indigo 700) - Active states
```

**Secondary Colors:**
```
Warm Accent:     #F59E0B (Amber 500) - Celebrations, badges
Success:         #10B981 (Emerald 500) - Confirmations
Warning:         #F59E0B (Amber 500) - Alerts
Error:           #EF4444 (Red 500) - Errors
```

**Neutral Colors:**
```
Background:      #F9FAFB (Gray 50)
Card:            #FFFFFF (White)
Border:          #E5E7EB (Gray 200)
Text Primary:    #111827 (Gray 900)
Text Secondary:  #6B7280 (Gray 500)
Text Disabled:   #9CA3AF (Gray 400)
```

**Tone Colors (for visual indicators):**
```
Warm Tone:       #FDE68A (Amber 200)
Professional:    #DBEAFE (Blue 200)
Direct:          #FEE2E2 (Red 200)
Empathetic:      #FECACA (Rose 200)
```

### 2.2 Typography

**Font Stack:**
```css
Primary: 'Inter', system-ui, -apple-system, sans-serif
Monospace: 'Fira Code', 'Courier New', monospace (for code/tags)
```

**Type Scale:**
```
Heading 1:  32px / 40px line height / 700 weight
Heading 2:  24px / 32px line height / 600 weight
Heading 3:  20px / 28px line height / 600 weight
Heading 4:  16px / 24px line height / 600 weight
Body Large: 16px / 24px line height / 400 weight
Body:       14px / 20px line height / 400 weight
Body Small: 12px / 16px line height / 400 weight
Label:      12px / 16px line height / 500 weight (uppercase)
```

### 2.3 Spacing System

**8px Grid System:**
```
xs:  4px   (0.5 units)
sm:  8px   (1 unit)
md:  16px  (2 units)
lg:  24px  (3 units)
xl:  32px  (4 units)
2xl: 48px  (6 units)
3xl: 64px  (8 units)
```

### 2.4 Border Radius

```
Small:  4px  (buttons, inputs)
Medium: 8px  (cards, modals)
Large:  12px (hero elements)
Round:  9999px (pills, badges)
```

### 2.5 Shadows

```
sm:  0 1px 2px 0 rgba(0, 0, 0, 0.05)
md:  0 4px 6px -1px rgba(0, 0, 0, 0.1)
lg:  0 10px 15px -3px rgba(0, 0, 0, 0.1)
xl:  0 20px 25px -5px rgba(0, 0, 0, 0.1)
```

---

## 3. Navigation Architecture

### 3.1 Primary Navigation Structure

```
┌─────────────────────────────────────────────────┐
│  [Logo] Zaza Draft                              │
│                                                 │
│  Home          (Dashboard)                      │
│  Library       (Snippet Collection)             │
│  Class Brain   (Student/Class Context)          │
│  Analytics     (Pro Feature - Usage Stats)      │
│  Settings      (Profile, Preferences)           │
│                                                 │
│  [Upgrade to Pro CTA]                           │
│  [Help/Support]                                 │
│  [User Avatar Menu]                             │
└─────────────────────────────────────────────────┘
```

### 3.2 Information Hierarchy

**Level 1: Top-Level Sections**
- Home (Dashboard) - Primary workspace
- Library - Saved snippets
- Class Brain - Context management
- Analytics - Usage insights (Pro)
- Settings - Configuration

**Level 2: Feature Access**
- Within Home: Generate snippet, recent snippets, quick stats
- Within Library: Filters, search, export, tags
- Within Class Brain: Add/edit classes, students
- Within Settings: Profile, preferences, subscription

**Level 3: Action Modals/Panels**
- Edit snippet
- Export options
- Upgrade prompt
- Confirmation dialogs

---

## 4. Screen-by-Screen Wireframes

### 4.1 Landing Page (Pre-Authentication)

**Purpose:** Convert visitors to signups with clear value proposition and social proof

```
┌───────────────────────────────────────────────────────────────┐
│  [Logo] Zaza Draft        [Features] [Pricing] [Login] [CTA]  │
└───────────────────────────────────────────────────────────────┘

         ┌─────────────────────────────────────────────┐
         │                                             │
         │   Save 5+ Hours Every Week on              │
         │   Teacher Communications                    │
         │                                             │
         │   AI-powered snippets for parent emails,    │
         │   report cards, and more. Join 10,000+     │
         │   teachers who've already saved time.       │
         │                                             │
         │   [Get Started Free - No Credit Card]       │
         │   [Watch 30-Second Demo]                    │
         │                                             │
         │   ✓ 5 free snippets/month                  │
         │   ✓ Works in 8+ languages                  │
         │   ✓ FERPA compliant                        │
         │                                             │
         └─────────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  [Screenshot 1]  │  │  [Screenshot 2]  │  │  [Screenshot 3]  │
│  Generate in     │  │  Choose tone     │  │  Save & organize │
│  seconds         │  │  & language      │  │  your library    │
└──────────────────┘  └──────────────────┘  └──────────────────┘

         "This saved me 2 hours on report cards!"
         - Sarah M., 3rd Grade Teacher
         ⭐⭐⭐⭐⭐

┌─────────────────────────────────────────────────────────────┐
│  Trusted by Teachers at:                                     │
│  [School Logo 1] [School Logo 2] [School Logo 3]            │
└─────────────────────────────────────────────────────────────┘

         [How It Works]  [Pricing]  [FAQ]  [Sign Up Free]
```

**Key Elements:**
- **Hero Section:** Clear value prop, time-saved metric, CTA
- **Trust Signals:** User count, teacher testimonial, school logos
- **Visual Demos:** 3-panel showcase of core workflow
- **Social Proof:** Star rating, testimonial with photo/name
- **Sticky Header:** CTA always accessible

**Mobile Responsive Notes:**
- Stack hero content vertically
- Single-column layout for features
- Sticky bottom CTA bar

---

### 4.2 Signup/Login Screen

**Purpose:** Quick, low-friction authentication with email/password primary

```
┌───────────────────────────────────────────────────────────┐
│  [← Back to Home]                        [Logo] Zaza Draft │
└───────────────────────────────────────────────────────────┘

            ┌─────────────────────────────────┐
            │                                 │
            │   Welcome to Zaza Draft! 👋     │
            │                                 │
            │   Create your account           │
            │                                 │
            │   [──────────────────────]      │
            │   Email address                 │
            │                                 │
            │   [──────────────────────]      │
            │   Password                      │
            │   • 8+ characters               │
            │   • Mixed case, number, symbol  │
            │                                 │
            │   [──────────────────────]      │
            │   Confirm password              │
            │                                 │
            │   [ ] I agree to Terms &        │
            │       Privacy Policy            │
            │                                 │
            │   [Create Account →]            │
            │                                 │
            │   ───────── or ─────────        │
            │                                 │
            │   [🔵 Continue with Google]     │
            │                                 │
            │   Already have an account?      │
            │   [Log in]                      │
            │                                 │
            └─────────────────────────────────┘
```

**Interaction States:**

**Validation:**
- Real-time password strength indicator
- Inline error messages (red text below field)
- Green checkmarks for valid fields
- Disabled submit button until all valid

**Success State:**
- Email verification sent message
- Auto-redirect to onboarding after 2 seconds

**Error States:**
- "Email already registered" → Link to login
- "Password too weak" → Specific requirements
- "Passwords don't match" → Highlight confirm field

---

### 4.3 Onboarding Flow (Psychological Anchoring)

#### Screen 1: Emotional Hook

**Purpose:** Create immediate empathy and buy-in

```
┌───────────────────────────────────────────────────────────┐
│  [Logo] Zaza Draft                          [Step 1 of 4] │
└───────────────────────────────────────────────────────────┘

         ┌─────────────────────────────────────────┐
         │                                         │
         │   What's your biggest communication     │
         │   challenge? 🤔                         │
         │                                         │
         │   (Select one so we can help)           │
         │                                         │
         │   [ ] 📝 Writing report cards takes     │
         │        forever                          │
         │                                         │
         │   [ ] 😰 Difficult parent conversations │
         │        stress me out                    │
         │                                         │
         │   [ ] ⏰ No time during the school day  │
         │                                         │
         │   [ ] 💭 Finding the right words        │
         │        is hard                          │
         │                                         │
         │   [ ] 🌍 Language barriers with         │
         │        families                         │
         │                                         │
         │   [Continue →]                          │
         │                                         │
         └─────────────────────────────────────────┘

                    Progress: ●○○○
```

**Interaction:**
- Cards are tappable/clickable with hover effect
- Selected card shows blue border + checkmark
- Button activates only after selection
- Each option triggers contextual demo in next screen

---

#### Screen 2: Instant Relief Demo

**Purpose:** Show immediate value by solving their specific problem

```
┌───────────────────────────────────────────────────────────┐
│  [Logo] Zaza Draft                          [Step 2 of 4] │
└───────────────────────────────────────────────────────────┘

         ┌─────────────────────────────────────────┐
         │                                         │
         │   Let's solve that for you right now!   │
         │                                         │
         │   Watch me write a report card comment  │
         │   in 15 seconds... ✨                   │
         │                                         │
         │   ┌─────────────────────────────────┐   │
         │   │ [AI Animation - Typing Effect]  │   │
         │   │                                 │   │
         │   │ "Sarah has shown remarkable     │   │
         │   │ growth in reading comprehension │   │
         │   │ this quarter. Her enthusiasm    │   │
         │   │ for chapter books is inspiring, │   │
         │   │ and she's making excellent      │   │
         │   │ progress with inferential       │   │
         │   │ thinking skills. I'd love to    │   │
         │   │ see her continue building       │   │
         │   │ vocabulary through independent  │   │
         │   │ reading at home."               │   │
         │   │                                 │   │
         │   │ ✓ Generated in 8 seconds        │   │
         │   └─────────────────────────────────┘   │
         │                                         │
         │   See? We get it. And we're here to     │
         │   help you save hours each week. 🙌     │
         │                                         │
         │   [That's Amazing! Continue →]          │
         │                                         │
         └─────────────────────────────────────────┘

                    Progress: ●●○○
```

**Animation Details:**
- 0-2s: Prompt appears ("Write a report card comment for a 3rd grader improving in reading")
- 2-10s: Text types out naturally (80-100 chars/sec)
- 10-12s: Checkmark animation + time saved metric
- 12s+: Button becomes active with subtle pulse

**Personalization:**
- Demo content matches their selected challenge
- If "report cards" → show report card snippet
- If "difficult conversations" → show empathetic parent email
- If "language barriers" → show Spanish translation example

---

#### Screen 3: Profile Setup

**Purpose:** Collect minimal info to personalize experience

```
┌───────────────────────────────────────────────────────────┐
│  [Logo] Zaza Draft                          [Step 3 of 4] │
└───────────────────────────────────────────────────────────┘

         ┌─────────────────────────────────────────┐
         │                                         │
         │   Help us personalize Zaza Draft       │
         │   for you 🎯                            │
         │                                         │
         │   Your Name                             │
         │   [──────────────────────────────]      │
         │                                         │
         │   Grade Levels You Teach                │
         │   [Multi-select dropdown]               │
         │   ☐ K-2  ☐ 3-5  ☐ 6-8  ☐ 9-12          │
         │                                         │
         │   Subjects (Optional)                   │
         │   [──────────────────────────────]      │
         │   e.g., Math, Science, English          │
         │                                         │
         │   School Name (Optional)                │
         │   [──────────────────────────────]      │
         │                                         │
         │   Preferred Language                    │
         │   [Dropdown: English ▼]                 │
         │                                         │
         │   [Continue →]  [← Back]                │
         │                                         │
         └─────────────────────────────────────────┘

                    Progress: ●●●○
```

**Design Notes:**
- Only name and grade levels required
- Multi-select with visual checkboxes (not hidden dropdown)
- Save as they go (no data loss if they exit)
- Show "Why we ask" tooltip on hover for optional fields

---

#### Screen 4: First Real Snippet

**Purpose:** Guide them through generating their own snippet

```
┌───────────────────────────────────────────────────────────┐
│  [Logo] Zaza Draft                          [Step 4 of 4] │
└───────────────────────────────────────────────────────────┘

         ┌─────────────────────────────────────────┐
         │                                         │
         │   Now it's your turn! ✨                │
         │                                         │
         │   Try generating your first snippet.    │
         │   Here are some ideas:                  │
         │                                         │
         │   [Quick Templates ▼]                   │
         │   • Parent progress update              │
         │   • Report card comment                 │
         │   • Thank you note                      │
         │                                         │
         │   Or describe what you need:            │
         │   ┌─────────────────────────────────┐   │
         │   │                                 │   │
         │   │ [Type here...]                  │   │
         │   │                                 │   │
         │   │                                 │   │
         │   └─────────────────────────────────┘   │
         │                                         │
         │   Tone: [Professional & Neutral ▼]      │
         │   Language: [English ▼]                 │
         │                                         │
         │   [✨ Generate My Snippet]              │
         │                                         │
         │   💡 Tip: Be specific! Instead of       │
         │   "write about a student," try "write   │
         │   about a 4th grader who improved in    │
         │   math this quarter"                    │
         │                                         │
         └─────────────────────────────────────────┘

                    Progress: ●●●●
```

**After Generation:**
- Show snippet with celebration confetti 🎉
- "You did it! That took 12 seconds instead of 15 minutes"
- [Save to Library] [Generate Another] [Go to Dashboard →]

---

### 4.4 Main Dashboard (Home)

**Purpose:** Primary workspace for snippet generation with quick access to stats

```
┌─────────────────────────────────────────────────────────────────┐
│ ☰ [Logo] Zaza Draft          🏠 Home  📚 Library  🧠 Class Brain │
│                              ⚙️ Settings  [👤 Avatar ▼]          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Welcome back, Sarah! 👋                                          │
│                                                                  │
│ ┌────────────┐  ┌────────────┐  ┌────────────┐                 │
│ │ 3/5        │  │ 🔥 7 Days  │  │ ⏱️ ~45 min  │                 │
│ │ Snippets   │  │ Streak     │  │ Saved      │                 │
│ │ This Month │  │            │  │ This Week  │                 │
│ └────────────┘  └────────────┘  └────────────┘                 │
│                                                                  │
│ [⚡ Upgrade to Pro - Unlimited Snippets]                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     ✨ Generate a Snippet                        │
│                                                                  │
│ Quick Templates:                                                 │
│ [📧 Parent Update] [📝 Report Card] [📋 Progress Note]          │
│ [🎓 Recommendation] [👏 Positive Note] [More... ▼]              │
│                                                                  │
│ Or describe what you need:                                       │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │                                                           │   │
│ │  Write a parent email about...                           │   │
│ │                                                           │   │
│ │                                                           │   │
│ │                                            0 / 2000       │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│ │ Tone         │  │ Language     │  │ Class        │          │
│ │ Professional ▼│  │ English    ▼ │  │ Optional   ▼ │          │
│ └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│              [✨ Generate Snippet]                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Recent Snippets                                    [View All →]  │
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 📧 Parent progress update - Math • Professional           │   │
│ │ "I wanted to share some exciting news about Emma's..."    │   │
│ │ 2 hours ago  [Edit] [Copy] [Share]                        │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 📝 Report card comment - Reading • Warm                   │   │
│ │ "Marcus has shown wonderful growth this quarter..."       │   │
│ │ Yesterday  [Edit] [Copy] [Share]                          │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ 👏 Positive behavior note • Empathetic                    │   │
│ │ "I wanted to let you know about a wonderful moment..."    │   │
│ │ 2 days ago  [Edit] [Copy] [Share]                         │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Key Features:**
- **Hero Stats Cards:** Usage count, streak, time saved (gamification)
- **Upgrade Banner:** Prominent but not intrusive for free users at limit
- **Prompt Area:** Always visible, primary action
- **Quick Templates:** One-click common scenarios
- **Recent Snippets:** Quick access to recent work
- **Tone/Language/Class:** Defaults persist from last use

**Interaction Notes:**
- Template buttons populate prompt field
- Character counter updates in real-time
- Generate button pulses when ready
- Disabled state when at free tier limit

---

### 4.5 Snippet Generation & Preview

**Purpose:** Show AI working and present results with clear actions

```
┌─────────────────────────────────────────────────────────────────┐
│ ☰ [Logo] Zaza Draft          🏠 Home  📚 Library  🧠 Class Brain │
└─────────────────────────────────────────────────────────────────┘

         ┌─────────────────────────────────────────┐
         │  ✨ Generating your snippet...          │
         │                                         │
         │  [███████████░░░░░░] 75%                │
         │                                         │
         │  🧠 Analyzing your request...           │
         │  ✓ Understanding context                │
         │  ✓ Selecting appropriate tone           │
         │  → Crafting your message...             │
         │                                         │
         └─────────────────────────────────────────┘
```

**Loading States:**
- 0-2s: "Analyzing your request..."
- 2-4s: "Understanding context..."  
- 4-6s: "Selecting appropriate tone..."
- 6-8s: "Crafting your message..."
- 8s+: Result appears with animation

**After Generation - Preview:**

```
┌─────────────────────────────────────────────────────────────────┐
│ [← Back to Prompt]                             2 snippets left   │
└─────────────────────────────────────────────────────────────────┘

         ┌─────────────────────────────────────────┐
         │  ✨ Here's your snippet!                │
         │                                         │
         │  ┌─────────────────────────────────┐   │
         │  │                                 │   │
         │  │ I wanted to share some exciting │   │
         │  │ news about Emma's progress in   │   │
         │  │ math this quarter. She's shown  │   │
         │  │ remarkable improvement in her   │   │
         │  │ understanding of fractions and  │   │
         │  │ has been eagerly participating  │   │
         │  │ in group problem-solving        │   │
         │  │ activities. Her confidence has  │   │
         │  │ grown significantly, and I'm    │   │
         │  │ excited to see her continued    │   │
         │  │ progress. Please let me know if │   │
         │  │ you have any questions about    │   │
         │  │ her work.                       │   │
         │  │                                 │   │
         │  │ 📊 127 words                    │   │
         │  │ 🎯 Professional & Neutral tone  │   │
         │  │ 🇬🇧 English                     │   │
         │  │ ⏱️ Generated in 7 seconds       │   │
         │  └─────────────────────────────────┘   │
         │                                         │
         │  [📋 Copy] [✏️ Edit] [💾 Save]         │
         │  [🔄 Regenerate] [❌ Delete]            │
         │                                         │
         │  ───────────────────────────────────    │
         │                                         │
         │  Was this helpful?                      │
         │  ⭐ ⭐ ⭐ ⭐ ⭐                          │
         │                                         │
         │  [Share this win! →]                    │
         │                                         │
         └─────────────────────────────────────────┘
```

**Action Buttons:**
- **Copy:** Copies to clipboard with toast confirmation
- **Edit:** Opens inline editor (see below)
- **Save:** Opens save modal with tags/class assignment
- **Regenerate:** Creates new version (uses 1 credit)
- **Delete:** Removes preview, returns to prompt

**Share Modal (Viral Feature):**

```
         ┌─────────────────────────────────────────┐
         │  🎉 Share Your Productivity Win!        │
         │                                         │
         │  [Preview of social card]               │
         │  ┌─────────────────────────────────┐   │
         │  │  "Just saved 15 minutes on      │   │
         │  │   teacher communications! 🙌"    │   │
         │  │                                 │   │
         │  │  Made with Zaza Draft           │   │
         │  │  [Snippet preview...]           │   │
         │  └─────────────────────────────────┘   │
         │                                         │
         │  [📱 Twitter] [📘 Facebook] [💬 WhatsApp]│
         │                                         │
         │  Or copy your referral link:            │
         │  [https://draft.zaza.app/ref/sarah123]  │
         │  [Copy Link]                            │
         │                                         │
         │  Friends get +2 free snippets,          │
         │  you get +3! 🎁                         │
         │                                         │
         │  [Maybe Later] [Share Now]              │
         │                                         │
         └─────────────────────────────────────────┘
```

---

### 4.6 Edit Mode (Inline Editor)

**Purpose:** Allow quick edits while preserving original

```
┌─────────────────────────────────────────────────────────────────┐
│ Editing Snippet                     [✓ Save Changes] [✕ Cancel] │
└─────────────────────────────────────────────────────────────────┘

         ┌─────────────────────────────────────────┐
         │  ┌─────────────────────────────────┐   │
         │  │ [Editable text area]            │   │
         │  │                                 │   │
         │  │ I wanted to share some exciting │   │
         │  │ news about Emma's progress...   │   │
         │  │ [cursor]                        │   │
         │  │                                 │   │
         │  │                                 │   │
         │  │                                 │   │
         │  └─────────────────────────────────┘   │
         │                                         │
         │  📊 132 words (+5 from original)        │
         │                                         │
         │  💡 Tip: Your original is saved!        │
         │     You can always revert changes.      │
         │                                         │
         └─────────────────────────────────────────┘

         [View Original] [Revert to Original]
```

**Features:**
- Live word count with diff from original
- Auto-save draft every 5 seconds
- Keyboard shortcuts: Cmd/Ctrl+S to save, Esc to cancel
- Can toggle between edited and original version

---

### 4.7 Save Modal

**Purpose:** Add metadata (tags, class assignment) before saving

```
         ┌─────────────────────────────────────────┐
         │  💾 Save to Library                     │
         │                                         │
         │  Add tags (optional):                   │
         │  ┌─────────────────────────────────┐   │
         │  │ [parent-email] [math] [+]       │   │
         │  └─────────────────────────────────┘   │
         │                                         │
         │  Suggested: [report-card] [progress]    │
         │                                         │
         │  Assign to class (optional):            │
         │  [3rd Grade Math ▼]                     │
         │                                         │
         │  Assign to student (optional):          │
         │  [Emma M. ▼]                            │
         │                                         │
         │  [Cancel] [Save Snippet]                │
         │                                         │
         └─────────────────────────────────────────┘
```

**Interaction:**
- Tag input: Type to add new or select existing
- Autocomplete suggestions appear as you type
- Existing tags show with x to remove
- Class/student dropdowns only show if Class Brain populated
- Save button always enabled (tags optional)

---

### 4.8 Snippet Library

**Purpose:** Browse, search, filter, and manage saved snippets

```
┌─────────────────────────────────────────────────────────────────┐
│ ☰ [Logo] Zaza Draft          🏠 Home  📚 Library  🧠 Class Brain │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 📚 My Snippet Library (47 total)                                 │
│                                                                  │
│ ┌──────────────────────────────────────────────────┐            │
│ │ 🔍 Search snippets...                            │ [Filter ▼] │
│ └──────────────────────────────────────────────────┘            │
│                                                                  │
│ Filters: [All] [parent-email: 12] [report-card: 8] [math: 15]  │
│          [+ More tags...]                                        │
│                                                                  │
│ Sort by: [Most Recent ▼]  View: [Grid] [List]                   │
│                                                                  │
│ [ ] Select All | [Export Selected] [Delete Selected]            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 📧 Parent... │ │ 📝 Report... │ │ 👏 Positive..│
│              │ │              │ │              │
│ "I wanted to │ │ "Marcus has  │ │ "I wanted to │
│  share some  │ │  shown..."   │ │  let you..." │
│  exciting... │ │              │ │              │
│              │ │              │ │              │
│ 🏷️ math      │ │ 🏷️ reading   │ │ 🏷️ behavior  │
│ 🎯 Prof.     │ │ 🎯 Warm      │ │ 🎯 Empathetic│
│ 📅 2h ago    │ │ 📅 Yesterday │ │ 📅 2 days    │
│              │ │              │ │              │
│ [Copy] [Edit]│ │ [Copy] [Edit]│ │ [Copy] [Edit]│
│ [Share] [...]│ │ [Share] [...]│ │ [Share] [...]│
└──────────────┘ └──────────────┘ └──────────────┘

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ ...          │ │ ...          │ │ ...          │
└──────────────┘ └──────────────┘ └──────────────┘

         [Load More] or infinite scroll
```

**List View Alternative:**

```
┌─────────────────────────────────────────────────────────────────┐
│ [ ] 📧 Parent progress update - Math                    2h ago  │
│     "I wanted to share some exciting news about Emma's..."      │
│     🏷️ math, parent-email • 🎯 Professional • 🇬🇧 English         │
│     [Copy] [Edit] [Share] [Delete]                              │
├─────────────────────────────────────────────────────────────────┤
│ [ ] 📝 Report card comment - Reading                Yesterday   │
│     "Marcus has shown wonderful growth this quarter..."         │
│     🏷️ reading, report-card • 🎯 Warm • 🇬🇧 English              │
│     [Copy] [Edit] [Share] [Delete]                              │
├─────────────────────────────────────────────────────────────────┤
│ ...                                                             │
└─────────────────────────────────────────────────────────────────┘
```

**Filter Panel (Expanded):**

```
         ┌─────────────────────────────────────────┐
         │  🎯 Filter Snippets                     │
         │                                         │
         │  Tone:                                  │
         │  ☐ Warm & Encouraging (15)              │
         │  ☐ Professional & Neutral (22)          │
         │  ☐ Direct & Clear (7)                   │
         │  ☐ Empathetic & Supportive (3)          │
         │                                         │
         │  Language:                              │
         │  ☐ English (44)                         │
         │  ☐ Spanish (3)                          │
         │                                         │
         │  Date Range:                            │
         │  ○ All time                             │
         │  ○ Last 7 days                          │
         │  ○ Last 30 days                         │
         │  ○ Custom: [──] to [──]                 │
         │                                         │
         │  Class:                                 │
         │  ☐ 3rd Grade Math (20)                  │
         │  ☐ 3rd Grade ELA (15)                   │
         │                                         │
         │  [Clear All] [Apply Filters]            │
         │                                         │
         └─────────────────────────────────────────┘
```

---

### 4.9 Class Brain Management

**Purpose:** Add and manage student/class context

```
┌─────────────────────────────────────────────────────────────────┐
│ ☰ [Logo] Zaza Draft          🏠 Home  📚 Library  🧠 Class Brain │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 🧠 Class Brain                                                   │
│                                                                  │
│ Add student and class context to make your snippets even more   │
│ personalized. All data is private and secure.                   │
│                                                                  │
│ [+ Add New Class]                                 Free: 1 class  │
│                                         Pro: Unlimited classes   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 📚 3rd Grade Math (24 students)                        [Edit] [×]│
│                                                                  │
│ Grade Level: 3rd  |  Subject: Math                              │
│                                                                  │
│ Students:                                        [+ Add Student] │
│                                                                  │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│ │ Emma M.      │ │ Marcus T.    │ │ Sarah L.     │            │
│ │ 📝 Notes     │ │ 📝 Notes     │ │ 📝 Notes     │            │
│ │ [Edit]       │ │ [Edit]       │ │ [Edit]       │            │
│ └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                  │
│ [Show All 24 Students]                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 📚 3rd Grade ELA (24 students)                         [Edit] [×]│
│ ...                                                              │
└─────────────────────────────────────────────────────────────────┘

         [⚡ Upgrade to Pro - Add Unlimited Classes]
```

**Add Class Modal:**

```
         ┌─────────────────────────────────────────┐
         │  + Add New Class                        │
         │                                         │
         │  Class Name *                           │
         │  [──────────────────────────────]       │
         │  e.g., "3rd Grade Math"                 │
         │                                         │
         │  Grade Level                            │
         │  [K-2 ▼]                                │
         │                                         │
         │  Subject                                │
         │  [──────────────────────────────]       │
         │                                         │
         │  [Cancel] [Create Class]                │
         │                                         │
         └─────────────────────────────────────────┘
```

**Add/Edit Student Modal:**

```
         ┌─────────────────────────────────────────┐
         │  Add Student to 3rd Grade Math          │
         │                                         │
         │  First Name *                           │
         │  [──────────────────────────────]       │
         │                                         │
         │  Last Initial *                         │
         │  [──]                                   │
         │                                         │
         │  Notes (optional)                       │
         │  ┌─────────────────────────────────┐   │
         │  │ Add context like strengths,     │   │
         │  │ interests, or growth areas...   │   │
         │  │                                 │   │
         │  └─────────────────────────────────┘   │
         │                                         │
         │  🔒 Privacy: Only first name + initial  │
         │     No grades, scores, or sensitive data│
         │                                         │
         │  [Cancel] [Add Student]                 │
         │                                         │
         └─────────────────────────────────────────┘
```

---

### 4.10 Upgrade Modal (Freemium Gate)

**Purpose:** Convert free users when they hit limit

```
         ┌─────────────────────────────────────────┐
         │  ⚡ You've Used All 5 Free Snippets     │
         │                                         │
         │  Want to keep the momentum going?       │
         │                                         │
         │  ✨ Upgrade to Pro                      │
         │                                         │
         │  ✓ Unlimited snippet generations        │
         │  ✓ Premium export formats (PDF)         │
         │  ✓ Advanced analytics                   │
         │  ✓ Unlimited classes in Class Brain     │
         │  ✓ Priority support                     │
         │  ✓ Early access to new features         │
         │                                         │
         │  ┌─────────────────────────────────┐   │
         │  │ 💰 $7.50/month                  │   │
         │  │    or $59/year (save 34%)       │   │
         │  │                                 │   │
         │  │    [Upgrade to Pro →]           │   │
         │  └─────────────────────────────────┘   │
         │                                         │
         │  Or wait until next month               │
         │  (Resets on Nov 1)                      │
         │                                         │
         │  [Maybe Later] [See All Features]       │
         │                                         │
         └─────────────────────────────────────────┘
```

**Alternative: Soft Prompt (at 80% usage):**

```
┌─────────────────────────────────────────────────────────────────┐
│ 💡 You've used 4 of 5 free snippets this month                  │
│    [Upgrade to Pro] for unlimited access    [Dismiss]           │
└─────────────────────────────────────────────────────────────────┘
```

---

### 4.11 Settings Screen

**Purpose:** User profile, preferences, subscription management

```
┌─────────────────────────────────────────────────────────────────┐
│ ☰ [Logo] Zaza Draft          🏠 Home  📚 Library  🧠 Class Brain │
└─────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ ⚙️ Settings                                                 │
│                                                            │
│ [Profile] [Preferences] [Subscription] [Account]          │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Profile                                                    │
│                                                            │
│ [Avatar Upload Area]                                       │
│ 👤 Sarah Martinez                                          │
│                                                            │
│ Name                                                       │
│ [──────────────────────────────]                           │
│                                                            │
│ Email                                                      │
│ [sarah.martinez@school.edu]                               │
│ ✓ Verified                                                 │
│                                                            │
│ School/District (optional)                                 │
│ [──────────────────────────────]                           │
│                                                            │
│ Grade Levels                                               │
│ ☑ K-2  ☑ 3-5  ☐ 6-8  ☐ 9-12                              │
│                                                            │
│ Subjects                                                   │
│ [Math, Science, ELA]                                       │
│                                                            │
│ [Save Changes]                                             │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Preferences                                                │
│                                                            │
│ Default Language                                           │
│ [English ▼]                                                │
│                                                            │
│ Default Tone                                               │
│ [Professional & Neutral ▼]                                 │
│                                                            │
│ Timezone                                                   │
│ [America/New_York (EST) ▼]                                 │
│                                                            │
│ Email Notifications                                        │
│ ☑ Weekly usage summary                                     │
│ ☑ Feature updates                                          │
│ ☐ Tips and tricks                                          │
│ ☐ Marketing emails                                         │
│                                                            │
│ [Save Preferences]                                         │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Subscription                                               │
│                                                            │
│ Current Plan: Free                                         │
│ Usage: 4 of 5 snippets this month                          │
│ Resets: November 1, 2025                                   │
│                                                            │
│ [⚡ Upgrade to Pro - $7.50/month]                          │
│                                                            │
│ Pro Features:                                              │
│ • Unlimited snippets                                       │
│ • Premium exports (PDF)                                    │
│ • Advanced analytics                                       │
│ • Unlimited classes                                        │
│ • Priority support                                         │
│                                                            │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Account                                                    │
│                                                            │
│ Change Password                                            │
│ [Update Password]                                          │
│                                                            │
│ Export Your Data                                           │
│ Download all your snippets and data                        │
│ [Request Export]                                           │
│                                                            │
│ Delete Account                                             │
│ Permanently delete your account and all data               │
│ [Delete Account]                                           │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

### 4.12 Mobile Responsive Views

**Purpose:** Key screens optimized for mobile (320px - 768px)

#### Mobile Dashboard (Home):

```
┌─────────────────────────────┐
│ ☰ [Logo]         [👤]       │
└─────────────────────────────┘
│ Welcome, Sarah! 👋          │
│                             │
│ ┌──────┐ ┌──────┐ ┌──────┐ │
│ │ 3/5  │ │ 🔥7  │ │ 45min│ │
│ │ Left │ │ Days │ │ Saved│ │
│ └──────┘ └──────┘ └──────┘ │
│                             │
│ [⚡ Upgrade - Get Unlimited]│
│                             │
│ ✨ Generate Snippet          │
│                             │
│ [📧] [📝] [📋]              │
│ [👏] [More▼]                │
│                             │
│ ┌─────────────────────────┐ │
│ │                         │ │
│ │ Describe what you need..│ │
│ │                         │ │
│ │                         │ │
│ └─────────────────────────┘ │
│                             │
│ [Tone ▼] [Lang ▼] [Class ▼]│
│                             │
│ [✨ Generate]               │
│                             │
│ Recent Snippets     [All →] │
│                             │
│ ┌─────────────────────────┐ │
│ │ 📧 Parent update         │ │
│ │ "I wanted to share..."   │ │
│ │ 2h • [Copy] [Edit]       │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │ 📝 Report card           │ │
│ │ "Marcus has shown..."    │ │
│ │ 1d • [Copy] [Edit]       │ │
│ └─────────────────────────┘ │
│                             │
└─────────────────────────────┘

[🏠] [📚] [🧠] [⚙️]  ← Bottom Nav
```

**Mobile Navigation Pattern:**
- Hamburger menu (top left) for secondary nav
- Bottom tab bar for primary sections
- Sticky prompt CTA always accessible
- Swipe gestures for library items

---

## 5. Component Library

### 5.1 Buttons

**Primary Button:**
```
Default:  [──────────] (Indigo 600 bg, white text)
Hover:    [──────────] (Indigo 700 bg)
Active:   [──────────] (Indigo 800 bg)
Disabled: [──────────] (Gray 300 bg, gray text)

Large:    height: 48px, padding: 16px 32px, font: 16px
Medium:   height: 40px, padding: 12px 24px, font: 14px
Small:    height: 32px, padding: 8px 16px, font: 14px
```

**Secondary Button:**
```
Default:  [──────────] (White bg, indigo border, indigo text)
Hover:    [──────────] (Gray 50 bg)
```

**Ghost Button:**
```
Default:  [──────────] (Transparent, indigo text)
Hover:    [──────────] (Indigo 50 bg)
```

**Icon Button:**
```
[🗑️] [✏️] [📋] [↗️]
32x32px, rounded, hover state with bg
```

### 5.2 Input Fields

**Text Input:**
```
┌─────────────────────────────────────┐
│ Placeholder text...                 │
└─────────────────────────────────────┘

Default:  Gray 300 border, gray 400 placeholder
Focus:    Indigo 500 border (2px), shadow
Error:    Red 500 border, red text below
Success:  Green 500 border, checkmark icon
Disabled: Gray 100 bg, gray 400 text

Height: 40px
Border radius: 6px
Padding: 10px 12px
```

**Text Area:**
```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│                                     │
│                                     │
│                           0 / 2000  │
└─────────────────────────────────────┘

Min height: 120px
Character counter: bottom right
Auto-resize: optional
```

**Dropdown:**
```
[Selection ▼]

Default state, hover, open states
Search functionality for long lists
Multi-select with checkboxes
```

### 5.3 Cards

**Snippet Card (Grid):**
```
┌────────────────────────────────────┐
│ 📧 Title / Category                │
│                                    │
│ "First 150 characters of the       │
│  snippet text preview goes here    │
│  and truncates with ellipsis..."   │
│                                    │
│ 🏷️ tag1  🏷️ tag2                  │
│ 🎯 Tone • 🇬🇧 Language • 📅 Date   │
│                                    │
│ [Copy] [Edit] [Share] [⋮]         │
└────────────────────────────────────┘

Background: White
Border: 1px gray 200
Border radius: 8px
Padding: 16px
Shadow: sm (on hover: md)
Max width: 320px
```

**Stats Card:**
```
┌──────────────────┐
│  42              │
│  Snippets        │
│  This Month      │
└──────────────────┘

Center-aligned
Large number (24px)
Label below (12px)
Icon optional
Background: White or subtle gradient
```

### 5.4 Modals

**Standard Modal:**
```
[Overlay: rgba(0,0,0,0.5)]

         ┌───────────────────────────┐
         │ [✕ Close]                 │
         │                           │
         │ Modal Title               │
         │                           │
         │ Content area with text,   │
         │ inputs, or other elements │
         │                           │
         │                           │
         │ [Cancel] [Primary Action] │
         └───────────────────────────┘

Max width: 500px
Border radius: 12px
Padding: 24px
Shadow: xl
```

### 5.5 Toast Notifications

**Success Toast:**
```
┌────────────────────────────────┐
│ ✓ Snippet copied to clipboard! │
└────────────────────────────────┘

Position: Top center or bottom center
Duration: 3 seconds
Animation: Slide in from top/bottom
Background: Green 500
Text: White
```

**Error Toast:**
```
┌────────────────────────────────┐
│ ⚠️ Something went wrong        │
└────────────────────────────────┘

Background: Red 500
```

### 5.6 Loading States

**Spinner:**
```
    ⟳ (Animated rotation)
```

**Skeleton Loader:**
```
┌────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░        │ <- Shimmer effect
│ ▓▓▓▓▓░░░░░░░░░░░░░░░░░        │
│ ▓▓▓▓▓▓▓░░░░░░░░░░░░░          │
└────────────────────────────────┘

Use for card/list loading
Animated shimmer from left to right
```

**Progress Bar:**
```
[████████░░░░░░░░] 60%

Height: 8px
Border radius: 4px
Animation: Smooth transition
```

### 5.7 Badges & Tags

**Tag:**
```
[tag-name ✕]

Background: Gray 100 (or tone color for tone tags)
Text: Gray 700
Border radius: 9999px (pill)
Padding: 4px 12px
Font: 12px
Hover: Gray 200 bg
Click ✕ to remove
```

**Badge:**
```
[🏆 10 Snippets]

Background: Amber 100
Text: Amber 800
Border: Amber 200
```

**Status Indicator:**
```
● Active (Green 500)
● Warning (Amber 500)
● Error (Red 500)
● Neutral (Gray 400)
```

---

## 6. Responsive Design Specifications

### 6.1 Breakpoints

```
Mobile:     320px - 767px
Tablet:     768px - 1023px
Desktop:    1024px - 1439px
Wide:       1440px+
```

### 6.2 Layout Grid

**Desktop (1024px+):**
- 12-column grid
- Gutter: 24px
- Max content width: 1280px
- Centered with auto margins

**Tablet (768px - 1023px):**
- 8-column grid
- Gutter: 16px
- Full width with 32px side margins

**Mobile (320px - 767px):**
- 4-column grid
- Gutter: 12px
- Full width with 16px side margins

### 6.3 Responsive Patterns

**Navigation:**
- Desktop: Top horizontal nav with all items visible
- Tablet: Top nav with some items in dropdown
- Mobile: Hamburger menu + bottom tab bar

**Cards:**
- Desktop: 3-column grid
- Tablet: 2-column grid
- Mobile: Single column stack

**Forms:**
- Desktop: Multi-column layouts (2-3 columns)
- Tablet: 2-column for short fields, stack longer fields
- Mobile: Single column all fields

**Modals:**
- Desktop: Fixed width centered (500px)
- Tablet: 90% width max 600px
- Mobile: Full screen or bottom sheet

### 6.4 Touch Targets

**Minimum Size:**
- Buttons: 44px x 44px (iOS) / 48px x 48px (Android)
- Links in text: 44px height with padding
- Icon buttons: 48px x 48px

**Spacing:**
- Minimum 8px between touch targets
- Ideal 16px between interactive elements

---

## 7. Interaction Patterns

### 7.1 Animations

**Page Transitions:**
- Duration: 200-300ms
- Easing: ease-in-out
- Fade + slight slide (20px)

**Modal Entry:**
- Fade in overlay: 150ms
- Scale modal from 0.95 to 1.0: 200ms
- Easing: ease-out

**Button Press:**
- Scale down to 0.98: 100ms
- Return to 1.0: 100ms

**Loading:**
- Skeleton shimmer: 1.5s loop
- Spinner rotation: 1s infinite
- Progress bar: Smooth width transition 200ms

**Micro-interactions:**
- Toast slide in: 300ms ease-out
- Checkbox check: 200ms
- Toggle switch: 200ms
- Confetti celebration: 2s (on milestones)

### 7.2 Hover States

**Cards:**
- Lift with shadow increase
- Border color change
- Scale: 1.02

**Buttons:**
- Background color darken 5-10%
- Cursor: pointer

**Links:**
- Underline appear
- Color shift

### 7.3 Focus States

**Keyboard Navigation:**
- Clear focus ring (2px indigo 500)
- Skip to content link
- Logical tab order
- Focus trap in modals

### 7.4 Empty States

**Empty Library:**
```
         ┌─────────────────────────────┐
         │     📭                      │
         │                             │
         │  No snippets yet!           │
         │                             │
         │  Generate your first snippet│
         │  to get started.            │
         │                             │
         │  [Generate Snippet →]       │
         │                             │
         └─────────────────────────────┘
```

**No Search Results:**
```
         ┌─────────────────────────────┐
         │     🔍                      │
         │                             │
         │  No snippets found          │
         │                             │
         │  Try adjusting your filters │
         │  or search terms.           │
         │                             │
         │  [Clear Filters]            │
         │                             │
         └─────────────────────────────┘
```

### 7.5 Error States

**API Failure:**
```
         ┌─────────────────────────────┐
         │     ⚠️                      │
         │                             │
         │  Oops! Something went wrong │
         │                             │
         │  We couldn't generate your  │
         │  snippet. Please try again. │
         │                             │
         │  [Try Again] [Contact       │
         │               Support]      │
         │                             │
         └─────────────────────────────┘
```

**Network Offline:**
```
         ┌─────────────────────────────┐
         │     📡                      │
         │                             │
         │  No internet connection     │
         │                             │
         │  Check your connection and  │
         │  try again.                 │
         │                             │
         │  [Retry]                    │
         │                             │
         └─────────────────────────────┘
```

---

## 8. Accessibility Requirements

### 8.1 WCAG 2.1 AA Compliance

**Color Contrast:**
- Normal text: Minimum 4.5:1
- Large text (18px+): Minimum 3:1
- UI components: Minimum 3:1

**Keyboard Navigation:**
- All interactive elements keyboard accessible
- Logical tab order
- Visible focus indicators
- Skip to content link

**Screen Reader Support:**
- Semantic HTML (headings, lists, nav, main, etc.)
- ARIA labels for icons and dynamic content
- ARIA live regions for notifications
- Alt text for all images

**Forms:**
- Labels associated with inputs
- Error messages announced
- Required fields indicated
- Help text accessible

### 8.2 ARIA Labels

**Icon Buttons:**
```html
<button aria-label="Copy snippet to clipboard">
  <CopyIcon />
</button>
```

**Loading States:**
```html
<div role="status" aria-live="polite" aria-label="Generating snippet">
  <Spinner />
</div>
```

**Modals:**
```html
<div role="dialog" aria-labelledby="modal-title" aria-modal="true">
  <h2 id="modal-title">Save Snippet</h2>
  ...
</div>
```

### 8.3 Text Alternatives

**Images:**
- Decorative: `alt=""`
- Informative: Descriptive alt text
- Complex: Alt + longer description

**Icons:**
- Paired with text when possible
- ARIA labels when icon-only
- Redundant text hidden from screen readers

### 8.4 Motion & Animation

**Respect prefers-reduced-motion:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 9. Appendix

### 9.1 Design File References

**Figma Files:**
- [Link to Figma master file]
- [Link to component library]
- [Link to mobile designs]
- [Link to dark mode variants] (future)

### 9.2 Asset Requirements

**Images:**
- Logo: SVG, transparent background
- Icons: 24x24px, SVG format
- Illustrations: SVG where possible
- Screenshots: 2x retina resolution

**Fonts:**
- Inter (Variable font): 400, 500, 600, 700
- Hosted on Google Fonts or self-hosted

### 9.3 Browser Support

**Supported Browsers:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Mobile:**
- iOS Safari 14+
- Chrome Mobile 90+

### 9.4 Development Handoff Checklist

**For Developers:**
- [ ] All spacing uses 8px grid system
- [ ] Colors match design system exactly
- [ ] Typography scale implemented
- [ ] All interactive states defined
- [ ] Accessibility requirements met
- [ ] Responsive breakpoints tested
- [ ] Loading states implemented
- [ ] Error handling designed
- [ ] Animations respect reduced motion
- [ ] Focus states visible

### 9.5 Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 2.0 | Oct 6, 2025 | Complete wireframe spec aligned with PRD v2.0 | Design Team |

---

**Document Approvals:**

- [ ] Product Lead (PRD alignment)
- [ ] Design Lead
- [ ] Engineering Lead (feasibility)
- [ ] Accessibility Lead

**Next Review Date:** November 15, 2025
**Author: ** Dr. Greg Blackburn