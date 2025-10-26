# Zaza Draft - Product Requirements Document

**Version:** 2.0  
**Last Updated:** October 6, 2025  
**Document Owner:** Product Team  
**Status:** Ready for Development

---

## Executive Summary

Zaza Draft is an AI-powered educator productivity platform designed to transform how K-12 teachers handle written communications. By leveraging advanced language models and education-specific context, we reduce the time and emotional burden of repetitive parent communications, report writing, and student feedback while maintaining professionalism and personalization.

**Market Opportunity:** K-12 teachers spend 5-10 hours weekly on written communications, with 73% reporting communication-related burnout.

**Solution:** AI-assisted snippet generation with tone control, multilingual support, and context-aware personalization.

**Business Model:** Freemium SaaS with institutional licensing options.

---

## 1. Product Vision & Strategy

### 1.1 Vision Statement

To become the indispensable daily companion for K-12 educators worldwide, trusted to amplify educator impact, reduce communication fatigue, and support positive learning outcomes across diverse school contexts.

### 1.2 Mission

Transform the teaching experience by eliminating the burden of repetitive, emotionally fraught, and time-consuming written communications through AI-powered assistance that respects educator expertise and maintains authentic teacher voice.

### 1.3 Core Value Propositions

**For Teachers:**
- Save 3-5 hours weekly on written communications
- Reduce emotional labor of difficult parent conversations
- Maintain professional, personalized tone consistently
- Break through language barriers with multilingual output
- Build confidence in written communication quality

**For Schools/Districts:**
- Improve school-family communication consistency
- Support teacher retention and satisfaction
- Ensure compliance-ready documentation
- Gain insights into communication patterns and needs

### 1.4 Success Metrics

**Primary KPIs (MVP Phase):**
- Monthly Active Users (MAU): 1,000 in first 90 days
- User Activation Rate: >40% (complete onboarding + generate 3+ snippets)
- Weekly Active User Rate: >25% of activated users
- Net Promoter Score (NPS): >50
- Average time saved per user: >30 minutes/week (self-reported)

**Secondary Metrics:**
- Freemium conversion rate: >5% within 90 days
- Snippet generation success rate: >85% (user keeps generated text)
- Feature usage: Edit rate <30% (indicates quality)
- Retention: 30-day retention >40%

**Post-MVP Metrics:**
- Institutional adoption: 10+ schools/districts by Month 6
- Premium feature engagement: >60% of Pro users
- Community sharing: >100 public snippets by Month 6

---

## 2. Target Users & Market Segmentation

### 2.1 Primary User Personas

**Persona 1: Elementary School Teacher (Sarah)**
- **Demographics:** 28-45 years old, 3-15 years teaching experience
- **Context:** 20-25 students, diverse family backgrounds, frequent parent communications
- **Pain Points:**
  - Writes 10-15 parent emails weekly
  - Quarterly report cards with 20+ individualized comments
  - Language barriers with non-English speaking families
  - Anxiety around difficult conversations (behavioral issues, academic concerns)
  - Limited time during school day for communication tasks
- **Goals:**
  - Respond to parent emails within 24 hours
  - Write personalized, professional reports efficiently
  - Communicate clearly with all families regardless of language
  - Reduce evening/weekend work hours
- **Technology Comfort:** Moderate (uses Google Classroom, email, basic apps)

**Persona 2: Middle/High School Teacher (Marcus)**
- **Demographics:** 30-50 years old, 5-20 years teaching experience
- **Context:** 100-150 students across multiple classes, less frequent but more formal communications
- **Pain Points:**
  - Progress reports for large student caseload
  - Recommendation letters (5-20 annually)
  - Formal incident documentation
  - Parent conference preparation notes
  - Maintaining consistent tone across many communications
- **Goals:**
  - Scale personalized communication despite high student load
  - Meet documentation deadlines efficiently
  - Maintain professional standards with minimal editing
- **Technology Comfort:** Moderate to high

**Persona 3: Special Education Teacher/Counselor (Priya)**
- **Demographics:** 30-55 years old, specialized certification
- **Context:** 10-30 students, intensive documentation requirements, sensitive communications
- **Pain Points:**
  - IEP progress reports (legally required, detailed)
  - Crisis communication with families
  - Compliance documentation standards
  - Coordinating with multiple stakeholders
  - Emotional weight of difficult conversations
- **Goals:**
  - Ensure compliance with documentation requirements
  - Communicate sensitively about challenging topics
  - Save time on repetitive reporting
  - Maintain accuracy in specialized terminology
- **Technology Comfort:** Moderate

### 2.2 Secondary Audiences

**School Administrators:**
- **Needs:** Monitor communication quality, ensure compliance, support teacher efficiency
- **Use Cases:** Institutional adoption decisions, usage analytics, professional development integration

**Parents & Families:**
- **Needs:** Clear, timely, respectful communication from teachers
- **Impact:** Improved communication quality and consistency benefits parent engagement

### 2.3 User Acquisition Strategy

**Primary Channels:**
- **Organic:** Teacher communities (Reddit r/Teachers, Facebook groups), EdTech Twitter/LinkedIn
- **Content Marketing:** Teacher productivity blogs, time-saving strategies, communication templates
- **Partnerships:** EdTech conference presence, teacher training organizations
- **Referral Program:** Teacher-to-teacher referrals with incentives
- **Institutional:** Direct outreach to district EdTech directors

**Secondary Channels:**
- Paid social (Facebook/Instagram teacher groups)
- Google Search (teacher productivity keywords)
- YouTube (teacher productivity/EdTech channels)

---

## 3. MVP Feature Specifications

### 3.1 Core User Flows

**Flow 1: New User Onboarding (Psychological Anchoring)**
1. Landing page → Sign up (Google SSO or email/password)
2. **Emotional Hook Screen:** "What's your biggest communication challenge?"
   - Options: "Writing report cards," "Difficult parent conversations," "Finding the right words," "Time pressure," "Language barriers"
   - User selects → Instant empathy + promise of relief
3. **Instant Relief Demo:** Based on selection, show AI generating a relevant snippet in real-time
   - User watches their specific pain point being solved (15-20 seconds)
   - "See? We get it. Let's save you hours each week."
4. Quick profile setup (grade level, subjects taught, school type)
   - Framed as "Help us personalize your experience"
5. Optional: Add first class/student context
   - Positioned as "Make your snippets even more personal"
6. **First Real Snippet:** User generates their own snippet with guided prompts
   - Success celebration with time-saved estimate
7. Dashboard landing with clear next steps

**Success Criteria:** >75% of signups complete onboarding, <3 minutes to emotional buy-in, >60% generate their first real snippet

**Flow 2: Generate Communication Snippet**
1. User enters prompt describing communication need
2. User selects tone (Warm & Encouraging, Professional & Neutral, Direct & Clear, Empathetic & Supportive)
3. User selects output language (default: English)
4. Optional: Select student/class context for personalization
5. Click "Generate"
6. Preview generated snippet in card format
7. User actions: Copy, Edit, Save to Library, Delete, Regenerate
8. If saved: Add tags, assign to student/class
9. Freemium gate: "X prompts remaining this month" indicator

**Success Criteria:** <10 seconds generation time, <30% edit rate, >70% save/copy rate

**Flow 3: Snippet Library Management**
1. Navigate to "My Snippets" library
2. Filter by: tags, tone, language, student, date range
3. Search by keyword
4. View snippet card with metadata
5. Actions: Edit, Delete, Export, Share (post-MVP)
6. Bulk actions: Select multiple → Export as PDF/CSV

**Success Criteria:** >50% of users return to library, average 5+ saved snippets per active user

### 3.2 Feature Specifications

#### 3.2.1 Authentication & User Management

**Requirements:**
- Firebase email/password authentication (primary)
- Google OAuth 2.0 integration (optional, for user convenience)
- Password reset via email
- Email verification for new accounts
- Session management (30-day persistent login)
- Unified Zaza account (works across Draft, Teach, and all Zaza apps)

**Authentication Priority (per Cursor Rules):**
1. **Primary:** Email/password via Firebase Auth
2. **Optional:** Google SSO for streamlined signup
3. **Rationale:** Email/password ensures maximum compatibility across all devices and eliminates OAuth dependencies

**User Profile Fields:**
- Name (required)
- Email (required, unique)
- School/District name (optional)
- Grade levels taught (multi-select)
- Subjects taught (multi-select)
- Preferred UI language
- Timezone
- Account type (Free/Pro)
- Zaza ecosystem preferences (opt-in for Teach, Zara, etc.)
- Created date
- Last active date

**Acceptance Criteria:**
- User can sign up with email/password within 60 seconds
- Google SSO works seamlessly as optional method
- Password meets security requirements (8+ characters, mixed case, number, special char)
- Profile changes save immediately with confirmation
- Email verification required before full access
- Single Zaza account works across all apps

#### 3.2.2 Prompt Input Interface

**Requirements:**
- Text area with 2,000 character limit
- Character counter display
- Placeholder text with example prompts
- "Quick start" prompt templates dropdown (5-7 common scenarios)
- Real-time validation and error messaging

**Example Prompt Templates:**
- "Parent email: Update on [student]'s progress in [subject]"
- "Report card comment: [Student]'s strengths and growth areas"
- "Behavioral incident: Documenting [describe situation]"
- "Parent conference prep: Key talking points for [student]"

**Acceptance Criteria:**
- Prompt input is always visible above fold
- Templates populate with single click
- Validation prevents empty/too-short submissions
- Interface is mobile-responsive

#### 3.2.3 Tone Selection

**Required Tone Options:**
1. **Warm & Encouraging** - Celebrates progress, growth-focused, supportive language
2. **Professional & Neutral** - Objective, formal, documentation-appropriate
3. **Direct & Clear** - Straightforward, concise, action-oriented
4. **Empathetic & Supportive** - Sensitive topics, difficult conversations, compassionate

**UI Requirements:**
- Radio button or dropdown selection
- Tone descriptions visible on hover/tap
- Default: Professional & Neutral
- Tone selection persists for session

**Acceptance Criteria:**
- Tone meaningfully affects output style
- Users can identify correct tone for their need
- Tone change triggers regeneration option

#### 3.2.4 Language Selection

**MVP Languages:**
- English (US/UK)
- Spanish
- French
- German
- Italian
- Arabic
- Hindi
- Tagalog

**Requirements:**
- Dropdown selection, searchable
- Default to user's UI language
- Language detector for prompt input (suggest output language)
- Quality assurance for translations

**Acceptance Criteria:**
- Output is grammatically correct and culturally appropriate
- Translation maintains intended tone
- Special education/school terminology is accurately translated

#### 3.2.5 Class Brain Context (Lightweight)

**Purpose:** Ground AI outputs with student/class context to reduce hallucinations and increase personalization

**Data Structure:**
- Class name
- Student names (first name + last initial for privacy)
- Optional custom fields (reading level, interests, strengths, growth areas)
- Maximum 30 students per class

**Usage:**
- Optional context selection during snippet generation
- System prompt enhancement with relevant context
- Privacy-preserving (no sensitive data stored)

**Acceptance Criteria:**
- Context improves personalization without adding student info not provided
- Users can add/edit context easily
- Context does not slow generation time
- Clear privacy messaging about what's stored

#### 3.2.6 AI Generation Engine & Safety Pipeline

**Technical Requirements:** (See Technical Spec for implementation details)
- GPT-4 API integration with structured prompting
- Multi-layer safety pipeline for hallucination prevention
- Average generation time: <5 seconds
- Comprehensive logging and monitoring

**Multi-Layer Safety Pipeline:**

**Layer 1: Structured Input Processing**
- Parse and validate user prompt
- Extract entities (student names, subjects, events)
- Compare extracted entities against Class Brain context
- Flag any mismatches or missing information

**Layer 2: Constrained Generation**
- System prompt with explicit safety guardrails
- Temperature settings optimized for consistency (0.7)
- Max token limits to prevent rambling
- Structured output format when appropriate (JSON mode for certain tasks)

**Layer 3: Post-Processing Filters**
- **Fabrication Detection:** Scan for student names not in Class Brain
- **Specificity Check:** Flag mentions of specific grades, test scores, dates not in prompt
- **Consistency Validation:** Ensure output aligns with prompt intent
- **Tone Verification:** Confirm output matches requested tone
- **Language Quality:** Grammar and cultural appropriateness checks

**Layer 4: Optional Zara Review (Pro Feature - Post-MVP)**
- User can request Zara to review snippet before saving/sharing
- Zara provides suggestions for clarity, tone, or completeness
- "Second pair of eyes" for sensitive communications

**Layer 5: User Feedback Loop**
- "Was this helpful?" rating after each generation
- "Flag for review" option for concerning outputs
- Low-rated snippets automatically logged for quality team review
- Continuous model fine-tuning based on feedback

**Fallback Strategy:**
- If GPT-4 fails or times out → retry once
- If second failure → fall back to GPT-3.5-turbo (faster, cheaper)
- If all AI fails → show friendly error with option to try again or contact support
- All failures logged with context for engineering review

**Output Specifications:**
- 50-300 words (length varies by prompt type)
- Maintains teacher voice and authenticity
- Avoids generic platitudes
- Includes specific, actionable language when appropriate
- Never fabricates student information
- Grammatically correct
- Appropriate for intended audience
- Includes confidence score (internal metric)

**Quality Controls:**
- Real-time monitoring of generation success rates
- Daily reports on flagged outputs and low ratings
- Weekly review of edge cases and failures
- Monthly prompt engineering optimization

**Acceptance Criteria:**
- >90% of generations require no editing or minor editing only
- <1% of generations contain factual errors or hallucinations
- <2% of generations flagged by users
- User satisfaction >4/5 on quality rating
- System prompt effectiveness validated through A/B testing

#### 3.2.7 Snippet Preview & Actions

**Preview Card Requirements:**
- Generated text displayed in readable format
- Metadata: Tone, language, generation date/time
- Word count displayed
- Context used (if applicable)

**Available Actions:**
- **Copy to Clipboard** - One-click copy with confirmation toast
- **Edit** - Opens inline editor, maintains history
- **Save to Library** - Prompts for tags and student assignment
- **Delete** - Immediate deletion with undo option (5 seconds)
- **Regenerate** - Creates new version with same parameters

**Acceptance Criteria:**
- All actions complete in <2 seconds
- Copy function works across all browsers
- Editing preserves formatting
- Save confirmation is clear and immediate

#### 3.2.8 Snippet Library

**Features:**
- Card-based grid view
- List view option (compact)
- Sorting: Recent, Oldest, Most Edited, Tone, Language
- Filtering: Multi-select tags, tone, language, student, date range
- Search: Full-text search across snippet content
- Bulk selection for export/delete

**Snippet Card Display:**
- First 150 characters of text
- Tags (up to 5 visible)
- Tone and language icons
- Generation date
- Edit/Delete/Export icons

**Acceptance Criteria:**
- Library loads in <2 seconds for 100+ snippets
- Filters apply instantly
- Search returns relevant results
- Bulk operations work reliably

#### 3.2.9 Tagging System

**Requirements:**
- User-created tags (unlimited)
- Tag suggestions based on prompt content
- Multi-tag assignment
- Tag management (rename, merge, delete)
- Color coding options

**Common Tag Categories:**
- Communication type (parent email, report card, incident report)
- Subject area
- Student name
- Time period (Q1, Q2, etc.)
- Topic (behavior, academics, social-emotional)

**Acceptance Criteria:**
- Tags are easy to create and apply
- Tag suggestions are relevant >70% of time
- Tag management doesn't affect snippets
- Tags improve search/filter effectiveness

#### 3.2.10 Export Functionality

**Export Formats:**
- **Copy to Clipboard** - Plain text with formatting
- **CSV** - Bulk export with all metadata fields (includes Zaza watermark for free tier)
- **PDF** - Formatted document with branding, metadata optional
- **Shareable Image Card** - Social media-ready snippet card (NEW - viral feature)

**Export Options:**
- Single snippet or bulk selection
- Include/exclude metadata
- Date range filtering
- Custom filename

**Viral Hooks (MVP):**
- **Shareable Snippet Cards:** Generate social media-ready images with snippet text, tone indicator, and "Made with Zaza Draft" branding
- **Quick Share Buttons:** One-click sharing to Twitter, Facebook, WhatsApp with pre-filled text celebrating time saved
- **Teacher Community Badge:** Optional badge on exports showing "Proud Zaza Teacher"
- **Referral Link in Exports:** Free tier exports include subtle referral link footer

**Acceptance Criteria:**
- Exports complete in <5 seconds for 50 snippets
- Formatting is preserved appropriately
- PDFs are professionally formatted
- CSV imports correctly into spreadsheet tools
- Shareable cards generate in <3 seconds with professional design
- Social share buttons work across all major platforms

### 3.3 Freemium Model & Monetization

#### 3.3.1 Free Tier

**Limits:**
- 5 snippet generations per calendar month
- Basic tone options (all 4 tones available)
- Core languages (English, Spanish, French, German)
- Standard export formats (Copy, CSV with Zaza watermark)
- Personal use only
- 30-day snippet history retention

**Included Features:**
- Snippet library with basic filtering
- Tagging system
- Edit and regenerate capabilities
- Class Brain (up to 1 class, 30 students)
- Shareable exports with "Made with Zaza" branding

#### 3.3.2 Pro Tier ($7.50/month or $59/year)

**Benefits:**
- Unlimited snippet generations
- All tone options including custom tone training (post-MVP)
- All languages
- Premium export (formatted PDFs)
- Snippet packs (thematic templates)
- Advanced analytics dashboard
- Unlimited snippet history
- Class Brain unlimited classes
- Priority support
- Early access to new features

**Upgrade Prompts:**
- Modal when free limit reached
- Soft prompts at 80% usage
- Feature teasers for premium content
- Time-limited offers for new users

#### 3.3.3 Institutional Licensing (Post-MVP)

**School/District Plans:**
- Bulk seat licensing (minimum 10 users)
- Admin dashboard for user management
- Usage analytics and reporting
- Compliance tools and audit logs
- White-labeling options
- Custom onboarding and training
- Dedicated support
- Single sign-on (SSO) integration

**Pricing Structure:**
- Tiered by number of seats
- Annual contracts
- Custom enterprise pricing

**Acceptance Criteria:**
- Clear value proposition for institutional vs individual
- Upgrade flow is frictionless
- Payment processing is secure and reliable
- Subscription management is user-friendly

### 3.4 Gamification, Engagement & Viral Mechanics

**Philosophy:** As per Zaza mandate, apps without viral hooks will not ship. Draft incorporates lightweight but powerful viral mechanics from Day 1.

#### 3.4.1 Viral Hooks (MVP - Critical)

**Shareable Snippet Cards:**
- Every saved snippet can be converted to a beautifully designed social media card
- Card includes: Snippet preview (first 2 lines), tone indicator, time saved estimate, "Made with Zaza Draft" branding
- One-click sharing to Twitter, Facebook, WhatsApp, Instagram Stories
- Free tier includes Zaza watermark (removable for Pro)

**Time-Saved Celebrations:**
- After every 5th snippet: "You've saved approximately 45 minutes this week! Want to share your productivity win?"
- Pre-filled social post: "I just saved 45 minutes on teacher communications with @ZazaEdu's Draft app! 🙌 #TeacherProductivity #EdTech"
- Includes referral link

**Milestone Sharing:**
- 10th snippet: "Share your first milestone!"
- 50th snippet: "You're a Draft power user! Show your community!"
- Custom graphics for each milestone with user stats

**Referral Program (MVP):**
- Every user gets unique referral link
- Referrer: +3 free generations when friend signs up
- Referee: +2 bonus generations on first signup
- Tracked via Firestore and displayed in profile

**Teacher Community Badge:**
- Optional profile badge: "Proud Zaza Teacher"
- Shows number of snippets generated, time saved
- Shareable to LinkedIn, Twitter, email signature

**Watermark Strategy:**
- Free tier: "Made with Zaza Draft" footer on PDF exports
- Free tier: Small Zaza logo on shareable cards
- Pro tier: Clean exports, optional Zaza badge if user wants to share

**Acceptance Criteria:**
- >20% of users share at least one snippet card in first month
- Referral program drives >10% of new signups by Month 3
- Milestone celebrations have >30% engagement rate
- Social shares include working referral links

#### 3.4.2 Usage Streaks

**Mechanics:**
- Track consecutive days with at least 1 snippet generated
- Streak display on dashboard
- Streak milestone badges (3-day, 7-day, 30-day, 100-day)
- Gentle reminder if streak at risk

**Purpose:** Encourage regular usage and habit formation

#### 3.4.3 Achievement Badges

**Badge Types:**
- **Onboarding:** "First Snippet," "Profile Complete," "Class Added"
- **Usage Milestones:** "10 Snippets," "50 Snippets," "100 Snippets"
- **Feature Exploration:** "Library Master," "Tag Organizer," "Multilingual Pro"
- **Quality:** "Editor Minimal" (<20% edit rate over 20 snippets)
- **Sharing:** "Community Contributor" (shared 5 snippets)

**Badge Display:**
- Badge collection on profile
- Progress indicators toward next badge
- Shareable badge graphics

#### 3.4.4 Milestone Celebrations

**Triggers:**
- First snippet generated
- 10th snippet milestone
- 50th snippet milestone
- Streak achievements
- Upgrade to Pro

**Celebration Elements:**
- Confetti animation
- Congratulatory message
- Shareable graphic for social media
- Optional: Share achievement to community (post-MVP)

**Acceptance Criteria:**
- Celebrations feel rewarding, not annoying
- Users can skip/dismiss easily
- Social sharing is optional and easy

#### 3.4.5 Onboarding Checklist

**Checklist Items:**
1. Complete profile setup
2. Generate first snippet
3. Save a snippet to library
4. Add tags to a snippet
5. Create a class in Class Brain
6. Try a different tone
7. Generate a multilingual snippet (optional)

**Incentive:** Badge or extended trial (e.g., +2 bonus generations)

**Acceptance Criteria:**
- Checklist is visible but not intrusive
- Progress saves automatically
- Completion feels achievable quickly (10-15 minutes)

---

## 4. Cross-App Ecosystem Integration

### 4.1 Zaza Platform Architecture

Zaza Draft is one pillar of the integrated Zaza educator platform, designed to work seamlessly with other Zaza products:

**Core Platform Components:**
- **Zaza Draft** - Communication snippet generation (this product)
- **Zaza Teach** - Lesson planning and curriculum design
- **Zara Assistant** - AI teaching assistant across all apps
- **KnowledgeCore** - Shared content library and knowledge base

### 4.2 Integration Points

#### 4.2.1 Draft ↔ Teach Integration

**Snippet-to-Lesson Flow:**
- Parent communication snippets from Draft can be linked to lesson plans in Teach
- Example: Report card comment in Draft → Auto-reference to related unit in Teach
- Teachers can see which lessons correspond to communications about student progress

**Shared Context:**
- Class rosters created in Draft sync to Teach (and vice versa)
- Student context from Class Brain available in both apps
- Tags and organizational structure consistent across both products

**Implementation (MVP):**
- Basic class roster sync via shared Firestore database
- "View Related Lessons" button in Draft snippet cards (links to Teach)
- Unified student context API

#### 4.2.2 Zara Assistant Continuity

**Cross-App Personality:**
- Zara maintains consistent voice, memory, and personality across Draft and Teach
- Zara remembers user preferences, teaching style, and past interactions
- Seamless handoff: "I noticed you just created a snippet about fractions in Draft. Would you like help planning tomorrow's fraction lesson in Teach?"

**Zara's Role in Draft:**
- Onboarding guidance and emotional support
- Snippet quality review (optional): "This looks great! Want me to check for clarity?"
- Proactive suggestions: "You haven't written about Emma M. in a while. Need a progress update?"
- Celebration and encouragement: "That's your 50th snippet! You've saved about 8 hours this month!"

**Implementation (MVP):**
- Zara widget available in Draft interface
- Context sharing via shared user session data
- Basic prompts for Draft-specific tasks
- Post-MVP: Full conversational interface and proactive suggestions

#### 4.2.3 Shared Library (KnowledgeCore)

**Content Sharing:**
- Snippets created in Draft can be saved to shared library
- Templates and snippet packs stored in KnowledgeCore
- Community contributions from Draft available to all Zaza users

**Cross-Referencing:**
- Draft snippets can reference curriculum standards from KnowledgeCore
- Lesson resources in Teach can pull communication templates from Draft
- Unified search across all user-generated and community content

**Implementation (MVP):**
- Basic library sync for user's own content
- Post-MVP: Community sharing and discovery features

### 4.3 Unified User Experience

**Single Account, Multiple Apps:**
- One Zaza account works across Draft, Teach, and all future products
- Unified billing: Pro subscription unlocks features across entire platform
- Consistent design language and navigation patterns

**Smart Defaults & Context Awareness:**
- Apps share context to reduce repeated data entry
- Example: Grade level set in Draft auto-populates in Teach
- Communication preferences (tone, language) carry across apps

**Cross-App Notifications:**
- Zara can notify across apps: "Your snippet in Draft got 10 likes!" (even when in Teach)
- Unified notification center for all Zaza apps

### 4.4 Ecosystem Roadmap

**Phase 1 (MVP):**
- [ ] Shared authentication and user profiles
- [ ] Basic class roster sync between Draft and Teach
- [ ] Zara assistant presence in Draft (limited functionality)
- [ ] Cross-app navigation links

**Phase 2 (Q2 2025):**
- [ ] Full snippet-to-lesson linking
- [ ] Zara conversational continuity across apps
- [ ] Shared library with basic search
- [ ] Unified Pro subscription benefits

**Phase 3 (Q3-Q4 2025):**
- [ ] Deep two-way sync (lessons inform snippets, snippets inform lessons)
- [ ] Zara proactive suggestions across apps
- [ ] Community content discovery
- [ ] Advanced analytics across entire platform

---

## 5. User Experience & Design Principles

### 5.1 Design Philosophy

**Core Principles:**
1. **Simplicity First** - Interface should feel effortless, even for non-technical users
2. **Teacher Voice** - Design should feel supportive, not condescending
3. **Trust & Transparency** - Always clear about what AI is doing and what data is used
4. **Accessibility** - WCAG 2.1 AA compliance minimum
5. **Mobile-Friendly** - Responsive design, thumb-friendly touch targets

### 5.2 Key Interface Components

**Dashboard/Home Screen:**
- Hero prompt input area (always visible)
- Quick stats: Usage this month, streak, snippets saved
- Recent snippets carousel
- Quick access to library, settings, help

**Navigation:**
- Simple top nav or sidebar
- Home, Library, Class Brain, Analytics (Pro), Settings, Help
- Upgrade CTA visible but not obtrusive

**Visual Design:**
- Clean, uncluttered layouts
- Generous white space
- Warm, professional color palette (avoid sterile tech aesthetics)
- Friendly but professional illustrations
- Clear typography hierarchy

### 5.3 In-App Assistant ("Zara" - Post-MVP)

**Purpose:** Contextual help and guided assistance

**Functionality:**
- Onboarding guidance
- Feature tips on first use
- Help with stuck moments (e.g., empty library)
- Feedback collection
- Celebration messages

**Design:**
- Optional avatar or icon
- Chat-like interface for help
- Non-intrusive (user-initiated or contextual)

---

## 6. Post-MVP Roadmap & Future Enhancements

### 6.1 Phase 2: Enhanced Intelligence (Q2 2025)

**AI Quality Layer:**
- Second-pass QA agent for fact-checking
- Contradiction detection
- Bias and sensitivity scanning
- User feedback loop for continuous improvement

**Advanced Context:**
- Import student data from SIS (Google Classroom, Schoology integration)
- Learning profile templates
- IEP goal tracking integration

### 6.2 Phase 3: Premium Content & Community (Q3 2025)

**Snippet Packs:**
- Thematic template collections (e.g., "Report Card Comments," "Parent-Teacher Conference Prep")
- Subject-specific packs (STEM, Arts, PE)
- Grade-level specialized packs
- Seasonal/situational packs (Back to School, Progress Reports)

**Community Sharing (Enhanced Viral Layer):**
- Public snippet library (opt-in sharing)
- Upvote/downvote and ratings
- Featured snippets curated by educators
- Search and discover shared templates
- Privacy controls for sharing
- Contributor badges and recognition
- "Trending snippets" feed
- Community challenges and prompts

### 6.3 Phase 4: Institutional Features (Q3-Q4 2025)

**Admin Console:**
- User provisioning and management
- Usage dashboards and reporting
- Compliance monitoring tools
- Org-wide snippet packs and templates
- Data governance controls

**Analytics Dashboard:**
- Teacher view: Personal usage insights, time saved, tone/language patterns
- Admin view: Org-wide adoption, feature usage, ROI metrics

### 6.4 Phase 5: Platform Expansion (Q4 2025+)

**Mobile Apps:**
- Native iOS and Android apps
- Optimized for on-the-go snippet generation
- Voice input for prompts

**New Verticals:**
- Higher education faculty
- Corporate training/HR
- Healthcare documentation
- Real estate communications

**Advanced Integrations:**
- Email client plugins (Gmail, Outlook)
- LMS deep integration (auto-populate comments)
- Student information system connectors

---

## 7. Go-to-Market Strategy

### 7.1 Launch Plan (MVP)

**Pre-Launch (Months -2 to 0):**
- Beta testing with 50-100 teachers
- Content marketing ramp-up (blog, social media)
- Landing page and email capture
- Partner outreach (teacher organizations)

**Launch (Month 1):**
- Public launch announcement
- Press outreach (EdTech media)
- Social media campaign
- Product Hunt launch
- Teacher community seeding (Reddit, Facebook)

**Post-Launch (Months 2-3):**
- User feedback collection and iteration
- Referral program launch
- Content marketing scaling
- First institutional pilots

### 7.2 Growth Strategy

**User Acquisition:**
- Content-led growth (SEO-optimized teacher productivity content)
- Community-driven (teacher advocates and referrals)
- **Viral mechanics** (social sharing, referral program, milestone celebrations)
- Partnership-led (EdTech partnerships, conference presence)
- Institutional sales (direct B2B outreach)

**Retention:**
- Onboarding optimization
- Feature adoption campaigns
- Regular engagement touchpoints (weekly tips, new features)
- Customer success outreach for high-value users

**Monetization:**
- Conversion optimization (free-to-pro upgrade flow)
- Feature gating experiments
- Institutional package development
- Add-on packs and premium content

---

## 8. Risk Mitigation & Contingencies

### 8.1 Product Risks

**Risk: Low user activation**
- Mitigation: Strong onboarding, quick time-to-value, compelling first use case
- Contingency: A/B test onboarding flows, simplify initial experience

**Risk: Poor AI output quality**
- Mitigation: Extensive prompt engineering, quality controls, user feedback loops
- Contingency: Human review layer, alternative AI model testing

**Risk: Freemium conversion too low**
- Mitigation: Test pricing, feature gating, and upgrade prompts
- Contingency: Adjust free tier limits, introduce time-limited trials, premium content marketing

### 8.2 Market Risks

**Risk: Competitor launch similar product**
- Mitigation: Fast execution, strong brand and community, superior UX, **viral growth mechanics**
- Contingency: Differentiate on educator-specific features, institutional relationships, ecosystem integration

**Risk: Teachers resistant to AI in education**
- Mitigation: Transparency, educator involvement in design, emphasize augmentation not replacement, **Zara assistant as friendly guide**
- Contingency: Reframe as "productivity tool," emphasize teacher control

### 8.3 Operational Risks

**Risk: AI API costs exceed budget**
- Mitigation: Usage monitoring, optimization, alternative model evaluation
- Contingency: Stricter free tier limits, price increase, cheaper model for free tier

**Risk: Compliance or privacy issues**
- Mitigation: Legal review, privacy-first design, clear terms and data policies
- Contingency: Immediate response protocol, user communication, feature adjustments

---

## 9. Success Metrics & KPIs

### 9.1 North Star Metric

**Time Saved per Active User per Month**

Target: 120+ minutes (2+ hours) by Month 3

### 9.2 Leading Indicators

**Acquisition:**
- Signups per week
- Activation rate (complete onboarding + 3 snippets)
- Channel attribution
- **Referral-driven signups (target >10% by Month 3)**

**Engagement:**
- Weekly active users (WAU)
- Snippets generated per user per week
- Feature adoption rates (tagging, Class Brain, export, **sharing**)
- **Viral coefficient** (how many new users does each user bring?)

**Retention:**
- 7-day retention
- 30-day retention
- Churn rate

**Monetization:**
- Free-to-pro conversion rate
- Average revenue per user (ARPU)
- Customer lifetime value (LTV)

**Quality:**
- NPS score
- Edit rate (lower is better, target <30%)
- Support ticket volume
- **Hallucination rate** (<1%)

**Viral Metrics (MVP):**
- Share rate (% of users who share snippets)
- Referral conversion rate
- Social media reach and engagement
- Community growth rate

### 9.3 Reporting Cadence

- **Daily:** Signups, generations, errors
- **Weekly:** Active users, retention cohorts, conversion
- **Monthly:** NPS, feature adoption, financial metrics
- **Quarterly:** Strategic review, roadmap adjustments

---

## 10. Appendix

### 10.1 User Research Summary

[Link to user research findings, interview transcripts, survey results]

### 10.2 Competitive Analysis

[Link to competitive landscape analysis]

### 10.3 Technical Dependencies

[Link to Technical Specification Document]

### 10.4 Alignment with Zaza Mandate

**Viral Mechanics:** ✅ Implemented shareable cards, referral program, milestone sharing in MVP
**Smart Defaults:** ✅ Pricing aligned at $7.50/month, $59/year per mandate
**Cross-App Integration:** ✅ Draft integrates with Teach, Zara, and KnowledgeCore
**Psychological Onboarding:** ✅ Emotional anchoring with instant relief demo
**AI Safety:** ✅ Multi-layer pipeline with structured prompts and fallback logic

### 10.5 Alignment with Cursor Rules

**Authentication:** ✅ Firebase email/password primary, Google Auth optional
**Database:** ✅ Firestore collections: users, snippets, classes, subscriptions, feedback
**AI Strategy:** ✅ GPT-4 with GPT-3.5 fallback, comprehensive logging
**Safety:** ✅ Hallucination prevention, post-processing filters, user feedback loop

### 10.6 Glossary

- **Snippet:** Generated text output from AI, saved by user
- **Class Brain:** Context database of student/class information
- **Tone:** Style/voice parameter for AI generation
- **Freemium:** Business model with free tier and paid upgrade
- **MAU:** Monthly Active Users
- **NPS:** Net Promoter Score

### 10.7 Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 2.0 | Oct 6, 2025 | **Major Update - Mandate & Cursor Rules Compliance**<br>• Added viral mechanics (shareable cards, referral program, social sharing)<br>• Added cross-app ecosystem integration section (Draft ↔ Teach, Zara, KnowledgeCore)<br>• Enhanced psychological onboarding with emotional anchoring<br>• Updated pricing to $7.50/mo, $59/yr per mandate<br>• Expanded AI safety pipeline to 5-layer system<br>• Changed auth priority: email/password primary, Google OAuth optional<br>• Added compliance sections for mandate & Cursor Rules | Product Team |
| 1.0 | Oct 6, 2025 | Initial PRD based on consolidated spec | Product Team |

---

**Document Approvals:**

- [ ] Product Lead
- [ ] Engineering Lead  
- [ ] Design Lead
- [ ] Marketing Lead
- [ ] Executive Sponsor

**Next Review Date:** November 15, 2025
**Authors:** Dr. Greg Blackburn

# Zaza – Emotionally Intelligent AI Additions Pack

This pack defines the extensions required to align Zaza Draft (and all Zaza apps) with the **Strategic Vision – The Emotionally Intelligent AI Ecosystem**.  
It supplements both the Product Requirements Document (PRD) and Technical Specification (TS).

---

## 1. Emotion & Tone Awareness
- Expand tone categories beyond warm, professional, direct, empathetic.  
- Integrate sentiment analysis to detect teacher stress/urgency.  
- Add reflective layer: AI explains why a suggestion was made.  

## 2. Teacher Agency & Feedback Loop
- Feedback system to include qualitative EI dimensions (‘supportive’, ‘appropriate tone’).  
- Store per-teacher EI feedback in profile for Zara adaptation.  

## 3. Cross-App EI Memory
- Extend unified profile with EI-specific fields (preferred empathy level, stress triggers).  
- Ensure Zara adapts tone across all apps based on stored memory.  

## 4. Proactive EI Nudges
- Define proactive scenarios (late-night work, repeated drafts, stress cues).  
- Zara offers micro-interventions to reduce burden.  

## 5. Auditability of EI
- Extend generation logs with fields: tone match vs request, sentiment appropriateness.  
- Create measurable KPIs for emotional intelligence.  

---

## Implementation Guidance
- Add section **'Emotionally Intelligent AI Enhancements'** to Technical Spec.  
- Update schemas: users, feedback, generation_logs with EI fields.  
- Update Zara’s system prompt: always explain reasoning in 1–2 sentences.  
