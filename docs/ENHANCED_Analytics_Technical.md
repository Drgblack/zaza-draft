## 2.3 Analytics & Metrics Schema (Enhanced)

### **2.3.1 Core Collections**

#### **Users Collection Extension**
```typescript
interface User {
  // ... existing fields ...
  
  // Analytics & Insights additions
  analyticsOptIn: boolean;              // GDPR/consent flag
  privacySettings: {
    acceptedAt: Timestamp;
    version: string;                    // e.g., "1.0"
    shareAnonymizedData: boolean;       // For benchmarking
  };
  
  // Wellbeing tracking (derived, not user-input)
  wellbeingSignals?: {
    afterHoursRate: number;             // % of drafts after 7pm
    consecutiveDaysActive: number;
    lastBoundaryNudge?: Timestamp;      // Prevent nudge spam
  };
  
  // Personalization for recommendations
  usagePatterns?: {
    peakProductivityHour: number;       // 0-23
    preferredTones: string[];           // Most-used tones
    avgEditDepth: number;               // Rolling 30-day avg
  };
}
```

#### **Events Collection** (append-only log)
```typescript
// Path: events/{eventId}
interface AnalyticsEvent {
  eventId: string;                      // Auto-generated
  uid: string;                          // User reference
  type: EventType;                      // See enum below
  timestamp: Timestamp;
  
  // Context for debugging/analysis
  context: {
    screen?: string;                    // e.g., "home", "snippets"
    version?: string;                   // App version
    platform?: "web" | "ios" | "android";
    sessionId?: string;                 // For journey tracking
  };
  
  // Event-specific properties
  properties: Record<string, any>;      // Flexible payload
  
  // Server metadata
  receivedAt: number;                   // Server timestamp (ms)
  processedAt?: number;                 // When rolled up
}

enum EventType {
  // Generation events
  "draft.create",
  "draft.generate.start",
  "draft.generate.success",            // { generationTimeMs, tokenCount, modelUsed }
  "draft.generate.error",              // { errorCode, errorMessage }
  "draft.regenerate",                  // { attemptNumber }
  
  // Quality signals
  "draft.edit.start",
  "draft.edit.save",                   // { editDepth, charactersChanged }
  "draft.copy",
  "draft.delete",
  
  // Context usage
  "classbrain.used",                   // { studentCount, customFieldsUsed }
  "tone.select",                       // { toneId, previousTone }
  "language.select",                   // { languageCode }
  
  // Library interactions
  "snippet.save",
  "snippet.tag.add",                   // { tagName }
  "snippet.search",                    // { query, resultsCount }
  "snippet.export",                    // { format: "csv" | "pdf" }
  
  // Insights engagement
  "insights.view",                     // { timeRange: "7d" | "30d" | "90d" }
  "insights.export.csv",
  "insights.goal.set",                 // { goalType, targetValue }
  "insights.badge.unlock",             // { badgeId }
  
  // Wellbeing signals
  "session.start",
  "session.end",                       // { durationMs }
  "boundary.alert.shown",              // { alertType: "late_night" | "weekend" }
  "boundary.alert.dismissed",
  
  // Conversion funnel
  "paywall.shown",                     // { trigger: "limit_reached" | "premium_feature" }
  "paywall.dismissed",
  "checkout.started",
  "checkout.completed",                // { plan, amount }
  
  // Viral mechanics
  "share.initiated",                   // { platform: "twitter" | "facebook" }
  "share.completed",
  "referral.sent",                     // { referralCode }
  "referral.converted",                // { referrerUid }
}
```

#### **Metrics Daily Collection** (pre-aggregated rollups)
```typescript
// Path: metrics_daily/{uid}_{YYYY-MM-DD}
interface DailyMetrics {
  uid: string;
  date: string;                         // "YYYY-MM-DD"
  
  // Volume metrics
  draftsCreated: number;
  draftsRegenerated: number;
  draftsEdited: number;
  draftsCopied: number;
  snippetsSaved: number;
  
  // Performance metrics
  avgGenerationTimeMs: number;
  p95GenerationTimeMs: number;          // 95th percentile
  totalTokensUsed: number;              // Cost tracking
  
  // Quality metrics
  avgEditDepth: number;                 // 0-100 scale
  oneShotSuccessRate: number;           // % without regeneration
  
  // Tone distribution
  tones: {
    warm: number;
    professional: number;
    direct: number;
    empathetic: number;
  };
  
  // Language distribution
  languages: Record<string, number>;    // { "en": 5, "es": 2 }
  
  // Time-based patterns
  hourDistribution: number[];           // 24-element array
  afterHoursDrafts: number;             // Count of drafts 7pm-7am
  weekendDrafts: number;
  
  // Feature adoption
  classBrainUsageCount: number;
  tagsCreated: number;
  exportsPerformed: number;
  
  // Session data
  sessionCount: number;
  totalActiveTimeMs: number;            // Sum of session durations
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;                 // For reprocessing
}
```

#### **Cohorts Collection** (for retention analysis)
```typescript
// Path: cohorts/{cohortId}
interface Cohort {
  cohortId: string;                     // "2025-W42" (weekly cohorts)
  startDate: string;                    // "2025-10-13"
  endDate: string;                      // "2025-10-19"
  
  userCount: number;                    // Users who joined this week
  userIds: string[];                    // Array of UIDs
  
  // Acquisition metadata
  channels: Record<string, number>;     // { "organic": 45, "referral": 12 }
  
  // Retention tracking (updated weekly)
  retention: {
    week0: number;                      // 100% (baseline)
    week1: number;                      // % of cohort active in week 1
    week2: number;
    week4: number;
    week8: number;
    week12: number;
  };
  
  // Conversion tracking
  conversionRate: number;               // % who became Pro
  avgDaysToConversion: number;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### **Funnel Tracking Collection**
```typescript
// Path: funnels/{uid}_{funnelType}
interface FunnelProgress {
  uid: string;
  funnelType: "onboarding" | "activation" | "conversion";
  
  steps: {
    stepId: string;                     // e.g., "profile_setup"
    completedAt?: Timestamp;
    abandoned?: boolean;
    metadata?: Record<string, any>;
  }[];
  
  currentStep: number;                  // Index in steps array
  completed: boolean;
  completedAt?: Timestamp;
  
  // Attribution
  acquisitionChannel?: string;
  referrerUid?: string;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

---

### **2.3.2 Security Rules**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users can read their own analytics opt-in status
    match /users/{uid} {
      allow read: if request.auth.uid == uid;
      allow write: if request.auth.uid == uid;
    }
    
    // Events are write-only via API (no direct client access)
    match /events/{eventId} {
      allow read: if false;                   // Server-side only
      allow write: if false;                  // API only
    }
    
    // Daily metrics are read-only for users, write-only via cloud function
    match /metrics_daily/{docId} {
      allow read: if request.auth.uid == docId.split('_')[0];
      allow write: if false;                  // Cloud Function only
    }
    
    // Cohorts are admin-only
    match /cohorts/{cohortId} {
      allow read: if false;
      allow write: if false;
    }
    
    // Funnels are system-managed
    match /funnels/{funnelId} {
      allow read: if false;
      allow write: if false;
    }
  }
}
```

---

### **2.3.3 Indexes**
```javascript
// events collection
{
  "fields": [
    { "fieldPath": "uid", "order": "ASCENDING" },
    { "fieldPath": "type", "order": "ASCENDING" },
    { "fieldPath": "timestamp", "order": "DESCENDING" }
  ]
}

{
  "fields": [
    { "fieldPath": "receivedAt", "order": "ASCENDING" },
    { "fieldPath": "processedAt", "order": "ASCENDING" }
  ]
}

// metrics_daily collection
{
  "fields": [
    { "fieldPath": "uid", "order": "ASCENDING" },
    { "fieldPath": "date", "order": "DESCENDING" }
  ]
}

// cohorts collection
{
  "fields": [
    { "fieldPath": "startDate", "order": "DESCENDING" }
  ]
}
```

---

### **2.3.4 Data Retention & Lifecycle**

| Collection | Retention Period | Deletion Method |
|------------|------------------|-----------------|
| `events` | 90 days | TTL policy (auto-delete) |
| `metrics_daily` | Indefinite (aggregated) | Manual on account deletion |
| `cohorts` | Indefinite (anonymized) | N/A (no PII) |
| `funnels` | 1 year | Cloud Function cleanup job |
| User snippets | Until user deletes | Cascade on account deletion |

**GDPR Compliance:**
- Right to access: `/api/export/my-data` endpoint
- Right to deletion: Cascade delete on account removal
- Data portability: CSV export with all metrics_daily records

---

### **2.3.5 Cost Optimization**

**Firestore Read/Write Estimates (1,000 MAU):**
- Events writes: ~50,000/day (50 events/user/day avg)
- Metrics daily reads: ~7,000/day (7 days × 1,000 users)
- Metrics daily writes: ~1,000/day (daily rollup)

**Estimated Monthly Cost:**
- Firestore: ~\ (1.5M writes, 210K reads)
- Cloud Functions: ~\ (rollup jobs)
- Storage: <\ (minimal)
**Total: ~\/month for 1,000 MAU**

**Scaling Strategy:**
- At 10K MAU: Move to BigQuery for historical analytics (\/month)
- At 50K MAU: Implement event batching and sampling for free tier

---
