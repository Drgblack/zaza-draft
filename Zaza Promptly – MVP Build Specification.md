---
title: Zaza Promptly -- MVP Build Specification (Lovable-Compatible Core
  Features)
---

**Overview**

This document defines the Minimum Viable Product (MVP) version of *Zaza
Promptly*, designed for development using **Lovable**. The MVP focuses
on delivering the core user experience of AI-powered comment generation
with a freemium model, multilingual support, and intuitive snippet
management.

# 1. Prompt & Snippet Generation

**Functionality:**

-   Text input field for entering prompt content (e.g. "Year 5 report
    for a shy but hardworking student").

-   Tone selector (dropdown or buttons) -- e.g. Formal, Warm,
    Encouraging.

-   Output language selector (dropdown or toggle).

**Technical Notes:**

-   Use GPT-4 via Firebase Function.

-   Echo the user's prompt inside the system prompt for alignment.

-   Basic hallucination mitigation using strong system prompt
    instructions (second-pass QA logic deferred).

**Education-Specific Context Injection**

-   Implement lightweight "Class Brain" (Firestore collection) with
    fields: StudentName, YearLevel, Subject, ParentContact.

-   When prompts mention a stored student/class, inject these details
    into the system prompt for GPT generation.

-   Flag discrepancies if the AI introduces details not present in Class
    Brain.

# 2. Snippet Output & Management

**Functionality:**

-   Display generated snippet in preview card format.

-   Save snippet to Firestore on button click.

-   Allow tagging, basic editing, and deletion.

-   Include filtering by tag, tone, and language.

-   Display snippet count per month.

# 3. Freemium Logic (Usage Gating)

**Functionality:**

-   Limit non-subscribed users to 5 prompts per calendar month.

-   Display prompt usage counter in the UI.

-   When limit is reached, trigger Upgrade CTA modal or screen.

# 4. Upgrade & Monetisation

**Functionality:**

-   Create an \"Upgrade to Pro\" screen.

-   Explain benefits: unlimited snippets, export options, premium packs.

-   Stripe integration placeholder is sufficient for now (UI only, no
    live payments yet).

# 5. Multilingual UI & Output

**Functionality:**

-   Allow UI language selection with toggle or dropdown:

    -   **English**, **German**, **French**, **Spanish**, **Italian**,
        **Arabic**, **Hindi**, **Tagalog**

-   All UI strings must be configurable (use Firebase or Lovable's
    language config).

-   Pass output language as parameter in the GPT system prompt for
    matching comment generation.

# 6. Export Functionality

**Functionality:**

-   In Saved Snippets view, allow users to:

    -   Export all saved snippets as PDF or CSV.

    -   Select individual or bulk export.

-   Design with teacher usability in mind (clear formatting,
    downloadable button).

# 7. Gamification & Social Sharing

**Functionality:**

-   Add visible snippet count badge.

-   Optional: Celebrate milestone snippets (e.g. "10 comments
    written!").

-   Add social sharing buttons for selected platforms (e.g. LinkedIn, X,
    Facebook) allowing users to share praise or example comments.

# 8. Onboarding & Help Layer

**Functionality:**

-   On first launch, display onboarding modal or tooltip sequence:

    -   Example steps: "Write a Prompt", "Choose a Tone", "Generate a
        Snippet"

-   Add static "Help" or "FAQ" screen accessible from menu.

-   Optional: In-app support chat box (can be simulated).

-   **Zara Assistant:** Introduce Zara as the in-app assistant. Zara
    explains how snippets are generated, highlights when Class Brain
    data was used, and gathers teacher feedback ("Was this snippet
    accurate/helpful?").

# 9. UI/UX & Accessibility (Baseline)

**Functionality:**

-   Use large, readable fonts and good contrast (aim for WCAG 2.1
    compliance).

-   Ensure keyboard navigation works across components.

-   Use alt tags and screen-reader friendly labels.

# 10. App Navigation Structure

**Pages/Tabs:**

-   **Home / Prompt Generator**

-   **Saved Snippets** (with tags, filters, export)

-   **Upgrade**

-   **Help / Onboarding**

# Additional Notes:

-   All features must be compatible with Lovable's hosting and
    deployment (Firebase + React frontend).

-   Ensure Firestore is used for user data and snippet storage.

-   Use Firebase Auth (email or Google login) for sign-in.

-   Reusable components and clean design are prioritised for
    scalability.

# Zaza Core vs Vertical Layer Framework

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
