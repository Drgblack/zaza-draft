"use client"

import type React from "react"

import { useState, useEffect, useCallback, createContext, useContext } from "react"

export type Locale = "en-GB" | "en-US" | "de-DE"

interface PluralMessage {
  one: string
  other: string
}

interface LocaleMessages {
  ui?: Record<string, string | PluralMessage>
  [key: string]: string | PluralMessage | LocaleMessages | undefined
}

type NormalizedMessages = Record<string, string | PluralMessage>

export const localeNativeNames: Record<Locale, string> = {
  "en-GB": "English (UK)",
  "en-US": "English (US)",
  "de-DE": "Deutsch (DE)",
}

const EN_GB_MESSAGES: LocaleMessages = {

    newDoc: "New document",
    searchDocs: "Search documents",
    saved: "Saved",
    saving: "Savingâ€¦",
    offlineQueued: "Offline - changes queued",
    askAi: "Ask AI",
    suggestions: "Suggestions",
    explain: "Explain",
    history: "History",
    notHelpful: "Not helpful",
    notQuiteRight: "Not quite right",
    reason: "Reason",
    noteOptional: "Optional note",
    acceptAll: "Accept all",
    insertAllAsComments: "Insert all as comments",
    dismissAll: "Dismiss all",
    emptySuggestions: "Highlight text or press Ask AI to get suggestions.",
    emptyExplain: "Select a suggestion to see the reasoning.",
    emptyHistory: "No changes yet. Accept or dismiss a suggestion to track edits.",
    feedbackThanks: "Thanks. We will improve future suggestions.",
    settings: "Settings",
    help: "Help & Guides",
    profile: "Profile",
    language: "Language",
    "languageDropdown.label": "Select language",
    signOut: "Sign out",
    share: "Share",
    wordCount: { one: "{count} word", other: "{count} words" },
    readingLevel: "Reading level",
    tone: "Tone",
    use: "Use",
    insertAsComment: "Insert as comment",
    dismiss: "Dismiss",
    whyThis: "Why this",
    showAlignment: "Show alignment",
    recentDocuments: "Recent documents",
    privacyBanner: "Your text is processed securely. No student PII required.",
    confidenceHigh: "High",
    confidenceMedium: "Medium",
    confidenceLow: "Low",
    toneProfessional: "Professional",
    toneFriendly: "Friendly",
    toneFormal: "Formal",
    copyLink: "Copy link",
    linkCopied: "Copied!",
    openInNewTab: "Open in new tab",
    manageAccess: "Manage access",
    shareVia: "Share via",
    privacyNote: "Only people with the link can view this document.",
    otherLanguages: "Other languages",
    otherLanguagesComingSoon: "Other languages coming soon",
    commandPalette: "Command palette",
    newDocument: "New document",
    toggleDarkMode: "Toggle dark mode",
    toggleAiPanel: "Toggle AI panel",
    shareDocument: "Share document",
    greetingMorning: "Good morning, {name}",
    greetingAfternoon: "Good afternoon, {name}",
    greetingEvening: "Good evening, {name}",
    sublineMorning: "Ready to start the day strong?",
    sublineAfternoon: "Let's make this lesson shine.",
    sublineEvening: "Wrapping up the day?",
    sublineFriendly: "Ready to write something warm and clear?",
    sublineProfessional: "Let's keep it crisp and professional.",
    sublineFormal: "How can I help with today's writing?",
    toolbarBold: "Bold (Ctrl+B)",
    toolbarItalic: "Italic (Ctrl+I)",
    toolbarUnderline: "Underline (Ctrl+U)",
    toolbarBulletList: "Bulleted list",
    toolbarNumberedList: "Numbered list",
    toolbarHeading: "Heading",
    toolbarUndo: "Undo",
    toolbarRedo: "Redo",
    showNavigation: "Show navigation",
    collapseNavigation: "Collapse navigation panel",
    docTypeLessonPlan: "Lesson Plan",
    docTypeEmail: "Email",
    docTypeReport: "Report",
    docTypeDocument: "Document",
    emptyLessonPlan: "Start planning your lesson  -  Zara will help you structure and refine as you go.",
    emptyEmail: "Draft your email  -  Zara will help you strike the right tone and clarity.",
    emptyReport: "Begin your report  -  Zara will help you stay clear and evidence-based.",
    emptyGeneral: "Start writing  -  Zara will help polish your words when you're ready.",
    shareTitle: "Share this document",
    shareDescription: "Sharing sends a view-only link. No student data is included.",
    quickShare: "Quick share",
    shareWhatsApp: "WhatsApp",
    shareEmail: "Email",
    shareFacebook: "Facebook",
    sharePrivacy: "No student data is included.",
    comingSoon: "Coming soon",
    dayStreak: { one: "{count} day streak", other: "{count} day streak" },
    savedAgo: "Saved â€¢ {time} ago",
    toneUpdated: "Tone updated.",
    noDraftsYet: "No drafts yet  -  create your first document.",
    noMatchingDocs: "No matching documents",
    showAiPanel: "Show AI panel",
    hideAiPanel: "Hide AI panel",
    showAiPanelCoachmark: "Show AI panel here",
    newSuggestions: "New suggestions",
    previouslyViewed: "Previously viewed",
    scrollToTop: "Scroll to top",
    zaraTagline: "Your writing. Your voice. AI-assisted, never replaced.",
    noResultsFound: "No results found.",
    commandActions: "Actions",
    commandView: "View",
    typeCommand: "Type a command or search...",
    editDocTitle: "Edit document title",
    docTitleLabel: "Document title: {title}. Click to edit.",
    userMenu: "User menu",
    shareDocLabel: "Share document",
    switchToLightMode: "Switch to light mode",
    switchToDarkMode: "Switch to dark mode",
    collapseAiPanel: "Collapse AI panel",
    openSettings: "Open settings",
    openHelp: "Open help and guides",
    createNewDoc: "Create new document",
    searchDocsLabel: "Search documents",
    mainNavigation: "Main navigation",
    metricsReadingLevel: "Reading level: {level}",
    "auth.title.signin": "Sign in",
    "auth.title.signup": "Create an account",
    "auth.title.reset": "Reset password",
    "auth.field.email": "Email",
    "auth.field.password": "Password",
    "auth.field.passwordConfirm": "Confirm password",
    "auth.cta.signin": "Sign in",
    "auth.cta.signup": "Create an account",
    "auth.cta.forgot": "Forgot password?",
    "auth.cta.reset": "Reset password",
    "auth.msg.passwordPolicy":
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    "auth.msg.passwordMismatch": "Passwords do not match",
    "auth.title": "Welcome back",
    "auth.description": "Sign in with your school account to unlock Zaza Draft.",
    "auth.emailLabel": "Email",
    "auth.passwordLabel": "Password",
    "auth.passwordHelper": "Must be at least 8 characters long.",
    "auth.processing": "Processing...",
    "auth.noAccount": "Don't have an account yet?",
    "auth.alreadyHaveAccount": "Already have an account?",
    "auth.orContinue": "Or continue with",
    "auth.continueWithGoogle": "Continue with Google",
    "auth.loading": "Signing you in...",
    "auth.showPassword": "Show password",
    "auth.hidePassword": "Hide password",
    "billing.title": "Billing & Subscription",
    "billing.signinRequired": "Please sign in to view billing.",
    "billing.usageThisMonth": "{used} / {limit} drafts used this month",
    "classes.title": "Your classes",
    "classes.open": "Open",
    "classes.editStudent.title": "Edit student",
    "classes.field.name": "Name",
    "classes.field.emailOptional": "Email (optional)",
    "classes.delete.confirm": "Are you sure you want to delete {name}? This action cannot be undone.",
    "draft.title": "Zaza Draft",
    "draft.field.notes": "Notes",
    "draft.lang.english": "English",
    "draft.lang.german": "Deutsch",
    "confirm.title": "Please confirm",
    "a11y.setToneTo": "Set tone to {tone}",
    "panel.title": "Zara  -  your writing helper",
    "panel.tabs.suggestions": "Suggestions",
    "panel.tabs.explain": "Explain",
    "panel.tabs.history": "History",
    "panel.card.strengthenClarity": "Strengthen clarity",
    "panel.card.addScaffolding": "Add scaffolding",
    "panel.card.whyThis": "Why this",
    "panel.card.use": "Use",
    "panel.card.insertAsComment": "Insert as comment",
    "panel.card.notQuiteRight": "Not quite right",
    "panel.card.previouslyViewed": "Previously viewed",
    "panel.card.high": "High",
    "panel.card.medium": "Medium",
    "panel.card.low": "Low",
    "statusBar.words": { one: "{count} word", other: "{count} words" },
    "statusBar.readingLevel": "Reading level: {level}",
    "statusBar.tone": "Tone",
    "greeting.named": "Good morning, {name} Ã°Å¸â€˜â€¹",
    "greeting.generic": "Good morning Ã°Å¸â€˜â€¹",
    "footer.tagline": "The writing partner for teachers - save time, reduce stress, write with confidence.",
    "footer.taglineShort": "Write with heart. Teach with clarity.",
    "footer.product": "Product",
    "footer.resources": "Resources",
    "footer.company": "Company",
    "footer.links.draft": "Zaza Draft",
    "footer.links.teach": "Zaza Teach",
    "footer.links.help": "Help & Guides",
    "footer.links.aiLiteracy": "AI Literacy",
    "footer.links.about": "About",
    "footer.links.privacy": "Privacy",
    "footer.links.terms": "Terms",
    "footer.links.contact": "Contact",
    "footer.language": "Language",
    "footer.copyrightPrefix": "Â©",
    "footer.copyrightSuffix": "Zaza Technologies. All rights reserved.",
    "footer.builtBy": "Built by educators, for educators.",
    "panel.zara.suggests": "Zara suggestsâ€¦",
    "panel.helper.high": "Let's tighten this up",
    "panel.helper.medium": "Worth a small tweak",
    "panel.helper.low": "Just a thought",
    "panel.progress.polishing": "You're polishing like a pro ?",
    "panel.progress.draftsUsed": "{used} of {limit} drafts",
    "panel.examples.toggle": "See examples",
    "panel.examples.hide": "Hide examples",
    "panel.card.whyZaraHelps": "Why Zara thinks this helps",
    "panel.examples.seeOne": "See example",
    "panel.examples.nextExample": "Next example",
    "tone.warm": "Warm",
    "tone.professional": "Professional",
    "tone.direct": "Direct",
    "tone.empathetic": "Empathetic",
    "button.generate": "Generate Draft",
    "zara.greeting": "Hi! I'm Zara, your teaching assistant.",
    "zara.description": "I can help you with communication tips and pedagogical guidance.",
    "zara.tip.empathetic.title": "How to write empathetic feedback",
    "zara.tip.empathetic.subtitle": "Balance warmth with constructive guidance",
    "zara.tip.parent.title": "Example parent email templates",
    "zara.tip.parent.subtitle": "Ready-to-use templates for common scenarios",
    "zara.tip.difficult.title": "Tips for difficult conversations",
    "zara.tip.difficult.subtitle": "Navigate challenging topics with confidence",
    "zara.error.title": "Something went wrong",
    "zara.error.description": "I couldn't send your question. Please try again.",
    "zara.error.authRequiredTitle": "Sign in required",
    "zara.error.authRequiredDescription": "Please sign in to chat with Zara.",
    "zara.button.backToMenu": "Back to menu",
    "zara.button.clearChat": "Clear chat",
    "insights.title": "Your Teaching Impact, {name}",
    "insights.draftsUsed": "{used} of {limit} drafts used this month",
    "insights.unlimitedDrafts": "Unlimited drafts",
    "insights.backToEditor": "Back to Editor",
    "insights.subtitle": "Insights that celebrate your growth",
    "insights.dataControl": "Your data, your control",
    "insights.downloadReport": "Download Report",
    "insights.filter.last7": "Last 7 days",
    "insights.filter.last30": "Last 30 days",
    "insights.filter.last90": "Last 90 days",
    "insights.timeSaved.title": "Time Saved",
    "insights.timeSaved.hours": "{hours} hours",
    "insights.timeSaved.thisWeek": "This week",
    "insights.timeSaved.trend": "+{percent}% from last week",
    "insights.timeSaved.tooltip":
      "Based on 12-minute baseline per draft (NCES 2020 study). We calculate time saved by comparing your draft creation time to the average time teachers spend writing similar communications.",
    "insights.timeSaved.context": "That's {count} fewer emails on Sunday evening!",
    "insights.draftsCreated.title": "Drafts Created",
    "insights.draftsCreated.value": "{count} drafts",
    "insights.draftsCreated.subtitle": "{used} of {total} used without edits",
    "insights.draftsCreated.tooltip":
      "Your one-shot success rate shows how often you use drafts without major edits. Higher rates indicate Zara is learning your voice!",
    "insights.currentStreak.title": "Current Streak",
    "insights.currentStreak.days": "{count} days",
    "insights.currentStreak.subtitle": "Keep it going!",
    "insights.currentStreak.tooltip":
      "Consecutive days using Zaza Draft. Consistency helps Zara learn your communication style better!",
    "insights.qualityScore.title": "Quality Score",
    "insights.qualityScore.value": "{score}/100",
    "insights.qualityScore.subtitle": "Edit depth score",
    "insights.qualityScore.trend": "+{points} points this month",
    "insights.qualityScore.tooltip":
      "Based on how much you edit drafts. Higher scores mean Zara is getting closer to your natural voice.",
    "insights.heatmap.title": "When You Draft Best",
    "insights.heatmap.insight": "Tuesday afternoons are your peak productivity time - consider blocking that time!",
    "insights.heatmap.warning": "Weekend work: {count} drafts",
    "insights.toneDistribution.title": "Your Communication Style",
    "insights.toneDistribution.insight": "You used 'Empathetic' {percent}% more in difficult conversations this month",
    "insights.confidence.title": "Your Growth Journey",
    "insights.confidence.insight": "Growing confidence! Your drafts need less editing over time.",
    "insights.confidence.tooltipLabel": "Confidence",
    "insights.badges.title": "Achievements Unlocked",
    "insights.badge.timeReclaimed": "Time Reclaimed - Bronze",
    "insights.badge.timeReclaimed.desc": "Saved 2+ hours with AI assistance",
    "insights.badge.weekStreak": "{count}-Week Streak",
    "insights.badge.weekStreak.desc": "Used Zaza Draft for {count} consecutive weeks",
    "insights.badge.toneMaster": "Tone Master",
    "insights.badge.toneMaster.desc": "Used all 4 communication tones",
    "insights.badge.multilingual": "Multilingual Champion",
    "insights.badge.multilingual.desc": "Created drafts in 3+ languages",
    "insights.badge.oneShot": "One-Shot Wonder",
    "insights.badge.oneShot.desc": "90% first-draft success rate",
    "insights.badge.weekendWarrior": "Weekend Warrior Retired",
    "insights.badge.weekendWarrior.desc": "Zero weekend drafts for 4 weeks",
    "insights.badge.earned": "Earned",
    "insights.badge.inProgress": "In progress",
    "insights.badge.locked": "Locked",
    "insights.wellbeing.title": "Your Wellbeing Matters",
    "insights.wellbeing.toggle": "Show wellbeing insights",
    "insights.wellbeing.afterHours": "After-hours drafting: {percent}%",
    "insights.wellbeing.healthyBoundary": "Healthy boundary",
    "insights.wellbeing.afterHours.desc":
      "You drafted {count} times after 10pm this week. Consider these time-saving strategies:",
    "insights.wellbeing.learnBoundaries": "Learn about boundaries",
    "insights.wellbeing.workLife": "Work-Life Balance Score",
    "insights.wellbeing.weekendProtection": "Weekend protection",
    "insights.wellbeing.eveningBoundaries": "Evening boundaries",
    "insights.wellbeing.consecutiveDays": "Consecutive days",
    "insights.suggestions.title": "Personalized Suggestions",
    "insights.suggestion.empathetic.title": "Try 'Empathetic' tone first",
    "insights.suggestion.empathetic.desc":
      "You regenerate often on parent emails. Using the 'Empathetic' tone first could save you time.",
    "insights.suggestion.empathetic.cta": "Update preferences",
    "insights.suggestion.wednesday.title": "Protect your Wednesday flow",
    "insights.suggestion.wednesday.desc":
      "Your Wednesday drafts have 50% fewer edits. Consider scheduling heavy writing then.",
    "insights.suggestion.wednesday.cta": "Set reminder",
    "insights.suggestion.reminder.modalHint":
      "Pick how you'd like to lock this protected writing time into your calendar.",
    "insights.suggestion.reminder.modalFootnote":
      "You can edit or cancel this reminder anytime from your calendar.",
    "insights.suggestion.reminder.nextEvent": "Next event",
    "insights.suggestion.reminder.openCalendar": "Open Google Calendar",
    "insights.suggestion.reminder.downloadIcs": "Download .ics",
    "insights.suggestion.classBrain.title": "Unlock Class Brain",
    "insights.suggestion.classBrain.desc": "Add student context to increase your one-shot rate by 35%",
    "insights.suggestion.classBrain.cta": "Get started",
    "insights.suggestion.reminderToastTitle": "Reminders coming soon",
    "insights.suggestion.reminderToastDescription": "We'll add scheduling nudges so you can focus on teaching.",
    "insights.suggestion.badge.new": "NEW",
    "insights.dataControls.title": "Data Controls",
    "insights.dataControls.shareData": "Share anonymized data to improve Zaza",
    "insights.dataControls.helpTeachers": "Help improve Zaza for 1,000+ teachers worldwide",
    "insights.dataControls.collect.title": "What we collect",
    "insights.dataControls.collect.timestamps": "Timestamps of when you draft",
    "insights.dataControls.collect.tones": "Tone selections you choose",
      "settings.preferences.tagline": "Personalized control",
      "settings.preferences.title": "Preferences",
      "settings.preferences.description":
        "Keep your most important defaults in one place. We lock the heavy lifting until the next release, but you can always head back to the draft to keep writing.",
      "settings.preferences.footerNote":
        "Saved context stays on this device unless you copy it to a shared document. The safe guidelines above keep sensitive details out of Class Brain.",
      "settings.backToDraft": "Back to Draft",
      "settings.cards.toneDefaults.title": "Tone defaults",
      "settings.cards.toneDefaults.description":
        "Tone controls will unlock when we connect to your tone history. Until then, we honor the tone you have selected in the editor.",
      "settings.cards.language.title": "Language",
      "settings.cards.language.description":
        "Language defaults mirror your last document and automatically roll into new drafts without manual adjustments.",
      "settings.cards.signature.title": "Signature",
      "settings.cards.signature.preview": "Preview",
      "settings.cards.signature.empty": "No signature set yet.",
      "settings.cards.signature.description":
        "Signature editing arrives with the next phase of export workflows. Until then we keep the preview read-only.",
      "settings.lockedBadge": "Locked",
      "settings.cards.safeguard.title": "Safeguarding defaults",
      "settings.cards.safeguard.subhead": "What we protect",
      "settings.cards.safeguard.list.1": "We never store full student names or identifiers without explicit permission.",
      "settings.cards.safeguard.list.2": "Sensitive attachments, private addresses, and contact information remain off-limits.",
      "settings.cards.safeguard.list.3": "You can toggle anonymized data sharing from within the insights panel.",
      "settings.cards.safeguard.footer":
        "These defaults are enforced automatically. If you need a tighter guardrail, reach out through the support menu in the editor.",
      "classBrain.label": "Class Brain",
      "classBrain.title": "Build your class brain",
      "classBrain.backToDraft": "Back to Draft",
      "classBrain.description":
        "Class Brain lets you store safe, evergreen student context so the assistant understands {name}'s classroom before you start writing. Share the high-level wins, the goals, and the tone you need for this group.",
      "classBrain.tooltip":
        "Class Brain keeps this classroom context in the browser so the assistant understands your goals without storing anything sensitive.",
      "classBrain.sections.whatItIs.title": "What it is",
      "classBrain.sections.whatItIs.body":
        "A lightweight knowledge base for the students and focus areas you teach most. Class Brain keeps this context nearby so every generation understands your classroom stage.",
      "classBrain.sections.whatItIs.subtext":
        "Match the right tone and scaffold wording without repeating the same setup every time.",
      "classBrain.sections.whatToAdd.title": "What to add",
      "classBrain.add.grade": "Grade level or course you are writing for.",
      "classBrain.add.mood": "Classroom mood, pacing, or recurring themes.",
      "classBrain.add.goals": "Student goals (e.g., mastering a standard or improving confidence).",
      "classBrain.sections.whatNotToAdd.title": "What NOT to add",
      "classBrain.notAdd.noNames": "No full names, student IDs, or contact info.",
      "classBrain.notAdd.noSensitive": "Avoid medical details, disciplinary notes, or sensitive data.",
      "classBrain.notAdd.noOpinions": "Skip personal opinions about individuals.",
      "classBrain.savedContext.title": "Your saved context",
      "classBrain.savedContext.storedLocally": "Stored locally",
      "classBrain.savedContext.tagline": "Safe, editable, and stored locally",
      "classBrain.textarea.placeholder":
        "e.g., 'AP Biology class focused on cellular respiration. Students are preparing for state exam in May. Class mood is engaged but slightly anxious.'",
      "classBrain.textarea.helper": "Save a short reminder (no names) that sets up the next writing session.",
      "classBrain.stats.characters": "{count}/{max} characters",
      "classBrain.stats.words": "{count} words",
      "classBrain.lastSaved": "Last saved: {time}",
      "classBrain.saveContext": "Save context",
      "classBrain.footerNote":
        "Saved context stays on this device unless you copy it to a shared document. The safe guidelines above keep sensitive details out of Class Brain.",
      "classBrain.toast.title": "Context saved",
      "classBrain.toast.description": "Class Brain remembers this locally for your next session.",
    "insights.dataControls.collect.editPatterns": "Edit patterns (how much you change)",
    "insights.dataControls.collect.performance": "Generation time and performance",
    "insights.dataControls.collect.languages": "Languages you write in",
    "insights.dataControls.neverCollect.title": "What we NEVER collect",
    "insights.dataControls.neverCollect.content": "Actual message text or content",
    "insights.dataControls.neverCollect.students": "Student names or identifiers",
    "insights.dataControls.neverCollect.parents": "Parent contact information",
    "insights.dataControls.neverCollect.school": "School or district details",
    "insights.dataControls.neverCollect.pii": "Any personally identifiable information",
    "insights.dataControls.benefits.title": "How this helps you",
    "insights.dataControls.benefits.toneSuggestions": "Better tone suggestions",
    "insights.dataControls.benefits.toneSuggestions.desc": "Learn which tones work best for different situations",
    "insights.dataControls.benefits.fasterGeneration": "Faster generation",
    "insights.dataControls.benefits.fasterGeneration.desc": "Optimize performance based on usage patterns",
    "insights.dataControls.benefits.catchIssues": "Catch issues early",
    "insights.dataControls.benefits.catchIssues.desc": "Identify and fix problems before they affect you",
    "insights.dataControls.benefits.buildFeatures": "Build needed features",
    "insights.dataControls.benefits.buildFeatures.desc": "Prioritize what teachers actually use",
    "insights.dataControls.downloadData": "Download my data (CSV)",
    "insights.dataControls.privacySettings": "Privacy settings",
      "insights.dataControls.privacyNote": "We never share student information. {link}",
      "insights.dataControls.learnMore": "Learn more about our privacy practices",
      "editor.outOfScope.title": "Not generated",
      "editor.outOfScope.body":
        "This doesn't look like a parent message or report comment. Zaza Draft is designed for professional school communication.",
      "editor.outOfScope.helper": "Adjust the text or add context and try again.",
      "editor.notice.scopeGuard.title": "Not generated",
      "editor.notice.scopeGuard.subtext":
        "This doesn't look like a parent message or report comment. Zaza Draft is designed for professional school communication.",
      "insights.badge.progress": "Progress",
    "insights.heatmap.tooltipText": "Activity heatmap showing your most productive drafting times",
    "insights.heatmap.mon": "Mon",
    "insights.heatmap.tue": "Tue",
    "insights.heatmap.wed": "Wed",
    "insights.heatmap.thu": "Thu",
    "insights.heatmap.fri": "Fri",
    "insights.heatmap.sat": "Sat",
    "insights.heatmap.sun": "Sun",
    "insights.confidence.yAxisLabel": "Confidence (%)",
    "account.menu.userMenu": "User menu",
    "account.menu.accountSettings": "Account settings",
    "account.menu.myData": "My data / Export",
    "account.menu.privacySafety": "Privacy & safety",
    "account.menu.helpSupport": "Help / Support",
    "account.menu.logout": "Log out",
    "account.title": "Account Settings",
    "account.backToApp": "Back to app",
    "account.backToAccount": "Back to account",
    "account.profile.title": "Profile",
    "account.profile.description": "Manage your personal information",
    "account.profile.photoLabel": "Profile Photo",
    "account.profile.uploadPhoto": "Upload Photo",
    "account.profile.removePhoto": "Remove Photo",
    "account.profile.photoHelper": "JPG, PNG or WebP. Max 5MB.",
    "account.profile.photoPrivacy": "Profile photos are optional and only visible to you.",
    "support.title": "Support & help",
    "support.guides.title": "Guided support",
    "support.guides.description": "Explore curated resources to keep families informed and documentation concise.",
    "support.guides.button": "Browse guides",
    "support.guides.guide1.title": "Parent communication templates",
    "support.guides.guide1.description": "Use proven intro, progress, and celebration notes without rewriting everything.",
    "support.guides.guide1.step1": "Open the parent newsletter kit",
    "support.guides.guide1.step2": "Pick the tone that matches your classroom culture",
    "support.guides.guide1.step3": "Tailor the template to the current topic",
    "support.guides.guide2.title": "Classroom routines & wellbeing",
    "support.guides.guide2.description": "Handle behaviour notes, wellbeing check-ins, and attendance reflections with clear tone.",
    "support.guides.guide2.step1": "Review the wellbeing sentence bank",
    "support.guides.guide2.step2": "Add student names and context",
    "support.guides.guide2.step3": "Share with families or colleagues",
    "support.guides.guide3.title": "Lesson reflections & cross-class notes",
    "support.guides.guide3.description": "Capture literacy, maths, or science highlights using structured prompts.",
    "support.guides.guide3.step1": "Use the lesson summary outline",
    "support.guides.guide3.step2": "Call out next steps or support needs",
    "support.guides.guide3.step3": "Save or share the note",
    "support.guides.helpText": "Prefer live help? Send a quick note and we will respond inside the app.",
    "support.community.title": "Community & collaboration",
    "support.community.description": "Share practices, celebrate progress, and connect with other teachers.",
    "support.community.button": "Join the community",
    "support.contact.title": "Contact support",
    "support.contact.description": "Tell us the classroom context or policy question you need help with.",
    "support.contact.subjectLabel": "Subject",
    "support.contact.subjectPlaceholder": "Short summary (e.g. 'Draft scope question')",
    "support.contact.detailsLabel": "Details",
    "support.contact.detailsPlaceholder": "Share the classroom context, timeline, or policy question you need help with.",
    "support.contact.helper": "Tell us how Zaza Draft can help you and the grade level or workflow it impacts.",
    "support.contact.sending": "Sending...",
    "support.contact.button": "Send request",
    "support.contact.submitted": "Thanks! Our team will follow up inside the app within one working day.",
    "support.contact.submittedMessage": "We heard you! You can close this tab or head back to the help overview.",
}

 export const localeMessages: Record<Locale, LocaleMessages> = {"en-GB": EN_GB_MESSAGES,
  "en-US": EN_GB_MESSAGES,
  "de-DE": {
    newDoc: "Neues Dokument",
    searchDocs: "Dokumente suchen",
    saved: "Gespeichert",
    saving: "Speichernâ€¦",
    offlineQueued: "Offline - Ã„nderungen in Warteschlange",
    askAi: "KI fragen",
    suggestions: "VorschlÃ¤ge",
    explain: "ErklÃ¤ren",
    history: "Verlauf",
    notHelpful: "Nicht hilfreich",
    notQuiteRight: "Nicht ganz richtig",
    reason: "Grund",
    noteOptional: "Optionale Notiz",
    acceptAll: "Alle Ã¼bernehmen",
    insertAllAsComments: "Alle als Kommentar einfÃ¼gen",
    dismissAll: "Alle verwerfen",
    emptySuggestions: "Markieren Sie Text oder klicken Sie auf KI fragen, um VorschlÃ¤ge zu erhalten.",
    emptyExplain: "WÃ¤hlen Sie einen Vorschlag aus, um die BegrÃ¼ndung zu sehen.",
    emptyHistory:
      "Noch keine Ã„nderungen. Akzeptieren oder verwerfen Sie einen Vorschlag, um Bearbeitungen zu verfolgen.",
    feedbackThanks: "Danke. Wir verbessern zukÃ¼nftige VorschlÃ¤ge.",
    settings: "Einstellungen",
    help: "Hilfe & Anleitungen",
    profile: "Profil",
    language: "Sprache",
    "languageDropdown.label": "Sprache auswÃ¤hlen",
    signOut: "Abmelden",
    share: "Teilen",
    wordCount: { one: "{count} Wort", other: "{count} WÃ¶rter" },
    readingLevel: "Lesestufe",
    tone: "Ton",
    use: "Verwenden",
    insertAsComment: "Als Kommentar einfÃ¼gen",
    dismiss: "Verwerfen",
    whyThis: "Warum dies",
    showAlignment: "Ausrichtung anzeigen",
    recentDocuments: "Letzte Dokumente",
    privacyBanner: "Ihr Text wird sicher verarbeitet. Keine personenbezogenen Daten von SchÃ¼lern erforderlich.",
    confidenceHigh: "Hoch",
    confidenceMedium: "Mittel",
    confidenceLow: "Niedrig",
    toneProfessional: "Professionell",
    toneFriendly: "Freundlich",
    toneFormal: "Formell",
    copyLink: "Link kopieren",
    linkCopied: "Kopiert!",
    openInNewTab: "In neuem Tab Ã¶ffnen",
    manageAccess: "Zugriff verwalten",
    shareVia: "Teilen Ã¼ber",
    privacyNote: "Nur Personen mit dem Link kÃ¶nnen dieses Dokument anzeigen.",
    otherLanguages: "Andere Sprachen",
    otherLanguagesComingSoon: "Weitere Sprachen folgen bald",
    commandPalette: "Befehlspalette",
    newDocument: "Neues Dokument",
    toggleDarkMode: "Dunkelmodus umschalten",
    toggleAiPanel: "KI-Panel umschalten",
    shareDocument: "Dokument teilen",
    greetingMorning: "Guten Morgen, {name}",
    greetingAfternoon: "Guten Tag, {name}",
    greetingEvening: "Guten Abend, {name}",
    sublineMorning: "Bereit, den Tag stark zu beginnen?",
    sublineAfternoon: "Lassen Sie uns diese Lektion zum GlÃ¤nzen bringen.",
    sublineEvening: "Den Tag ausklingen lassen?",
    sublineFriendly: "Bereit, etwas Warmes und Klares zu schreiben?",
    sublineProfessional: "Halten wir es knackig und professionell.",
    sublineFormal: "Wie kann ich Ihnen heute beim Schreiben helfen?",
    toolbarBold: "Fett (Strg+B)",
    toolbarItalic: "Kursiv (Strg+I)",
    toolbarUnderline: "Unterstrichen (Strg+U)",
    toolbarBulletList: "AufzÃ¤hlungsliste",
    toolbarNumberedList: "Nummerierte Liste",
    toolbarHeading: "Ãœberschrift",
    toolbarUndo: "RÃ¼ckgÃ¤ngig",
    toolbarRedo: "Wiederholen",
    showNavigation: "Navigation anzeigen",
    collapseNavigation: "Navigationsbereich einklappen",
    docTypeLessonPlan: "Unterrichtsplan",
    docTypeEmail: "E-Mail",
    docTypeReport: "Bericht",
    docTypeDocument: "Dokument",
    emptyLessonPlan: "Beginnen Sie mit der Planung Ihrer Lektion - Zara hilft Ihnen beim Strukturieren und Verfeinern.",
    emptyEmail: "Verfassen Sie Ihre E-Mail - Zara hilft Ihnen, den richtigen Ton und Klarheit zu finden.",
    emptyReport: "Beginnen Sie Ihren Bericht - Zara hilft Ihnen, klar und evidenzbasiert zu bleiben.",
    emptyGeneral: "Beginnen Sie zu schreiben - Zara hilft Ihnen, Ihre Worte zu polieren, wenn Sie bereit sind.",
    shareTitle: "Dieses Dokument teilen",
    shareDescription: "Beim Teilen wird ein schreibgeschÃ¼tzter Link gesendet. Keine SchÃ¼lerdaten enthalten.",
    quickShare: "Schnell teilen",
    shareWhatsApp: "WhatsApp",
    shareEmail: "E-Mail",
    shareFacebook: "Facebook",
    sharePrivacy: "Keine SchÃ¼lerdaten enthalten.",
    comingSoon: "DemnÃ¤chst verfÃ¼gbar",
    dayStreak: { one: "{count} Tag Streak", other: "{count} Tage Streak" },
    savedAgo: "Gespeichert â€¢ vor {time}",
    toneUpdated: "Ton aktualisiert.",
    noDraftsYet: "Noch keine EntwÃ¼rfe - erstellen Sie Ihr erstes Dokument.",
    noMatchingDocs: "Keine passenden Dokumente",
    showAiPanel: "KI-Panel anzeigen",
    hideAiPanel: "KI-Panel ausblenden",
    showAiPanelCoachmark: "KI-Panel hier anzeigen",
    newSuggestions: "Neue VorschlÃ¤ge",
    previouslyViewed: "Zuvor angesehen",
    scrollToTop: "Nach oben scrollen",
    zaraTagline: "Ihr Schreiben. Ihre Stimme. KI-unterstÃ¼tzt, nie ersetzt.",
    noResultsFound: "Keine Ergebnisse gefunden.",
    commandActions: "Aktionen",
    commandView: "Ansicht",
    typeCommand: "Befehl eingeben oder suchen...",
    editDocTitle: "Dokumenttitel bearbeiten",
    docTitleLabel: "Dokumenttitel: {title}. Klicken zum Bearbeiten.",
    userMenu: "BenutzermenÃ¼",
    shareDocLabel: "Dokument teilen",
    switchToLightMode: "Zum hellen Modus wechseln",
    switchToDarkMode: "Zum dunklen Modus wechseln",
    collapseAiPanel: "KI-Panel einklappen",
    openSettings: "Einstellungen Ã¶ffnen",
    openHelp: "Hilfe und Anleitungen Ã¶ffnen",
    createNewDoc: "Neues Dokument erstellen",
    searchDocsLabel: "Dokumente durchsuchen",
    mainNavigation: "Hauptnavigation",
    metricsReadingLevel: "Lesestufe: {level}",
    "auth.title.signin": "Anmelden",
    "auth.title.signup": "Konto erstellen",
    "auth.title.reset": "Passwort zurÃ¼cksetzen",
    "auth.field.email": "E-Mail",
    "auth.field.password": "Passwort",
    "auth.field.passwordConfirm": "Passwort bestÃ¤tigen",
    "auth.cta.signin": "Anmelden",
    "auth.cta.signup": "Konto erstellen",
    "auth.cta.forgot": "Passwort vergessen?",
    "auth.cta.reset": "Passwort zurÃ¼cksetzen",
    "auth.msg.passwordPolicy":
      "Das Passwort muss mindestens einen Grossbuchstaben, einen Kleinbuchstaben und eine Zahl enthalten.",
    "auth.msg.passwordMismatch": "PasswÃ¶rter stimmen nicht Ã¼berein.",
    "auth.title": "Willkommen zurÃ¼ck",
    "auth.description": "Melde dich mit deinem Schul-Account bei Zaza Draft an.",
    "auth.emailLabel": "E-Mail",
    "auth.passwordLabel": "Passwort",
    "auth.passwordHelper": "Mindestens 8 Zeichen, Buchstaben und Zahlen.",
    "auth.processing": "Verarbeiteâ€¦",
    "auth.noAccount": "Noch keinen Account?",
    "auth.alreadyHaveAccount": "Schon einen Account?",
    "auth.orContinue": "Oder mit",
    "auth.continueWithGoogle": "Mit Google fortfahren",
    "auth.loading": "Wir melden dich anâ€¦",
    "auth.showPassword": "Passwort anzeigen",
    "auth.hidePassword": "Passwort verbergen",
    "billing.title": "Abrechnung und Abo",
    "billing.signinRequired": "Bitte melde dich an, um die Abrechnung zu sehen.",
    "billing.usageThisMonth": "{used} / {limit} EntwÃ¼rfe in diesem Monat benutzt",
    "classes.title": "Deine Klassen",
    "classes.open": "Ã–ffnen",
    "classes.editStudent.title": "SchÃ¼lerin/SchÃ¼ler bearbeiten",
    "classes.field.name": "Name",
    "classes.field.emailOptional": "E-Mail (optional)",
    "classes.delete.confirm": "MÃ¶chtest du {name} wirklich lÃ¶schen? Dies kann nicht rÃ¼ckgÃ¤ngig gemacht werden.",
    "draft.title": "Zaza Draft",
    "draft.field.notes": "Notizen",
    "draft.lang.english": "English",
    "draft.lang.german": "Deutsch",
    "confirm.title": "Bitte bestÃ¤tigen",
    "a11y.setToneTo": "Ton auf {tone} setzen",
    "panel.title": "Zara  -  Ihr Schreibhelfer",
    "panel.tabs.suggestions": "VorschlÃ¤ge",
    "panel.tabs.explain": "ErklÃ¤ren",
    "panel.tabs.history": "Verlauf",
    "panel.card.strengthenClarity": "Klarheit stÃ¤rken",
    "panel.card.addScaffolding": "In Schritte gliedern",
    "panel.card.whyThis": "Warum dies",
    "panel.card.use": "Ãœbernehmen",
    "panel.card.insertAsComment": "Als Kommentar einfÃ¼gen",
    "panel.card.notQuiteRight": "Nicht ganz passend",
    "panel.card.previouslyViewed": "Zuvor angesehen",
    "panel.card.high": "Hoch",
    "panel.card.medium": "Mittel",
    "panel.card.low": "Niedrig",
    "statusBar.words": { one: "{count} Wort", other: "{count} WÃ¶rter" },
    "statusBar.readingLevel": "Lesestufe: {level}",
    "statusBar.tone": "Ton",
    "greeting.named": "Guten Morgen, {name} Ã°Å¸â€˜â€¹",
    "greeting.generic": "Guten Morgen Ã°Å¸â€˜â€¹",
    "footer.tagline": "Der Schreibpartner fÃ¼r LehrkrÃ¤fte - Zeit sparen, Stress reduzieren, selbstbewusst schreiben.",
    "footer.taglineShort": "Mit Herz schreiben. Mit Klarheit lehren.",
    "footer.product": "Produkt",
    "footer.resources": "Ressourcen",
    "footer.company": "Unternehmen",
    "footer.links.draft": "Zaza Draft",
    "footer.links.teach": "Zaza Teach",
    "footer.links.help": "Hilfe & Anleitungen",
    "footer.links.aiLiteracy": "KI-Kompetenz",
    "footer.links.about": "Ãœber uns",
    "footer.links.privacy": "Datenschutz",
    "footer.links.terms": "Nutzungsbedingungen",
    "footer.links.contact": "Kontakt",
    "footer.language": "Sprache",
    "footer.copyrightPrefix": "Â©",
    "footer.copyrightSuffix": "Zaza Technologies. Alle Rechte vorbehalten.",
    "footer.builtBy": "Von PÃ¤dagog:innen gebaut - fÃ¼r PÃ¤dagog:innen.",
    "panel.zara.suggests": "Zara schlÃ¤gt vorâ€¦",
    "panel.helper.high": "Lass uns das straffen",
    "panel.helper.medium": "Eine kleine Anpassung wert",
    "panel.helper.low": "Nur ein Gedanke",
    "panel.progress.polishing": "Du polierst wie ein Profi ?",
    "panel.progress.draftsUsed": "{used} von {limit} EntwÃ¼rfen",
    "panel.examples.toggle": "Beispiele ansehen",
    "panel.examples.hide": "Beispiele ausblenden",
    "panel.card.whyZaraHelps": "Warum Zara das fÃ¼r hilfreich hÃ¤lt",
    "panel.examples.seeOne": "Beispiel ansehen",
    "panel.examples.nextExample": "NÃ¤chstes Beispiel",
    "tone.warm": "Warm",
    "tone.professional": "Professionell",
    "tone.direct": "Direkt",
    "tone.empathetic": "Empathisch",
    "button.generate": "Entwurf generieren",
    "zara.greeting": "Hallo! Ich bin Zara, deine KI-Lehrassistenz.",
    "zara.description": "I can help you with communication tips and pedagogical guidance.",
    "zara.tip.empathetic.title": "Wie man einfÃ¼hlsames Feedback schreibt",
    "zara.tip.empathetic.subtitle": "WÃ¤rme mit konstruktiver Anleitung ausbalancieren",
    "zara.tip.parent.title": "Beispiel-E-Mail-Vorlagen fÃ¼r Eltern",
    "zara.tip.parent.subtitle": "Sofort einsetzbare Vorlagen fÃ¼r hÃ¤ufige Szenarien",
    "zara.tip.difficult.title": "Tipps fÃ¼r schwierige GesprÃ¤che",
    "zara.tip.difficult.subtitle": "Herausfordernde Themen selbstbewusst meistern",
    "zara.error.title": "Da ist etwas schiefgelaufen",
    "zara.error.description": "Ich konnte deine Nachricht nicht senden. Bitte versuche es noch einmal.",
    "zara.error.authRequiredTitle": "Anmeldung erforderlich",
    "zara.error.authRequiredDescription": "Bitte melde dich an, um Zara zu nutzen.",
    "zara.button.backToMenu": "ZurÃ¼ck zum MenÃ¼",
    "zara.button.clearChat": "Chat lÃ¶schen",
    "link.privacy": "Datenschutz",
    "link.privacySafety": "Datenschutz & Sicherheit",
    "editor.welcome.title": "Willkommen bei Zaza Draft",
    "editor.welcome.warning": "Bitte verwenden Sie keine vollstÃ¤ndigen SchÃ¼lernamen, E-Mails, Telefonnummern oder Adressen.",
    "editor.welcome.learnMorePrefix": "Mehr erfahren in",
    "editor.welcome.learnMoreMiddle": "oder",
    "editor.welcome.learnMoreSuffix": ".",
    "editor.welcome.dismiss": "Verstanden",
    "editor.history.title": "KÃ¼rzliche EntwÃ¼rfe",
    "editor.history.description": "Laden Sie einen frÃ¼heren Entwurf oder entfernen Sie ihn aus der Historie.",
    "editor.history.storage": "Was wir speichern: Entwurfstext, Ton, Sprache und Zeitstempel. Keine SchÃ¼leridentifikatoren werden gespeichert.",
    "editor.history.viewData": "Ihre Daten ansehen",
    "editor.history.loading": "Verlauf wird geladen...",
    "editor.history.error": "Verlauf konnte gerade nicht geladen werden.",
    "editor.history.empty": "Noch keine EntwÃ¼rfe gespeichert.",
    "editor.history.language": "Sprache",
    "editor.history.words": "WÃ¶rter",
    "editor.history.mode": "Modus:",
    "editor.history.loadMore": "Mehr laden",
    "editor.history.action.load": "Laden",
    "editor.history.action.delete": "LÃ¶schen",
    "editor.history.pronouns": "Pronomen: {value}",
    "editor.history.subjectLabel": "Betreff",
    "editor.history.gradeLabel": "Klasse",
    "editor.placeholder.subject": "Betreff (optional)",
    "editor.placeholder.gradeLevel": "Klassenstufe (optional)",
    "editor.studentName.placeholder": "Vorname des Kindes (optional)",
    "editor.details.summaryTitle": "Optionale Details",
    "editor.details.summaryHint": "Kontext und Pronomen hinzufÃ¼gen",
    "editor.mode.label": "Modus",
    "editor.mode.helper": "WÃ¤hle deinen Nachrichtentyp",
    "editor.mode.parentMessage": "Elternnachricht",
    "editor.mode.reportComment": "Berichtskommentar",
    "editor.studentName.display": "Angezeigter Name: {name}",
    "editor.generating.message": "Entwurf wird erstellt.",
    "editor.reframeNotice": "Ich habe die Formulierung abgeschwÃ¤cht, damit sie professionell und fÃ¼r Eltern angemessen bleibt.",
    "draft.generatedTitle": "Entwurf erstellt",
    "draft.modeLabel": "Modus: {mode}",
    "draft.generatedDetails": "Erstellt in {seconds}s",
    "draft.button.copy": "In die Zwischenablage kopieren",
    "draft.button.copyShort": "Kopieren",
    "draft.button.edit": "Bearbeiten",
    "draft.button.moreActions": "Weitere Aktionen",
    "draft.button.more": "Mehr",
    "draft.action.load": "Laden",
    "draft.action.delete": "LÃ¶schen",
    "draft.actions.loadMore": "Mehr laden",
    "insights.title": "Ihr Einfluss als Lehrkraft, {name}",
    "header.insightsButtonLabel": "Meine Einblicke",
    "header.insightsButtonAria": "Meine Einblicke ansehen",
    "insights.draftsUsed": "{used} von {limit} EntwÃ¼rfen diesen Monat verwendet",
    "insights.unlimitedDrafts": "Unbegrenzte EntwÃ¼rfe",
    "insights.backToEditor": "ZurÃ¼ck zum Editor",
    "insights.mini.loading": "Fortschritt wird geladen...",
    "insights.mini.createFirstDraft": "Erstellen Sie Ihren ersten Entwurf, um Fortschritte zu sehen",
    "insights.mini.learnMore": "Mehr erfahren",
    "insights.mini.viewInsights": "Einblicke anzeigen",
    "insights.mini.viewTime": "Zeitersparnis einsehen",
    "insights.mini.viewStreak": "Streak einsehen",
    "insights.mini.viewBalance": "Wohlbefinden anzeigen",
    "insights.mini.regionLabel": "Ihre wÃ¶chentliche FortschrittsÃ¼bersicht",
    "insights.subtitle": "Einblicke, die Ihr Wachstum feiern",
    "insights.dataControl": "Ihre Daten, Ihre Kontrolle",
    "insights.downloadReport": "Bericht herunterladen",
    "insights.filter.last7": "Letzte 7 Tage",
    "insights.filter.last30": "Letzte 30 Tage",
    "insights.filter.last90": "Letzte 90 Tage",
    "insights.timeSaved.title": "Gesparte Zeit",
    "insights.timeSaved.hours": "{hours} Stunden",
    "insights.timeSaved.thisWeek": "Diese Woche",
    "insights.timeSaved.trend": "+{percent}% seit letzter Woche",
    "insights.timeSaved.tooltip":
      "Basierend auf 12 Minuten Grundlinie pro Entwurf (NCES 2020 Studie). Wir berechnen die gesparte Zeit, indem wir Ihre Entwurfserstellungszeit mit der durchschnittlichen Zeit vergleichen, die LehrkrÃ¤fte fÃ¼r Ã¤hnliche Kommunikation aufwenden.",
    "insights.timeSaved.context": "Das sind {count} E-Mails weniger am Sonntagabend!",
    "insights.draftsCreated.title": "Erstellte EntwÃ¼rfe",
    "insights.draftsCreated.value": "{count} EntwÃ¼rfe",
    "insights.draftsCreated.subtitle": "{used} von {total} ohne Bearbeitung verwendet",
    "insights.draftsCreated.tooltip":
      "Ihre Trefferquote zeigt, wie oft Sie EntwÃ¼rfe ohne grÃ¶ÃŸere Bearbeitungen verwenden. HÃ¶here Raten zeigen, dass Zara Ihre Stimme lernt!",
    "insights.currentStreak.title": "Aktuelle Serie",
    "insights.currentStreak.days": "{count} Tage",
    "insights.currentStreak.subtitle": "Weiter so!",
    "insights.currentStreak.tooltip":
      "Aufeinanderfolgende Tage mit Zaza Draft. Konsistenz hilft Zara, Ihren Kommunikationsstil besser zu lernen!",
    "insights.qualityScore.title": "QualitÃ¤tsbewertung",
    "insights.qualityScore.value": "{score}/100",
    "insights.qualityScore.subtitle": "Bearbeitungstiefe",
    "insights.qualityScore.trend": "+{points} Punkte diesen Monat",
    "insights.qualityScore.tooltip":
      "Basierend darauf, wie viel Sie EntwÃ¼rfe bearbeiten. HÃ¶here Werte bedeuten, dass Zara Ihrer natÃ¼rlichen Stimme nÃ¤her kommt.",
    "insights.heatmap.title": "Wann Sie am besten entwerfen",
    "insights.heatmap.insight":
      "Dienstagnachmittage sind Ihre produktivste Zeit - erwÃ¤gen Sie, diese Zeit zu blockieren!",
    "insights.heatmap.warning": "Wochenendarbeit: {count} EntwÃ¼rfe",
    "insights.toneDistribution.title": "Ihr Kommunikationsstil",
    "insights.toneDistribution.insight":
      "Sie haben 'Empathisch' {percent}% hÃ¤ufiger in schwierigen GesprÃ¤chen verwendet",
    "insights.confidence.title": "Ihre Wachstumsreise",
    "insights.confidence.insight":
      "Wachsendes Vertrauen! Ihre EntwÃ¼rfe benÃ¶tigen im Laufe der Zeit weniger Bearbeitung.",
    "insights.confidence.tooltipLabel": "Vertrauen",
    "insights.badges.title": "Freigeschaltete Erfolge",
    "insights.badge.timeReclaimed": "Zeit zurÃ¼ckgewonnen - Bronze",
    "insights.badge.timeReclaimed.desc": "2+ Stunden mit KI-UnterstÃ¼tzung gespart",
    "insights.badge.weekStreak": "{count}-Wochen-Serie",
    "insights.badge.weekStreak.desc": "Zaza Draft {count} aufeinanderfolgende Wochen genutzt",
    "insights.badge.toneMaster": "Ton-Meister",
    "insights.badge.toneMaster.desc": "Alle 4 KommunikationstÃ¶ne verwendet",
    "insights.badge.multilingual": "Mehrsprachiger Champion",
    "insights.badge.multilingual.desc": "EntwÃ¼rfe in 3+ Sprachen erstellt",
    "insights.badge.oneShot": "Treffer beim ersten Versuch",
    "insights.badge.oneShot.desc": "90% Erfolgsquote beim ersten Entwurf",
    "insights.badge.weekendWarrior": "Wochenendkrieger im Ruhestand",
    "insights.badge.weekendWarrior.desc": "Null Wochenend-EntwÃ¼rfe fÃ¼r 4 Wochen",
    "insights.badge.earned": "Verdient",
    "insights.badge.inProgress": "In Arbeit",
    "insights.badge.locked": "Gesperrt",
    "insights.wellbeing.title": "Ihr Wohlbefinden zÃ¤hlt",
    "insights.wellbeing.toggle": "Wohlbefindenseinsichten anzeigen",
    "insights.wellbeing.afterHours": "Nachtstunden-Entwurf: {percent}%",
    "insights.wellbeing.healthyBoundary": "Gesunde Grenze",
    "insights.wellbeing.afterHours.desc":
      "Sie haben diese Woche {count} Mal nach 22 Uhr entworfen. Ãœberlegen Sie diese Zeitersparnis-Strategien:",
    "insights.wellbeing.learnBoundaries": "Ãœber Grenzen erfahren",
    "insights.wellbeing.workLife": "Work-Life-Balance-Score",
    "insights.wellbeing.weekendProtection": "Wochenendschutz",
    "insights.wellbeing.eveningBoundaries": "Abendgrenzen",
    "insights.wellbeing.consecutiveDays": "Aufeinanderfolgende Tage",
    "wellbeing.tip.welcome": "Willkommen! Zara lernt Ihre Muster und gibt Ihnen nach und nach persÃ¶nliche Tipps.",
    "wellbeing.tip.weekendHealthy": "Wochenend-Entwurf #{count}. Toll, dass Sie Ihre Grenzen schÃ¼tzen!",
    "wellbeing.tip.momentumBreak": "Sie haben heute {count} Nachrichten verfasst. Spitzenleistung! Denken Sie an eine kurze Pause?",
    "wellbeing.tip.confidenceGrowing": "Ihre Bearbeitungstiefe ist diesen Monat um {percent}% gesunken. Das zeigt wachsende Sicherheit!",
    "wellbeing.tip.eveningSuggestion": "Abends aktiv? Ihre besten EntwÃ¼rfe entstehen meist am Nachmittag.",
    "wellbeing.tip.peakFlow": "Sie sind im Flow! Dienstagnachmittage sind Ihre StÃ¤rke.",
    "wellbeing.tip.timeCelebration": "Sie haben diese Woche {hours}h gespart. Wichtige Zeit fÃ¼r Sie selbst.",
    "wellbeing.tip.default": "Tipp: Beginnen Sie mit dem Ton \"EinfÃ¼hlsam\", um Wiederholungen zu vermeiden.",
    "wellbeing.dismiss": "Hinweis verwerfen",
    "wellbeing.tip.label": "Hinweis",
    "deescalation.title": "Beruhigt und professionell",
    "deescalation.description": "Ich habe ein paar emotional aufgeladene Formulierungen entschÃ¤rft, damit die Nachricht sicher und wirkungsvoll bleibt.",
    "deescalation.button.show": "Ã„nderungen anzeigen",
    "deescalation.button.hide": "Ã„nderungen ausblenden",
    "deescalation.diff.original": "Original:",
    "deescalation.diff.suggestion": "Beruhigte Alternative:",
    "insights.suggestions.title": "Personalisierte Empfehlungen",
    "insights.suggestion.empathetic.title": "Versuchen Sie zuerst den 'Empathischen' Ton",
    "insights.suggestion.empathetic.desc":
      "Sie regenerieren oft bei Eltern-E-Mails. Der 'Empathische' Ton zuerst kÃ¶nnte Ihnen Zeit sparen.",
    "insights.suggestion.empathetic.cta": "Einstellungen aktualisieren",
    "insights.suggestion.wednesday.title": "SchÃ¼tzen Sie Ihren Mittwoch-Flow",
    "insights.suggestion.wednesday.desc":
      "Ihre Mittwoch-EntwÃ¼rfe haben 50% weniger Bearbeitungen. ErwÃ¤gen Sie, schweres Schreiben dann zu planen.",
    "insights.suggestion.wednesday.cta": "Erinnerung setzen",
    "insights.suggestion.reminder.modalHint":
      "Waehlen Sie, wie dieser Fokuszeitraum in Ihrem Kalender bleibt.",
    "insights.suggestion.reminder.modalFootnote":
      "Sie koennen die Erinnerung jederzeit in Ihrem Kalender bearbeiten oder loeschen.",
    "insights.suggestion.reminder.nextEvent": "Naechstes Ereignis",
    "insights.suggestion.reminder.openCalendar": "Google Kalender oeffnen",
    "insights.suggestion.reminder.downloadIcs": ".ics herunterladen",
    "insights.suggestion.classBrain.title": "Klassengehirn freischalten",
    "insights.suggestion.classBrain.desc": "FÃ¼gen Sie SchÃ¼lerkontext hinzu, um Ihre Trefferquote um 35% zu erhÃ¶hen",
    "insights.suggestion.classBrain.cta": "Los geht's",
    "insights.suggestion.reminderToastTitle": "Erinnerungen bald verfÃ¼gbar",
    "insights.suggestion.reminderToastDescription": "Wir bauen Termin-Erinnerungen, damit Sie sich auf das Unterrichten konzentrieren kÃ¶nnen.",
    "insights.suggestion.badge.new": "NEU",
    "insights.dataControls.title": "Datenkontrollen",
    "insights.dataControls.shareData": "Anonymisierte Daten teilen, um Zaza zu verbessern",
    "insights.dataControls.helpTeachers": "Helfen Sie, Zaza fÃ¼r 1.000+ LehrkrÃ¤fte weltweit zu verbessern",
    "insights.dataControls.collect.title": "Was wir sammeln",
    "insights.dataControls.collect.timestamps": "Zeitstempel, wann Sie entwerfen",
    "insights.dataControls.collect.tones": "Ihre gewÃ¤hlten Tonauswahlen",
    "settings.preferences.tagline": "Personalisierte Kontrolle",
    "settings.preferences.title": "Einstellungen",
    "settings.preferences.description":
      "Behalte deine wichtigsten Voreinstellungen an einem Ort. Wir halten schwerere Ã„nderungen bis zum nÃ¤chsten Release zurÃ¼ck, aber du kannst jederzeit zum Entwurf zurÃ¼ckkehren und weiter schreiben.",
    "settings.preferences.footerNote":
      "Gespeicherte Kontexte bleiben auf diesem GerÃ¤t, solange du sie nicht in ein geteiltes Dokument kopierst. Die oben genannten Sicherheitsrichtlinien halten sensible Details aus dem Class Brain fern.",
    "settings.backToDraft": "ZurÃ¼ck zum Entwurf",
    "settings.cards.toneDefaults.title": "Ton-Voreinstellungen",
    "settings.cards.toneDefaults.description":
      "Tonsteuerungen werden freigeschaltet, sobald wir deine Ton-Historie einbinden. Bis dahin Ã¼bernehmen wir den im Editor gewÃ¤hlten Ton.",
    "settings.cards.language.title": "Sprache",
    "settings.cards.language.description":
      "Sprachvoreinstellungen orientieren sich an deinem letzten Dokument und Ã¼bertragen sich automatisch auf neue EntwÃ¼rfe.",
    "settings.cards.signature.title": "Signatur",
    "settings.cards.signature.preview": "Vorschau",
    "settings.cards.signature.empty": "Noch keine Signatur hinterlegt.",
    "settings.cards.signature.description":
      "Die Signaturbearbeitung erscheint mit der nÃ¤chsten Exportphase. Bis dahin bleibt die Vorschau schreibgeschÃ¼tzt.",
    "settings.lockedBadge": "Gesichert",
    "settings.cards.safeguard.title": "Schutzvorgaben",
    "settings.cards.safeguard.subhead": "Was wir schÃ¼tzen",
    "settings.cards.safeguard.list.1":
      "Wir speichern niemals vollstÃ¤ndige SchÃ¼lernamen oder Identifikatoren ohne deine ausdrÃ¼ckliche Erlaubnis.",
    "settings.cards.safeguard.list.2":
      "Sensible AnhÃ¤nge, private Adressen und Kontaktinformationen bleiben tabu.",
    "settings.cards.safeguard.list.3":
      "Die anonymisierte Datenteilung lÃ¤sst sich im Einblicke-Panel an- oder ausschalten.",
    "settings.cards.safeguard.footer":
      "Diese Vorgaben gelten automatisch. Falls du strengere Schutzmechanismen brauchst, wende dich Ã¼ber das Support-MenÃ¼ im Editor an uns.",
    "classBrain.label": "Class Brain",
    "classBrain.title": "Dein Class Brain aufbauen",
    "classBrain.backToDraft": "ZurÃ¼ck zum Entwurf",
    "classBrain.description":
      "Class Brain speichert sicheren Kontext zu deinen SchÃ¼ler:innen, sodass der Assistent {name}s Klasse versteht, bevor du schreibst. Teile die wichtigsten Erfolge, Ziele und den gewÃ¼nschten Ton.",
    "classBrain.tooltip":
      "Class Brain bewahrt diesen Kontext im Browser, damit der Assistent deine Ziele erkennt, ohne sensible Daten zu speichern.",
    "classBrain.sections.whatItIs.title": "Was das ist",
    "classBrain.sections.whatItIs.body":
      "Eine leichte Wissensbasis fÃ¼r die SchÃ¼ler:innen und Fokusbereiche, die du am hÃ¤ufigsten unterrichtest. Class Brain hÃ¤lt diesen Kontext bereit, damit jede Gruppe deine Klasse einordnen kann.",
    "classBrain.sections.whatItIs.subtext":
      "Finde den richtigen Ton und das passende GerÃ¼st, ohne das Setup jedes Mal neu zu erklÃ¤ren.",
    "classBrain.sections.whatToAdd.title": "Was du hinzufÃ¼gen kannst",
    "classBrain.add.grade": "Klassenstufe oder Kurs, fÃ¼r den du schreibst.",
    "classBrain.add.mood": "Stimmung, Tempo oder wiederkehrende Themen deiner Klasse.",
    "classBrain.add.goals": "Ziele der SchÃ¼ler:innen (z.?B. einen Standard meistern oder Selbstvertrauen stÃ¤rken).",
    "classBrain.sections.whatNotToAdd.title": "Was du nicht hinzufÃ¼gen solltest",
    "classBrain.notAdd.noNames": "Keine vollstÃ¤ndigen SchÃ¼lernamen, IDs oder Kontaktdaten.",
    "classBrain.notAdd.noSensitive": "Vermeide medizinische Details, Disziplinarberichte oder sensible Daten.",
    "classBrain.notAdd.noOpinions": "Keine persÃ¶nlichen Meinungen zu einzelnen Personen.",
    "classBrain.savedContext.title": "Dein gespeicherter Kontext",
    "classBrain.savedContext.storedLocally": "Lokal gespeichert",
    "classBrain.savedContext.tagline": "Sicher, bearbeitbar und lokal gespeichert",
    "classBrain.textarea.placeholder":
      "z.?B. â€žBio-Kurs zur Zellatmung. Die Klasse bereitet sich im Mai auf die AbschlussprÃ¼fung vor und ist engagiert, aber leicht angespannt.â€œ",
    "classBrain.textarea.helper": "Speichere eine kurze Erinnerung (keine Namen), die die nÃ¤chste Schreibsession vorbereitet.",
    "classBrain.stats.characters": "{count}/{max} Zeichen",
    "classBrain.stats.words": "{count} WÃ¶rter",
    "classBrain.lastSaved": "Zuletzt gespeichert: {time}",
    "classBrain.saveContext": "Kontext speichern",
    "classBrain.footerNote":
      "Gespeicherte Kontexte bleiben auf diesem GerÃ¤t, solange du sie nicht in ein geteiltes Dokument kopierst. Die oben genannten Sicherheitsrichtlinien halten sensible Details aus dem Class Brain fern.",
    "classBrain.toast.title": "Kontext gespeichert",
    "classBrain.toast.description": "Class Brain erinnert sich lokal an diesen Kontext fÃ¼r deine nÃ¤chste Sitzung.",
    "insights.dataControls.collect.editPatterns": "Bearbeitungsmuster (wie viel Sie Ã¤ndern)",
    "insights.dataControls.collect.performance": "Generierungszeit und Leistung",
    "insights.dataControls.collect.languages": "Sprachen, in denen Sie schreiben",
    "insights.dataControls.neverCollect.title": "Was wir NIEMALS sammeln",
    "insights.dataControls.neverCollect.content": "TatsÃ¤chlicher Nachrichtentext oder Inhalt",
    "insights.dataControls.neverCollect.students": "SchÃ¼lernamen oder Identifikatoren",
    "insights.dataControls.neverCollect.parents": "Eltern-Kontaktinformationen",
    "insights.dataControls.neverCollect.school": "Schul- oder Bezirksdetails",
    "insights.dataControls.neverCollect.pii": "Alle personenbezogenen Informationen",
    "insights.dataControls.benefits.title": "Wie dies Ihnen hilft",
    "insights.dataControls.benefits.toneSuggestions": "Bessere TonvorschlÃ¤ge",
    "insights.dataControls.benefits.toneSuggestions.desc":
      "Erfahren Sie, welche TÃ¶ne fÃ¼r verschiedene Situationen am besten funktionieren",
    "insights.dataControls.benefits.fasterGeneration": "Schnellere Generierung",
    "insights.dataControls.benefits.fasterGeneration.desc": "Leistung basierend auf Nutzungsmustern optimieren",
    "insights.dataControls.benefits.catchIssues": "Probleme frÃ¼hzeitig erkennen",
    "insights.dataControls.benefits.catchIssues.desc": "Probleme identifizieren und beheben, bevor sie Sie betreffen",
    "insights.dataControls.benefits.buildFeatures": "BenÃ¶tigte Funktionen erstellen",
    "insights.dataControls.benefits.buildFeatures.desc": "Priorisieren Sie, was LehrkrÃ¤fte tatsÃ¤chlich verwenden",
    "insights.dataControls.downloadData": "Meine Daten herunterladen (CSV)",
    "insights.dataControls.privacySettings": "Datenschutzeinstellungen",
    "insights.dataControls.privacyNote": "Wir geben niemals SchÃ¼lerinformationen weiter. {link}",
    "insights.dataControls.learnMore": "Erfahren Sie mehr Ã¼ber unsere Datenschutzpraktiken",
    "editor.outOfScope.title": "Nicht generiert",
    "editor.outOfScope.body":
      "Das sieht nicht wie eine Elternnachricht oder ein Berichtskommentar aus. Zaza Draft hilft Ihnen bei professioneller schulischer Kommunikation.",
    "editor.outOfScope.helper": "Passen Sie den Text an oder fÃ¼gen Sie Kontext hinzu und versuchen Sie es erneut.",
    "editor.notice.scopeGuard.title": "Nicht generiert",
    "editor.notice.scopeGuard.subtext":
      "Das sieht nicht wie eine Elternnachricht oder ein Berichtskommentar aus. Zaza Draft hilft Ihnen bei professioneller schulischer Kommunikation.",
    "insights.badge.progress": "Fortschritt",
    "insights.heatmap.tooltipText": "AktivitÃ¤ts-Heatmap zeigt Ihre produktivsten Entwurfszeiten",
    "insights.heatmap.mon": "Mo",
    "insights.heatmap.tue": "Di",
    "insights.heatmap.wed": "Mi",
    "insights.heatmap.thu": "Do",
    "insights.heatmap.fri": "Fr",
    "insights.heatmap.sat": "Sa",
    "insights.heatmap.sun": "So",
    "insights.confidence.yAxisLabel": "Vertrauensniveau (%)",
    "account.menu.userMenu": "User menu",
    "account.menu.accountSettings": "Account settings",
    "account.menu.myData": "My data / Export",
    "account.menu.privacySafety": "Privacy & safety",
    "account.menu.helpSupport": "Help / Support",
    "account.menu.logout": "Log out",
    "account.title": "Account Settings",
    "account.backToApp": "Back to app",
    "account.backToAccount": "Back to account",
    "account.profile.title": "Profile",
    "account.profile.description": "Manage your personal information",
    "account.profile.photoLabel": "Profile Photo",
    "account.profile.uploadPhoto": "Upload Photo",
    "account.profile.removePhoto": "Remove Photo",
    "account.profile.photoHelper": "JPG, PNG or WebP. Max 5MB.",
    "account.profile.photoPrivacy": "Profile photos are optional and only visible to you.",
    "account.profile.invalidFileType": "Please upload a JPG, PNG, or WebP image.",
    "account.profile.fileTooLarge": "File size must be less than 5MB.",
    "account.profile.nameLabel": "Name",
    "account.profile.emailLabel": "Email",
    "account.profile.emailReadonly": "Email cannot be changed",
    "account.profile.saveChanges": "Save changes",
    "account.profile.saveSuccess": "Profil gespeichert.",
    "account.profile.saveError": "Profil konnte nicht gespeichert werden.",
    "account.session.title": "Session",
    "account.session.description": "Manage your current session",
    "account.billing.title": "Abrechnung & Abo",
    "account.billing.description": "Verwalte dein Abo, Nutzung und Zahlungseinstellungen.",
    "account.billing.planLabel": "Plan",
    "account.billing.planFree": "Kostenlos",
    "account.billing.planPro": "Draft Pro",
    "account.billing.status": "Status",
    "account.billing.usage": "Nutzung",
    "account.billing.unlimitedDrafts": "Unbegrenzte EntwÃ¼rfe",
    "account.billing.upgrade": "Upgrade auf Draft Pro",
    "account.billing.manage": "Abo verwalten",
    "account.billing.paywallMessage": "Dein Gratis-Limit ist erreicht. Upgrade fÃ¼r unbegrenzte EntwÃ¼rfe.",
    "account.billing.upgradeButton": "Draft Pro freischalten",
    "account.session.logout": "Log out",
    "account.data.title": "My Data",
    "account.data.export.title": "Export Your Data",
    "account.data.export.description": "Download your data in various formats",
    "account.data.export.csvButton": "Export as CSV",
    "account.data.export.allDataButton": "Download all data",
    "account.data.delete.title": "Delete Account",
    "account.data.delete.description": "Permanently delete your account and all associated data",
    "account.data.delete.button": "Delete my account",
    "account.data.delete.comingSoon": "Coming soon",
    "account.privacy.title": "Privacy & Safety",
    "account.privacy.sharing.title": "Anonymised Data Sharing",
    "account.privacy.sharing.description": "Help us improve Zaza Draft by sharing anonymised usage data",
    "account.privacy.sharing.label": "Share anonymised data",
    "account.privacy.collect.title": "What We Collect",
    "account.privacy.collect.item1": "Usage patterns and feature interactions",
    "account.privacy.collect.item2": "Technical performance metrics",
    "account.privacy.collect.item3": "General usage statistics",
    "account.privacy.collect.item4": "Feature preferences",
    "account.privacy.neverCollect.title": "What We NEVER Collect",
    "account.privacy.neverCollect.item1": "Your document content or text",
    "account.privacy.neverCollect.item2": "Student names or personal information",
    "account.privacy.neverCollect.item3": "School or class details",
    "account.privacy.neverCollect.item4": "Any identifiable information about students",
    "account.privacy.policyLink": "Read our full privacy policy",
    "support.title": "Hilfe & Support",
    "support.description": "Hilfe bei Zaza Draft",
    "support.guides.title": "LeitfÃ¤den",
    "support.guides.description": "Lernen Sie bewÃ¤hrte Praktiken und Unterrichtsstrategien",
    "support.guides.button": "Anleitungen suchen",
    "support.community.title": "Community-Forum",
    "support.community.description": "Tauschen Sie sich mit anderen LehrkrÃ¤ften aus",
    "support.community.button": "Community beitreten",
    "support.getHelp.title": "Hilfe erhalten",
    "support.getHelp.description": "Finden Sie Antworten auf hÃ¤ufige Fragen",
    "support.getHelp.button": "Hilfeseiten durchsuchen",
    "support.contact.title": "Support kontaktieren",
    "support.contact.description": "Treten Sie mit unserem Support-Team in Kontakt",
    "support.contact.button": "Kontakt aufnehmen",
  },
};

function normaliseMessages(messages?: LocaleMessages): NormalizedMessages {
  if (!messages) return {}
  const uiEntries = typeof messages.ui === "object" && messages.ui ? messages.ui : {}
  const merged = { ...uiEntries, ...messages }
  const normalized: NormalizedMessages = {}
  Object.entries(merged).forEach(([key, value]) => {
    if (key === "ui") return
    if (typeof value === "string") {
      normalized[key] = value
      return
    }
    if (
      typeof value === "object" &&
      value !== null &&
      "one" in value &&
      "other" in value &&
      typeof (value as PluralMessage).one === "string" &&
      typeof (value as PluralMessage).other === "string"
    ) {
      normalized[key] = value as PluralMessage
    }
  })
  return normalized
}

const normalizedLocaleMessages: Record<Locale, NormalizedMessages> = {
  "en-GB": normaliseMessages(localeMessages["en-GB"]),
  "en-US": normaliseMessages(localeMessages["en-US"]),
  "de-DE": normaliseMessages(localeMessages["de-DE"]),
}

const EN_GB_NORMALIZED = normalizedLocaleMessages["en-GB"] ?? {}
const EN_US_NORMALIZED = normalizedLocaleMessages["en-US"] ?? {}
const DE_NORMALIZED = normalizedLocaleMessages["de-DE"] ?? {}

function getNormalizedLocale(locale: string): Locale {
  if (!locale) return DEFAULT_LOCALE
  const normalized = locale.trim().replace(/_/g, "-").toLowerCase()
  if (normalized.startsWith("de")) {
    return "de-DE"
  }
  if (normalized.includes("en-us")) {
    return "en-US"
  }
  if (normalized.startsWith("en")) {
    return "en-GB"
  }
  return DEFAULT_LOCALE
}

function getLocaleMessages(locale: string): NormalizedMessages {
  const canonical = getNormalizedLocale(locale)
  if (canonical === "en-GB") {
    return { ...EN_US_NORMALIZED, ...EN_GB_NORMALIZED }
  }
  if (canonical === "en-US") {
    return { ...EN_US_NORMALIZED }
  }
  if (canonical === "de-DE") {
    return { ...DE_NORMALIZED }
  }
  return { ...EN_US_NORMALIZED, ...EN_GB_NORMALIZED }
}
const DEFAULT_LOCALE: Locale = "en-GB"

export function resolveLocale(raw?: string | null): Locale {
  if (!raw) {
    return DEFAULT_LOCALE
  }
  return getNormalizedLocale(raw)
}

function normalizeDashes(text: string): string {
  return text.replace(/[\u2013\u2014]/g, "-")
}

function getBrowserLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE
  return resolveLocale(navigator.language)
}

interface LocaleContextValue {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, vars?: Record<string, string | number>) => string
  formatDate: (date: Date, options?: Intl.DateTimeFormatOptions) => string
  formatNumber: (num: number, options?: Intl.NumberFormatOptions) => string
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error("useLocale must be used within a LanguageProvider")
  }
  return context
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return DEFAULT_LOCALE
    const saved = localStorage.getItem("zaza.lang")
    if (saved) {
      return resolveLocale(saved)
    }
    return getBrowserLocale()
  })

  useEffect(() => {
    localStorage.setItem("zaza.lang", locale)
  }, [locale])

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(resolveLocale(newLocale))
  }, [])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const messages = getLocaleMessages(locale)
      const fallbackCandidates: (NormalizedMessages | undefined)[] = [
        messages,
        normalizedLocaleMessages["en-GB"],
        normalizedLocaleMessages["en-US"],
        normalizedLocaleMessages["de-DE"],
      ]
      const message = fallbackCandidates.reduce(
        (found, current) => found ?? current?.[key],
        undefined as string | PluralMessage | undefined,
      )
      const missingKey = typeof message === "undefined"
      if (missingKey) {
        const placeholder =
          process.env.NODE_ENV !== "production" ? `[[missing:${key}]]` : key
        return placeholder
      }

      const resolvedMessage = message ?? key

      let text: string
      if (typeof resolvedMessage === "object" && "one" in resolvedMessage && "other" in resolvedMessage) {
        const count = vars?.count as number
        text = count === 1 ? resolvedMessage.one : resolvedMessage.other
      } else {
        text = String(resolvedMessage)
      }

      text = normalizeDashes(text)

      if (vars) {
        Object.entries(vars).forEach(([varKey, value]) => {
          text = text.replace(new RegExp(`\\{${varKey}\\}`, "g"), String(value))
        })
      }

      return text
    },
    [locale],
  )

  const formatDate = useCallback(
    (date: Date, options?: Intl.DateTimeFormatOptions): string => {
      return new Intl.DateTimeFormat(locale, options).format(date)
    },
    [locale],
  )

  const formatNumber = useCallback(
    (num: number, options?: Intl.NumberFormatOptions): string => {
      return new Intl.NumberFormat(locale, options).format(num)
    },
    [locale],
  )

  const value: LocaleContextValue = {
    locale,
    setLocale,
    t,
    formatDate,
    formatNumber,
  }

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}























