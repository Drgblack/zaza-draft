---
title: Zaza Promptly -- Future Enhancements (Post-MVP)
---

**Purpose**

This document outlines the next-stage product enhancements for *Zaza
Promptly*, to be developed after the MVP launch. These features are
designed to improve user engagement, support institutional adoption,
enhance data governance, and increase monetisation potential.

# 1. AI Hallucination Safeguards (Advanced Layer)

**Enhancements:**

-   Add a second-pass QA agent using GPT-4 to re-check outputs for:

    -   Sentence contradictions

    -   Factual errors or hallucinations

    -   Mismatches with the original prompt

-   Flag questionable outputs with a warning or colour indicator.

-   Offer user feedback button: "Was this snippet accurate/helpful?"

# 2. Snippet Packs (Premium & Institutional Tier)

**Functionality:**

-   Unlock thematic packs of pre-generated or AI-generated content.

-   Formats:

    -   In-app editable templates

    -   Downloadable PDFs

    -   AI-generated on demand from structured prompts

-   Example packs:

    -   "Primary School Reports"

    -   "Behaviour Notes"

    -   "Parent Communication Templates"

**Monetisation:**

-   Offer as part of a paid tier or sold as add-ons.

# 3. Institutional Licensing & Admin Console

**Functionality:**

-   Admin dashboard for schools or organisations to:

    -   Add/manage multiple teacher accounts

    -   Monitor usage analytics

    -   Curate internal snippet packs

    -   Enforce data entry restrictions

**Features:**

-   Bulk onboarding via CSV upload or invite codes

-   Optional white-labelling for organisations

# 4. Analytics Dashboard (Expanded)

**Teacher View:**

-   Weekly usage trends

-   Most-used tones, tags, and languages

-   Exportable usage logs

**Admin View:**

-   Total users in organisation

-   Popular features/snippets

-   High-performing content insights

# 5. Community Snippet Sharing (Opt-In Social Layer)

**Functionality:**

-   Allow users to share their best snippets publicly (tagged,
    searchable).

-   Upvote/downvote system for quality control.

-   "Featured Snippets" section for popular posts.

**Incentives:**

-   Leaderboards

-   Badges for contributions

-   Incentivised challenges (e.g., monthly contests)

# 6. Improved Gamification Layer

**Functionality:**

-   Unlock badges based on:

    -   Number of snippets created

    -   Languages used

    -   Monthly streaks

-   Include reward pop-ups and progress bars.

-   Show personal bests and milestones on user profile.

# 7. AI Personalisation

**Functionality:**

-   Allow user to set "teaching context" profile:

    -   Year level

    -   Subject areas

    -   Preferred tone/style

-   Use these settings to auto-tune the GPT system prompt and outputs.

# 8. Offline Mode

**Functionality:**

-   Local cache for recent prompts/snippets

-   Allow snippet creation and saving offline

-   Auto-sync when connection is restored

# 9. Advanced Export & LMS Integration

**Functionality:**

-   Export directly into third-party platforms such as:

    -   Google Docs

    -   Microsoft Word

    -   Common LMS (via CSV or integration API)

-   Option to copy/export in school report card formats

# 10. Internationalisation & Localisation

**Functionality:**

-   Expand language support based on demand and usage analytics

-   Adjust UI layouts for RTL languages (Arabic, Urdu)

-   Translate onboarding, FAQs, and support documentation

# 11. Customer Support Improvements

**Functionality:**

-   Live chat via Intercom or Crisp

-   In-app ticket submission

-   Status page and outage notifications

# 12. Education-Specific Intelligence Layer

-   **Class Brain (Persistent Student/Class Context):**\
    Secure, teacher-only data store of classes, students, and parent
    contacts. Used to personalise AI outputs without exposing sensitive
    data externally.

-   **Matching Logic (Message → Student/Class):**\
    The system detects which student/class a message refers to and
    enriches the GPT prompt with verified details.

-   **Fact-Aware Drafting (Advanced):**\
    Combine hallucination safeguards with Class Brain verification. If
    outputs deviate from stored facts, the system flags discrepancies
    and suggests edits.

-   **Zara Assistant (Trusted Guide):**\
    Zara explains AI suggestions, shows which facts were used, and
    invites teacher feedback on snippet quality.

**Zaza Core vs Vertical Layer Framework**

**Purpose**\
To ensure scalability across industries, Zaza products share a common
foundation ("Zaza Core") while plugging in domain-specific layers
("Brains") that personalise outputs for teachers, realtors, healthcare
professionals, and beyond.

**Core Features (Shared Across All Zaza Products):**

-   **Authentication** -- Firebase/Supabase reusable sign-in.

-   **AI Prompting Engine** -- Modular GPT integration, adaptable per
    vertical.

-   **Zara Assistant Layer** -- In-app persona for guidance,
    transparency, and feedback collection.

-   **Growth & Gamification** -- Streaks, badges, referrals to drive
    engagement and virality.

**Vertical Layers (Domain-Specific Brains):**

-   **Promptly (Education)**

    -   *Class Brain*: lightweight teacher-only student/class context.

    -   *Student/Parent Matching*: maps snippets to the correct student.

    -   *Fact-Aware Drafts*: grounded in verified class data.

-   **RealtyClose (Real Estate)**

    -   *Property Brain*: property listings, features, and client
        context.

    -   *Property Matching*: ties AI drafts to the correct listing or
        buyer.

    -   *Fact-Aware Drafts*: grounded in verified property data.

-   **ClinicClose (Healthcare)**

    -   *Patient Brain*: secure case/patient notes.

    -   *Patient Matching*: links drafts to the right case record.

    -   *Fact-Aware Drafts*: grounded in verified patient facts.

-   **LawClose (Legal/Casework)**

    -   *Case Brain*: structured case notes.

    -   *Case Matching*: maps documents to the relevant case.

    -   *Fact-Aware Drafts*: grounded in verified case facts.

**Diagram (Text Version):**

┌───────────────────────────┐

│ Zaza Core Features │

│ ─ Authentication │

│ ─ AI Prompting Engine │

│ ─ Zara Assistant Layer │

│ ─ Growth / Gamification │

└─────────────┬─────────────┘

│

┌──────────────────────────┼──────────────────────────┐

│ │ │

┌──▼──┐ ┌────▼────┐ ┌────▼────┐

│Promptly (Teachers) │RealtyClose (Realtors) │ClinicClose (Healthcare)

│- Class Brain │- Property Brain │- Patient Brain

│- Student Matching │- Property Matching │- Patient Matching

│- Fact-Aware Drafts │- Fact-Aware Drafts │- Fact-Aware Drafts

└─────┘ └─────────┘ └─────────┘

│

┌────▼────┐

│LawClose │

│- Case Brain

│- Case Matching

│- Fact-Aware Drafts

└─────────┘
