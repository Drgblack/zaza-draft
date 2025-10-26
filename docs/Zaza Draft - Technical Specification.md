# Zaza Draft - Technical Specification

**Version:** 2.0  
**Last Updated:** October 6, 2025  
**Document Owner:** Engineering Team  
**Status:** Ready for Implementation

---

## 1. Technical Overview

### 1.1 System Architecture

Zaza Draft follows a modern, serverless web application architecture optimized for rapid development, scalability, and cost-effectiveness during early growth stages.

**Architecture Pattern:** JAMstack with serverless functions

**Core Components:**
1. **Frontend Application** - React SPA with responsive design
2. **Backend Services** - Firebase/Supabase serverless functions
3. **Database** - Firestore (NoSQL) for flexible schema
4. **AI Service Layer** - OpenAI GPT-4 API integration
5. **Authentication** - Firebase Auth / Supabase Auth
6. **Storage** - Cloud storage for exports and assets
7. **Analytics** - Mixpanel/Amplitude + Google Analytics

### 1.2 Technology Stack

**Frontend:**
- **Framework:** React 18+ (Create React App or Vite)
- **UI Library:** Material-UI (MUI) or Chakra UI for rapid development
- **State Management:** React Context API + React Query for server state
- **Routing:** React Router v6
- **Forms:** React Hook Form with Zod validation
- **Internationalization:** i18next
- **Build Tool:** Vite (faster than CRA) or Next.js for SSR benefits
- **Deployment:** Vercel or Netlify

**Backend:**
- **Platform:** Firebase or Supabase (recommend Firebase for initial launch)
- **Functions:** Cloud Functions for Firebase (Node.js)
- **API Style:** RESTful endpoints + direct Firestore queries
- **Runtime:** Node.js 18+

**Database:**
- **Primary:** Firestore (Firebase's NoSQL database)
- **Alternative:** Supabase Postgres if relational model preferred
- **Caching:** Redis for rate limiting and session data (if needed)

**AI/ML:**
- **Primary Model:** OpenAI GPT-4 Turbo via API
- **Backup Model:** GPT-3.5 Turbo for cost optimization on free tier (optional)
- **Prompt Management:** Langchain or custom prompt templates
- **Vector Storage:** Pinecone or Firebase Extensions for future semantic search

**Authentication & Authorization:**
- **Provider:** Firebase Auth
- **Methods:** Email/Password (primary), Google OAuth (optional)
- **Session Management:** JWT tokens with refresh
- **Rationale:** Email/password ensures maximum device compatibility and eliminates OAuth dependencies per Cursor Rules

**Payment Processing:**
- **Provider:** Stripe
- **Integration:** Stripe Checkout + Customer Portal
- **Webhooks:** Subscription lifecycle management

**Infrastructure & DevOps:**
- **Hosting:** Firebase Hosting or Vercel
- **CI/CD:** GitHub Actions
- **Monitoring:** Firebase Performance Monitoring, Sentry for error tracking
- **Logging:** Cloud Logging (GCP) or CloudWatch (AWS)
- **Analytics:** Mixpanel for product analytics, Google Analytics for web traffic

**Development Tools:**
- **Version Control:** Git + GitHub
- **Code Quality:** ESLint, Prettier
- **Testing:** Jest, React Testing Library, Cypress (E2E)
- **Documentation:** Storybook for component library

### 1.3 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                         │
│                                                              │
│  ┌────────────────────────────────────────────────────┐   │
│  │         React SPA (Vercel/Firebase Hosting)        │   │
│  │  - Component Library (MUI/Chakra)                  │   │
│  │  - State Management (Context + React Query)        │   │
│  │  - Routing (React Router)                          │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                     API/BACKEND LAYER                        │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │ Firebase Auth    │  │ Cloud Functions  │               │
│  │ - OAuth          │  │ - Snippet Gen    │               │
│  │ - JWT Tokens     │  │ - Export         │               │
│  └──────────────────┘  │ - Webhooks       │               │
│                        │ - Utilities      │               │
│                        └──────────────────┘               │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      DATA & AI LAYER                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Firestore   │  │  OpenAI API  │  │  Stripe API  │     │
│  │  Database    │  │  (GPT-4)     │  │  (Payments)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ Cloud Storage│  │  Analytics   │                        │
│  │ (Files/PDFs) │  │  (Mixpanel)  │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Data Models & Database Schema

### 2.1 Database Selection: Firestore

**Rationale:**
- Schema flexibility for rapid iteration
- Real-time sync capabilities
- Excellent Firebase integration
- Generous free tier
- Auto-scaling
- Strong security rules engine

### 2.2 Collections & Documents

#### Users Collection: `users/{userId}`

```typescript
interface User {
  userId: string;              // Auto-generated Firebase UID
  email: string;               // Unique, indexed
  displayName: string;
  photoURL?: string;
  schoolName?: string;
  gradeLevels: string[];       // ["K-2", "3-5", "6-8", "9-12"]
  subjects: string[];          // ["Math", "Science", ...]
  preferredUILanguage: string; // ISO 639-1 code (e.g., "en", "es")
  timezone: string;            // IANA timezone (e.g., "America/New_York")
  accountType: "free" | "pro" | "institutional";
  subscriptionId?: string;     // Stripe subscription ID
  subscriptionStatus?: "active" | "canceled" | "past_due";
  monthlyUsage: {
    month: string;             // "YYYY-MM"
    generationCount: number;   // Snippets generated this month
    lastReset: Timestamp;
  };
  streak: {
    currentStreak: number;     // Days
    longestStreak: number;
    lastActiveDate: string;    // "YYYY-MM-DD"
  };
  badges: string[];            // Badge IDs earned
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastActiveAt: Timestamp;
}
```

**Indexes:**
- `email` (unique)
- `accountType`
- `subscriptionStatus`

#### Snippets Collection: `users/{userId}/snippets/{snippetId}`

```typescript
interface Snippet {
  snippetId: string;           // Auto-generated
  userId: string;              // Owner reference
  promptText: string;          // Original user prompt
  generatedText: string;       // AI output
  editedText?: string;         // User edits (null if not edited)
  tone: "warm" | "professional" | "direct" | "empathetic";
  language: string;            // ISO 639-1 code
  tags: string[];              // User-defined tags
  classId?: string;            // Reference to Class
  studentIds: string[];        // References to students (for privacy)
  wordCount: number;
  wasEdited: boolean;
  contextUsed?: {              // Class Brain context included
    className?: string;
    studentNames: string[];
    customFields?: Record<string, any>;
  };
  metadata: {
    modelUsed: string;         // "gpt-4-turbo"
    generationTime: number;    // Milliseconds
    tokensUsed: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes:**
- `userId` (automatic subcollection index)
- `createdAt` (descending)
- `tags` (array-contains)
- `tone`
- `language`

#### Classes Collection: `users/{userId}/classes/{classId}`

```typescript
interface Class {
  classId: string;
  userId: string;
  className: string;           // "3rd Grade Math"
  gradeLevel: string;
  subject: string;
  students: Student[];         // Embedded for simplicity
  customFields: Record<string, any>; // Flexible metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface Student {
  studentId: string;           // Auto-generated
  firstName: string;           // Only first name for privacy
  lastInitial: string;         // Last initial only
  displayName: string;         // "Sarah M."
  notes?: string;              // Optional context (strengths, interests)
  customFields?: Record<string, any>; // Reading level, etc.
}
```

**Data Privacy Note:** No sensitive PII stored. Students identified by first name + last initial only.

#### Tags Collection: `users/{userId}/tags/{tagId}`

```typescript
interface Tag {
  tagId: string;
  userId: string;
  name: string;                // User-defined
  color?: string;              // Hex color code
  usageCount: number;          // Number of snippets with this tag
  createdAt: Timestamp;
}
```

#### Analytics Events Collection: `analyticsEvents/{eventId}`

```typescript
interface AnalyticsEvent {
  eventId: string;
  userId: string;
  eventType: string;           // "snippet_generated", "snippet_edited", etc.
  eventData: Record<string, any>;
  timestamp: Timestamp;
  sessionId: string;
}
```

**Note:** Consider using dedicated analytics tool (Mixpanel) instead of storing events in Firestore for cost and performance reasons.

#### Subscription Data: `subscriptions/{subscriptionId}`

```typescript
interface Subscription {
  subscriptionId: string;      // Stripe subscription ID
  userId: string;
  planType: "pro" | "institutional";
  status: "active" | "canceled" | "past_due" | "trialing";
  currentPeriodEnd: Timestamp;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Synced from Stripe webhooks**

#### Feedback Collection: `users/{userId}/feedback/{feedbackId}`

```typescript
interface Feedback {
  feedbackId: string;
  userId: string;
  snippetId?: string;          // Optional reference to snippet
  feedbackType: "quality_rating" | "bug_report" | "feature_request" | "flag_output";
  rating?: number;             // 1-5 for quality ratings
  comment?: string;            // Optional text feedback
  metadata: {
    tone?: string;
    language?: string;
    modelUsed?: string;
  };
  createdAt: Timestamp;
}
```

**Used for continuous quality improvement and hallucination detection**

#### Generation Logs: `generation_logs/{logId}` (Backend only, admin access)

```typescript
interface GenerationLog {
  logId: string;
  userId: string;
  snippetId: string;
  promptText: string;
  generatedText: string;
  modelUsed: "gpt-4-turbo" | "gpt-3.5-turbo";
  safetyChecks: {
    fabricationDetected: boolean;
    consistencyScore: number;
    toneMatch: boolean;
    overallScore: number;
  };
  tokensUsed: number;
  generationTime: number;      // Milliseconds
  success: boolean;
  errorMessage?: string;
  timestamp: Timestamp;
}
```

**Critical for monitoring AI quality, debugging, and detecting patterns**

#### Cross-App Shared Collections

**Zaza Account Data: `zaza_accounts/{accountId}`**

```typescript
interface ZazaAccount {
  accountId: string;           // Same as Firebase UID
  email: string;
  displayName: string;
  photoURL?: string;
  
  // Cross-app preferences
  preferredLanguage: string;
  timezone: string;
  teachingContext: {
    schoolName?: string;
    gradeLevels: string[];
    subjects: string[];
  };
  
  // App subscriptions
  apps: {
    draft: {
      enabled: boolean;
      accountType: "free" | "pro";
      firstUsed: Timestamp;
    };
    teach: {
      enabled: boolean;
      accountType: "free" | "pro";
      firstUsed: Timestamp;
    };
    // Future apps...
  };
  
  // Unified billing
  stripeCustomerId?: string;
  subscriptionTier: "free" | "pro" | "institutional";
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Note:** This collection enables single Zaza account across all apps (Draft, Teach, etc.)

---

## 3. API Specifications

### 3.1 Cross-App Integration Architecture

#### 3.1.1 Unified Zaza Account System

**Design Philosophy:**
- One Zaza account works across all apps (Draft, Teach, Zara, etc.)
- Shared authentication and user context
- Unified billing and subscriptions
- Seamless navigation between apps

**Technical Implementation:**
```typescript
// Shared authentication check
async function verifyZazaAccount(token: string): Promise<ZazaUser> {
  const decodedToken = await admin.auth().verifyIdToken(token);
  const accountDoc = await db.collection('zaza_accounts')
    .doc(decodedToken.uid)
    .get();
  
  return {
    uid: decodedToken.uid,
    email: decodedToken.email,
    apps: accountDoc.data().apps,
    subscriptionTier: accountDoc.data().subscriptionTier
  };
}

// Check if user has access to Draft
function hasAccessToDraft(user: ZazaUser): boolean {
  return user.apps.draft.enabled === true;
}
```

#### 3.1.2 Class Roster Sync (Draft ↔ Teach)

**Sync Strategy:**
- Classes created in Draft automatically available in Teach
- Two-way sync via shared Firestore collection
- Real-time updates using Firestore listeners

**Firestore Structure:**
```
zaza_accounts/{accountId}/classes/{classId}
  - Used by both Draft and Teach
  - Single source of truth for class rosters
  - Apps can add app-specific fields in subcollections
```

**API Endpoint:**
```typescript
// GET /api/classes?app=draft
// Returns classes with Draft-specific context
async function getClassesForApp(userId: string, app: 'draft' | 'teach') {
  const classes = await db
    .collection('zaza_accounts')
    .doc(userId)
    .collection('classes')
    .get();
  
  // Add app-specific context
  return classes.docs.map(doc => ({
    ...doc.data(),
    appContext: doc.data()[`${app}_context`]
  }));
}
```

#### 3.1.3 Zara Assistant Integration

**Zara Context Sharing:**
- Zara has access to user's activity across all apps
- Conversation history shared via Firestore
- Proactive suggestions based on cross-app insights

**Implementation:**
```typescript
interface ZaraContext {
  userId: string;
  currentApp: 'draft' | 'teach' | 'knowledge_core';
  recentActivity: {
    draft: {
      lastSnippetGenerated: Timestamp;
      recentTopics: string[];
      activeClasses: string[];
    };
    teach: {
      lastLessonPlanned: Timestamp;
      upcomingLessons: string[];
    };
  };
  conversationHistory: Message[];
  preferences: {
    helpfulnessLevel: 'minimal' | 'moderate' | 'proactive';
    personalityTone: string;
  };
}

// Zara can make cross-app suggestions
async function zaraProactiveSuggestion(context: ZaraContext): Promise<string> {
  if (context.currentApp === 'draft' && 
      context.recentActivity.teach.upcomingLessons.includes('fractions')) {
    return "I noticed you have a fractions lesson coming up in Teach. Would you like me to help you draft parent communications about this unit?";
  }
  // ... more cross-app logic
}
```

#### 3.1.4 Snippet-to-Lesson Linking

**Use Case:** Teacher generates parent communication about a lesson unit → Link to that lesson plan in Teach

**Implementation:**
```typescript
// Add to Snippet interface
interface Snippet {
  // ... existing fields
  linkedContent?: {
    app: 'teach' | 'knowledge_core';
    contentId: string;          // Lesson plan ID, resource ID, etc.
    contentType: string;         // 'lesson_plan', 'unit', 'resource'
    title: string;
  };
}

// API endpoint to create link
// POST /api/snippets/{snippetId}/link
async function linkSnippetToContent(
  snippetId: string, 
  linkedContent: LinkedContent
) {
  await db.collection('users')
    .doc(userId)
    .collection('snippets')
    .doc(snippetId)
    .update({ linkedContent });
  
  // Also update the linked content to reference snippet
  await db.collection('zaza_accounts')
    .doc(userId)
    .collection('lessons')  // Teach collection
    .doc(linkedContent.contentId)
    .update({
      relatedSnippets: admin.firestore.FieldValue.arrayUnion(snippetId)
    });
}
```

### 3.2 RESTful Endpoints (Cloud Functions)

**Base URL:** `https://us-central1-[project-id].cloudfunctions.net/`

#### Authentication
All endpoints except public ones require Firebase Auth token in header:
```
Authorization: Bearer <firebase-id-token>
```

### 3.3 Core API Endpoints

#### POST `/generateSnippet`

**Purpose:** Generate AI snippet from user prompt

**Request:**
```json
{
  "promptText": "string (required, max 2000 chars)",
  "tone": "warm | professional | direct | empathetic (required)",
  "language": "string (required, ISO 639-1)",
  "classId": "string (optional)",
  "studentIds": ["string"] (optional)
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "snippetId": "string",
    "generatedText": "string",
    "wordCount": number,
    "metadata": {
      "modelUsed": "string",
      "generationTime": number,
      "tokensUsed": number
    }
  },
  "usage": {
    "currentMonthUsage": number,
    "limit": number,
    "remaining": number
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "USAGE_LIMIT_EXCEEDED | INVALID_REQUEST | AI_GENERATION_FAILED",
    "message": "string"
  }
}
```

**Rate Limiting:** 
- Free tier: 5 requests per month
- Pro tier: Unlimited (soft limit 1000/day for abuse prevention)
- Rate: 10 requests per minute per user

**Implementation Notes:**
- Validate user authentication and subscription status
- Check monthly usage limit
- Retrieve Class Brain context if classId/studentIds provided
- Construct system prompt with context
- Call OpenAI API with retry logic
- Log generation metadata
- Increment user's monthly usage counter
- Return snippet data with usage info

---

#### GET `/snippets`

**Purpose:** Retrieve user's snippet library with filtering

**Query Parameters:**
```
?limit=20                    // Pagination limit (default 20, max 100)
&offset=0                    // Pagination offset
&sortBy=createdAt            // Sort field (createdAt, updatedAt)
&sortOrder=desc              // Sort order (asc, desc)
&tone=professional           // Filter by tone
&language=en                 // Filter by language
&tags=parent-email,report    // Comma-separated tag filter
&search=progress             // Full-text search
&startDate=2025-01-01        // Filter by date range
&endDate=2025-03-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "snippets": [
      {
        "snippetId": "string",
        "generatedText": "string",
        "tone": "string",
        "language": "string",
        "tags": ["string"],
        "createdAt": "ISO 8601 timestamp",
        "wordCount": number
      }
    ],
    "pagination": {
      "total": number,
      "limit": number,
      "offset": number,
      "hasMore": boolean
    }
  }
}
```

---

#### PATCH `/snippets/{snippetId}`

**Purpose:** Update snippet (edit text, add tags, etc.)

**Request:**
```json
{
  "editedText": "string (optional)",
  "tags": ["string"] (optional),
  "studentIds": ["string"] (optional)
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "snippetId": "string",
    "updatedAt": "ISO 8601 timestamp"
  }
}
```

---

#### DELETE `/snippets/{snippetId}`

**Purpose:** Delete a snippet

**Response:**
```json
{
  "success": true,
  "message": "Snippet deleted successfully"
}
```

---

#### POST `/export`

**Purpose:** Export snippets to CSV or PDF

**Request:**
```json
{
  "snippetIds": ["string"] (required),
  "format": "csv | pdf" (required),
  "includeMetadata": boolean (optional, default true)
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "downloadUrl": "string (signed URL, expires in 1 hour)",
    "expiresAt": "ISO 8601 timestamp"
  }
}
```

---

#### POST `/classes`

**Purpose:** Create a new class

**Request:**
```json
{
  "className": "string (required)",
  "gradeLevel": "string",
  "subject": "string",
  "students": [
    {
      "firstName": "string",
      "lastInitial": "string",
      "notes": "string"
    }
  ]
}
```

---

#### GET `/usage/stats`

**Purpose:** Get user's usage statistics

**Response:**
```json
{
  "success": true,
  "data": {
    "currentMonth": {
      "generationCount": number,
      "limit": number,
      "remaining": number
    },
    "allTime": {
      "totalSnippets": number,
      "timeSavedMinutes": number (estimated),
      "mostUsedTone": "string",
      "mostUsedLanguage": "string"
    },
    "streak": {
      "currentStreak": number,
      "longestStreak": number,
      "lastActiveDate": "YYYY-MM-DD"
    }
  }
}
```

---

### 3.4 OpenAI API Integration

#### AI Generation Function Logic (Multi-Layer Safety Pipeline)

```typescript
async function generateSnippet(params: GenerateSnippetParams): Promise<GenerationResult> {
  const { promptText, tone, language, context } = params;
  
  // LAYER 1: Input Processing & Validation
  const parsedInput = parseAndValidatePrompt(promptText);
  const extractedEntities = extractEntities(promptText);
  const contextMismatches = validateAgainstContext(extractedEntities, context);
  
  if (contextMismatches.length > 0) {
    logWarning('Context mismatches detected', contextMismatches);
  }
  
  // LAYER 2: Structured System Prompt
  const systemPrompt = buildSystemPrompt(tone, language, context);
  
  // LAYER 3: API Call with Retry Logic
  let generatedText: string;
  let model = 'gpt-4-turbo';
  
  try {
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: promptText }
      ],
      temperature: 0.7,
      max_tokens: 500,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });
    
    generatedText = completion.choices[0].message.content;
    
  } catch (error) {
    // Fallback to GPT-3.5-turbo
    logError('GPT-4 failed, falling back to GPT-3.5', error);
    
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: promptText }
        ],
        temperature: 0.7,
        max_tokens: 500
      });
      
      generatedText = completion.choices[0].message.content;
      model = 'gpt-3.5-turbo';
      
    } catch (fallbackError) {
      logError('Both GPT-4 and GPT-3.5 failed', fallbackError);
      throw new Error('AI generation failed. Please try again.');
    }
  }
  
  // LAYER 4: Post-Processing & Safety Checks
  const safetyChecks = runSafetyChecks(generatedText, context, parsedInput);
  
  if (safetyChecks.fabricationDetected) {
    logWarning('Possible fabrication detected', safetyChecks.details);
    // Optionally regenerate or flag for review
  }
  
  if (safetyChecks.consistencyScore < 0.7) {
    logWarning('Low consistency score', safetyChecks.details);
  }
  
  // Format and clean output
  const processedText = postProcessText(generatedText, context);
  
  // LAYER 5: Logging & Monitoring
  await logGeneration({
    userId: params.userId,
    promptText,
    generatedText: processedText,
    model,
    tone,
    language,
    safetyChecks,
    timestamp: new Date()
  });
  
  return {
    text: processedText,
    metadata: {
      modelUsed: model,
      safetyScore: safetyChecks.overallScore,
      confidenceScore: safetyChecks.confidenceScore
    }
  };
}

// Safety Check Functions
function runSafetyChecks(text: string, context: Context, input: ParsedInput) {
  return {
    fabricationDetected: detectFabrication(text, context),
    consistencyScore: checkConsistency(text, input),
    toneMatch: verifyTone(text, input.requestedTone),
    languageQuality: checkGrammar(text, input.language),
    confidenceScore: calculateConfidence(text),
    overallScore: calculateOverallSafety()
  };
}

function detectFabrication(text: string, context: Context): boolean {
  // Check for student names not in context
  const mentionedNames = extractNames(text);
  const contextNames = context.students?.map(s => s.firstName) || [];
  
  for (const name of mentionedNames) {
    if (!contextNames.includes(name)) {
      return true; // Fabrication detected
    }
  }
  
  // Check for specific grades/scores not in prompt
  const mentionedGrades = extractGrades(text);
  if (mentionedGrades.length > 0 && !context.allowsGrades) {
    return true;
  }
  
  return false;
}
```

#### System Prompt Template (Structured for Safety)

```
You are an expert K-12 teacher communication assistant. Your role is to help teachers write clear, professional, and empathetic communications to parents and for student reports.

CONTEXT:
- Teacher's tone preference: {tone}
- Output language: {language}
- Class context: {className}, {gradeLevel}, {subject}
- Student context: {studentNames}

INSTRUCTIONS:
1. Generate a snippet based on the teacher's prompt that follows the specified tone
2. Keep output between 50-300 words unless otherwise specified
3. Use specific, actionable language when appropriate
4. NEVER fabricate information about students not provided in context
5. If uncertain about details, use general positive language
6. Maintain professional standards appropriate for school communications
7. Ensure grammatical correctness and cultural appropriateness for {language}

TONE GUIDELINES:
- Warm & Encouraging: Celebrates progress, growth-focused, supportive
- Professional & Neutral: Objective, formal, documentation-appropriate
- Direct & Clear: Straightforward, concise, action-oriented
- Empathetic & Supportive: Sensitive topics, compassionate, understanding

IMPORTANT: Do not include greetings, salutations, or signatures. Only generate the body content of the message or comment.

Now generate the snippet based on this teacher's request:
```

#### Hallucination Prevention Measures

1. **System Prompt Guardrails:**
   - Explicit instruction not to fabricate student information
   - Requirement to use only provided context
   - Fallback to general language when uncertain

2. **Post-Processing Checks:**
   - Scan output for student names not in provided context
   - Flag mentions of specific grades, test scores, or events not in prompt
   - Check for inconsistencies between prompt and output

3. **User Feedback Loop:**
   - "Was this helpful?" rating after each generation
   - Flag for review option
   - Low-rating snippets logged for quality analysis

---

## 4. Security & Privacy

### 4.1 Security Architecture

#### Authentication & Authorization

**Firebase Auth Flow (per Cursor Rules):**
1. User signs up via email/password (primary) or Google OAuth (optional convenience)
2. Firebase Auth issues JWT token
3. Email verification required for email/password signups
4. Token included in all API requests (Authorization header)
5. Cloud Functions verify token and user permissions
6. Firestore security rules enforce data access
7. Single Zaza account works across Draft, Teach, and all apps

**Authentication Priority:**
- **Primary Method:** Email/password (ensures device compatibility, no OAuth dependencies)
- **Optional Method:** Google SSO (user convenience, faster signup)
- **Password Requirements:** 8+ characters, mixed case, number, special character
- **Session Duration:** 30 days persistent, refresh token rotation

**Security Rules Example (Firestore):**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Snippets are private to owner
    match /users/{userId}/snippets/{snippetId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Classes are private to owner
    match /users/{userId}/classes/{classId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Subscriptions readable by owner only
    match /subscriptions/{subscriptionId} {
      allow read: if request.auth != null && 
                  get(/databases/$(database)/documents/subscriptions/$(subscriptionId)).data.userId == request.auth.uid;
      allow write: if false; // Only backend can write
    }
  }
}
```

### 4.2 Data Privacy & Compliance

#### GDPR Compliance

**User Rights:**
1. **Right to Access:** Export all user data via `/export/userData` endpoint
2. **Right to Deletion:** Delete account and all associated data
3. **Right to Rectification:** Edit profile and data anytime
4. **Right to Data Portability:** Export in JSON/CSV format

**Data Minimization:**
- Collect only essential information
- No sensitive PII beyond email and name
- Student data: First name + last initial only
- No storage of assessment scores, behavioral records, or other sensitive education data

**Consent Management:**
- Clear privacy policy and terms of service
- Explicit consent for data processing during signup
- Option to opt out of analytics tracking
- Cookie consent banner (if using cookies)

#### FERPA Compliance (US Education Privacy)

**Principles:**
- No collection of personally identifiable student information (PII)
- Parent communications generated are teacher-owned, not stored student records
- School/district customers must review and approve Zaza Draft's privacy practices
- Data Processing Agreement (DPA) for institutional customers

**Student Data Handling:**
- Only store minimal student identifiers (first name + last initial)
- No grades, test scores, or protected education records
- Class Brain context is teacher-provided, not pulled from SIS
- Teachers control what context is shared with AI

### 4.3 Data Security

#### Encryption

**Data in Transit:**
- All API traffic over HTTPS/TLS 1.3
- Certificate pinning for mobile apps (post-MVP)

**Data at Rest:**
- Firestore automatic encryption at rest
- Cloud Storage encryption for exported files
- Encrypted backups

#### Secrets Management

- API keys stored in Firebase Environment Config
- Never commit secrets to repository
- Rotate API keys quarterly
- Use service accounts with least privilege

#### Rate Limiting & Abuse Prevention

**Implementation:**
- Redis-based rate limiting (if using Redis)
- Firebase quota enforcement
- Captcha for signup (optional)
- Monitoring for suspicious activity patterns

**Rate Limits:**
- API calls: 10 per minute per user (general)
- Snippet generation: 5 per hour for free tier, 100 per hour for Pro (burst protection)
- Export: 5 per day per user
- Login attempts: 5 per 15 minutes per IP

### 4.4 Incident Response Plan

**Security Incident Protocol:**
1. **Detection:** Monitoring alerts, user reports
2. **Assessment:** Severity, scope, data involved
3. **Containment:** Disable affected systems, revoke tokens
4. **Communication:** Notify affected users within 72 hours (GDPR requirement)
5. **Remediation:** Fix vulnerability, restore service
6. **Post-Mortem:** Document incident, improve safeguards

---

## 5. Performance & Scalability

### 5.1 Performance Targets

**Page Load Performance:**
- Time to Interactive (TTI): <3 seconds on 3G
- First Contentful Paint (FCP): <1.5 seconds
- Largest Contentful Paint (LCP): <2.5 seconds
- Cumulative Layout Shift (CLS): <0.1

**API Response Times:**
- Authentication: <500ms
- Snippet generation: <5 seconds (p95)
- Library queries: <1 second
- Export generation: <10 seconds for 100 snippets

### 5.2 Scalability Planning

**Current Architecture Capacity:**
- Firebase Firestore: 1M concurrent connections, 10K writes/second per database
- Cloud Functions: Auto-scales, 3000 concurrent executions per project
- OpenAI API: Rate limits vary by tier (approx 3000 RPM for paid)

**Projected Load (Year 1):**
- MAU: 10,000 users
- Snippet generations: 50,000/month
- API requests: ~200,000/month
- Database reads: ~500,000/month

**Current architecture sufficient for 100K+ users with optimizations**

### 5.3 Optimization Strategies

**Frontend:**
- Code splitting and lazy loading
- Image optimization (WebP, responsive images)
- Aggressive caching (service workers)
- CDN for static assets

**Backend:**
- Cache frequent queries (user profiles, class data)
- Batch operations where possible
- Database indexes on all query fields
- Connection pooling for external APIs

**AI Cost Optimization:**
- Use GPT-3.5-turbo for free tier (if cost becomes issue)
- Batch multiple generations in single request (if feasible)
- Cache common prompt patterns (controversial, may reduce quality)
- Monitor token usage and optimize prompts

### 5.4 Monitoring & Alerting

**Monitoring Stack:**
- Firebase Performance Monitoring (frontend performance)
- Cloud Functions logs and metrics
- Sentry for error tracking
- Uptime monitoring (UptimeRobot or Pingdom)

**Key Metrics to Monitor:**
- API error rates (>5% alert)
- Snippet generation failures (>10% alert)
- Database query latency (p95 >2s alert)
- OpenAI API rate limit hits
- Monthly cost vs. budget

**Alerts:**
- PagerDuty or email for critical issues
- Slack notifications for warnings
- Daily digest for non-urgent metrics

---

## 6. Testing Strategy

### 6.1 Testing Pyramid

**Unit Tests (60%):**
- React component tests (React Testing Library)
- Cloud Function logic tests (Jest)
- Utility function tests
- Target: >80% code coverage

**Integration Tests (30%):**
- API endpoint tests (full request/response cycle)
- Database operation tests
- OpenAI API integration tests (mocked)
- Authentication flows

**End-to-End Tests (10%):**
- Critical user flows (Cypress or Playwright)
  - Signup and onboarding
  - Generate and save snippet
  - Freemium upgrade flow
- Run on staging environment before production deploy

### 6.2 Test Coverage Requirements

**Minimum Coverage:**
- Unit tests: 80% line coverage
- Integration tests: All critical API endpoints
- E2E tests: All critical user paths

**CI/CD Integration:**
- All tests run on every PR
- Deployment blocked if tests fail
- Automated test reports in PR comments

### 6.3 AI Output Quality Testing

**Approach:**
- Human evaluation of sample outputs
- Test prompts across different tones and languages
- Regression tests for known hallucination patterns
- User feedback monitoring (low ratings trigger review)

**Test Cases:**
- Standard prompts (common scenarios)
- Edge cases (very short/long prompts, unusual requests)
- Multilingual outputs (native speaker review)
- Tone accuracy (does output match requested tone?)

---

## 7. Deployment & DevOps

### 7.1 Environment Strategy

**Environments:**
1. **Development:** Local machines, connects to dev Firebase project
2. **Staging:** Pre-production testing, mirrors production config
3. **Production:** Live user environment

**Configuration Management:**
- Environment variables for API keys, feature flags
- Firebase projects for each environment
- Separate Stripe test/live accounts

### 7.2 CI/CD Pipeline

**GitHub Actions Workflow:**

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm test -- --coverage
      - run: npm run test:e2e
  
  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Firebase Staging
        run: |
          npm run build:staging
          firebase deploy --only hosting,functions --project staging
  
  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Firebase Production
        run: |
          npm run build:production
          firebase deploy --only hosting,functions --project production
```

### 7.3 Rollback Strategy

**Automated Rollback:**
- Monitor error rates post-deployment
- Auto-rollback if error rate >10% above baseline

**Manual Rollback:**
- Firebase Hosting: Rollback to previous version in console
- Cloud Functions: Deploy previous version via CLI
- Database migrations: Have down-migration scripts ready

### 7.4 Database Migrations

**Firestore Migration Strategy:**
- Firestore is schema-less, so migrations are typically additive
- For breaking changes:
  1. Add new field alongside old field
  2. Dual-write to both fields
  3. Backfill old documents
  4. Update code to read from new field
  5. Remove old field (after grace period)

**Migration Tools:**
- Custom scripts for bulk updates
- Cloud Functions for triggered migrations
- Backup before any major migration

---

## 8. API Cost Analysis & Optimization

### 8.1 Cost Breakdown Estimates

**OpenAI API Costs (GPT-4 Turbo):**
- Input: ~$10 per 1M tokens
- Output: ~$30 per 1M tokens
- Average snippet generation: ~500 input tokens + 200 output tokens
- Cost per generation: ~$0.011 (1.1 cents)

**Firebase Costs (Free tier sufficient for MVP):**
- Firestore: 50K reads, 20K writes, 20K deletes/day free
- Cloud Functions: 2M invocations/month free
- Hosting: 10GB storage, 360MB/day transfer free
- Authentication: Free

**Estimated Monthly Costs (1,000 active users):**
- 1,000 users × 5 snippets/month = 5,000 generations
- OpenAI: 5,000 × $0.011 = $55/month
- Firebase: $0 (within free tier)
- **Total: ~$55/month**

**Scaling (10,000 active users):**
- 10,000 × 5 = 50,000 generations/month
- OpenAI: 50,000 × $0.011 = $550/month
- Firebase: ~$50/month (estimated overage)
- **Total: ~$600/month**

**With Pro users (20% conversion, unlimited):**
- Assume Pro users generate 20 snippets/month average
- 10,000 total users, 2,000 Pro (paying $12/month)
- Free: 8,000 × 5 = 40,000 generations
- Pro: 2,000 × 20 = 40,000 generations
- Total: 80,000 generations/month
- OpenAI: 80,000 × $0.011 = $880/month
- Revenue: 2,000 × $12 = $24,000/month
- **Gross margin: ~96%** (very healthy)

### 8.2 Cost Optimization Strategies

1. **Model Selection:**
   - Use GPT-3.5-turbo for free tier ($0.002/generation vs $0.011)
   - Reserve GPT-4 for Pro users or high-value scenarios

2. **Prompt Optimization:**
   - Reduce system prompt verbosity
   - Minimize unnecessary context inclusion

3. **Caching:**
   - Cache common prompt patterns (if feasible without quality loss)
   - Cache class context to avoid repeated lookups

4. **Rate Limiting:**
   - Enforce strict limits on free tier
   - Prevent abuse with per-user quotas

5. **Batch Processing:**
   - If OpenAI offers batch API (cheaper, slower), use for non-urgent generations

---

## 9. Development Roadmap & Milestones

### 9.1 Phase 1: MVP Development (8-10 weeks)

**Week 1-2: Foundation**
- [ ] Project setup (React, Firebase, CI/CD)
- [ ] Authentication implementation (Google OAuth, email/password)
- [ ] Basic UI components library (design system)
- [ ] Database schema implementation

**Week 3-4: Core Features**
- [ ] Prompt input interface
- [ ] Tone and language selection
- [ ] OpenAI API integration
- [ ] Snippet generation flow
- [ ] Preview and action buttons (copy, save, delete)

**Week 5-6: Snippet Management**
- [ ] Snippet library UI
- [ ] Filtering and search functionality
- [ ] Tagging system
- [ ] Edit functionality
- [ ] Export to CSV/PDF

**Week 7-8: Freemium & Gamification**
- [ ] Usage tracking and limits
- [ ] Upgrade modal and gate
- [ ] Stripe integration (checkout placeholder)
- [ ] Streak tracking
- [ ] Badges and milestones
- [ ] Onboarding flow

**Week 9: Class Brain**
- [ ] Class creation and management
- [ ] Student roster management
- [ ] Context integration in generation

**Week 10: Testing & Launch Prep**
- [ ] Unit and integration testing
- [ ] E2E test coverage
- [ ] Performance optimization
- [ ] Security audit
- [ ] Beta testing with 20-50 teachers
- [ ] Bug fixes and polish

### 9.2 Phase 2: Post-MVP Enhancements (Q2 2025)

- [ ] AI quality layer (second-pass QA agent)
- [ ] Advanced analytics dashboard
- [ ] Snippet packs (thematic templates)
- [ ] Community sharing (public snippets)
- [ ] Admin console (basic institutional features)

### 9.3 Phase 3: Scale & Expansion (Q3-Q4 2025)

- [ ] Mobile apps (iOS/Android)
- [ ] SIS integrations (Google Classroom, etc.)
- [ ] White-labeling for institutions
- [ ] Advanced admin features
- [ ] International expansion (more languages)

---

## 10. Open Questions & Decisions Needed

### 10.1 Technical Decisions

- [ ] **Low-code tool (FlutterFlow) vs. custom React?**
  - Recommendation: Custom React for flexibility and scalability
  
- [ ] **Firebase vs. Supabase?**
  - Recommendation: Firebase for faster MVP, better ecosystem
  
- [ ] **Self-hosted AI vs. OpenAI API?**
  - Recommendation: OpenAI API for MVP (cost-effective, reliable)
  
- [ ] **Monorepo vs. separate repos for frontend/backend?**
  - Recommendation: Monorepo for easier coordination
  
- [ ] **Testing framework for E2E: Cypress vs. Playwright?**
  - Recommendation: Playwright (better performance, cross-browser)

### 10.2 Product Decisions (Refer to PRD)

- [ ] Exact free tier limit (5 vs. 10 generations?)
- [ ] Pro pricing ($9, $12, or $15/month?)
- [ ] Geographic launch strategy (US first vs. international?)

### 10.3 Compliance & Legal

- [ ] Data Processing Agreement template for schools
- [ ] Privacy policy and terms of service legal review
- [ ] COPPA compliance (if targeting teachers of K-2)
- [ ] International data transfer mechanisms (GDPR)

---

## 11. Appendix

### 11.1 Glossary

- **Cloud Function:** Serverless function running on Firebase/GCP
- **Firestore:** NoSQL document database by Firebase
- **GPT-4 Turbo:** OpenAI's large language model API
- **JWT:** JSON Web Token for authentication
- **SPA:** Single Page Application
- **SSO:** Single Sign-On authentication
- **Rate Limiting:** Restricting API call frequency to prevent abuse

### 11.2 Reference Links

- [Firebase Documentation](https://firebase.google.com/docs)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [React Documentation](https://react.dev)
- [Stripe API Documentation](https://stripe.com/docs/api)

### 11.3 Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 2.0 | Oct 6, 2025 | **Major Update - Mandate & Cursor Rules Alignment**<br>• Added cross-app integration architecture (unified accounts, class sync, Zara continuity)<br>• Implemented multi-layer AI safety pipeline with fallback strategy<br>• Changed auth to Firebase email/password primary, Google OAuth optional<br>• Added new Firestore collections: `feedback`, `generation_logs`, `zaza_accounts`<br>• Added viral mechanics implementation (referral tracking, social sharing)<br>• Comprehensive compliance documentation added<br>• Updated pricing and cost analysis | Engineering Team |
| 1.0 | Oct 6, 2025 | Initial technical spec | Engineering Team |

### 11.4 Alignment with Zaza Mandate & Cursor Rules

#### Cursor Rules Compliance ✅

**Authentication (per Cursor Rules):**
- ✅ Firebase email/password as primary authentication method
- ✅ Google Auth as optional convenience feature
- ✅ Password requirements: 8+ chars, mixed case, number, special char
- ✅ Email verification required

**Database Structure (per Cursor Rules):**
- ✅ Firestore collections: `users`, `snippets`, `classes`, `subscriptions`
- ✅ Additional collections: `feedback`, `generation_logs`, `zaza_accounts`
- ✅ All collections properly indexed and secured
- ✅ Security rules enforce user-level data access

**AI Safety (per Cursor Rules):**
- ✅ Multi-layer safety pipeline with structured prompts
- ✅ GPT-4 primary with GPT-3.5-turbo fallback
- ✅ Hallucination prevention: fabrication detection, consistency checks
- ✅ Comprehensive logging of all generations for monitoring
- ✅ User feedback collection for quality improvement

**Error Handling:**
- ✅ Retry logic with exponential backoff
- ✅ Graceful degradation (GPT-4 → GPT-3.5)
- ✅ User-friendly error messages
- ✅ All errors logged with context

#### Zaza Mandate Compliance ✅

**Viral Mechanics (Mandate requirement):**
- ✅ Shareable snippet cards with Zaza branding
- ✅ Social sharing buttons (Twitter, Facebook, WhatsApp)
- ✅ Referral tracking system via Firestore
- ✅ Time-saved celebrations with share prompts
- ✅ "Made with Zaza" watermark on free tier exports

**Cross-App Integration (Ecosystem requirement):**
- ✅ Unified Zaza account system across Draft and Teach
- ✅ Shared authentication and billing
- ✅ Class roster sync between apps
- ✅ Zara assistant integration with cross-app context
- ✅ Snippet-to-lesson linking capability

**Smart Defaults (Pricing mandate):**
- ✅ Free tier: 5 generations/month (aligned)
- ✅ Pro tier: $7.50/month or $59/year (aligned with mandate)
- ✅ Clear upgrade prompts without being intrusive
- ✅ Freemium model designed for conversion

**Psychological Onboarding:**
- ✅ Emotional anchoring ("What's your biggest challenge?")
- ✅ Instant relief demo before profile setup
- ✅ First snippet guided with celebration
- ✅ Quick time-to-value (<3 minutes)

**Quality & Safety:**
- ✅ 5-layer safety pipeline
- ✅ <1% hallucination rate target
- ✅ >90% quality rating target
- ✅ Continuous monitoring and improvement

---

**Document Approvals:**

- [ ] Engineering Lead
- [ ] DevOps/Infrastructure Lead
- [ ] Security Lead
- [ ] Product Lead (PRD alignment)

**Next Review Date:** November 15, 2025
**Author:** Dr. Greg Blackburn

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
