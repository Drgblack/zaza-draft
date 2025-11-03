# Zaza Draft - Analytics & Insights API Specification

**Version:** 1.0  
**Last Updated:** November 2, 2025  
**Document Owner:** Backend Engineering Team  
**Base URL:** `https://api.zazadraft.com/v1`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Events API](#events-api)
3. [Insights API](#insights-api)
4. [Export API](#export-api)
5. [Analytics Administration](#analytics-administration)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [Data Models](#data-models)

---

## Authentication

All API endpoints require Firebase Authentication.

**Headers Required:**
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
```

**Token Validation:**
- Verify Firebase ID token on every request
- Extract `uid` from verified token
- Check user's `analyticsOptIn` status before processing analytics events

---

## Events API

### POST /api/events/ingest

**Purpose:** Ingest user interaction events for analytics processing.

**Authentication:** Required (Firebase ID token)

**Request Headers:**
```
Authorization: Bearer <firebase_id_token>
Content-Type: application/json
X-Client-Version: 1.0.0 (optional)
X-Platform: web|ios|android (optional)
```

**Request Body:**
```json
{
  "events": [
    {
      "type": "draft.generate.success",
      "timestamp": "2025-11-02T14:30:00.000Z",
      "properties": {
        "generationTimeMs": 1250,
        "tokenCount": 150,
        "modelUsed": "gpt-4-turbo",
        "tone": "empathetic",
        "language": "en"
      },
      "context": {
        "screen": "home",
        "sessionId": "sess_abc123xyz"
      }
    }
  ]
}
```

**Event Types & Required Properties:**

| Event Type | Required Properties | Optional Properties |
|------------|---------------------|---------------------|
| `draft.create` | - | `promptLength: number` |
| `draft.generate.start` | - | `tone: string, language: string` |
| `draft.generate.success` | `generationTimeMs: number` | `tokenCount: number, modelUsed: string` |
| `draft.generate.error` | `errorCode: string` | `errorMessage: string` |
| `draft.regenerate` | `attemptNumber: number` | `previousTone: string` |
| `draft.edit.start` | - | - |
| `draft.edit.save` | `editDepth: number` | `charactersChanged: number` |
| `draft.copy` | - | - |
| `draft.delete` | - | - |
| `tone.select` | `toneId: string` | `previousTone: string` |
| `language.select` | `languageCode: string` | - |
| `insights.view` | `timeRange: string` | - |
| `insights.export.csv` | - | - |
| `insights.goal.set` | `goalType: string, targetValue: any` | - |
| `badge.unlock` | `badgeId: string` | - |
| `session.start` | - | - |
| `session.end` | `durationMs: number` | - |

**Response 200 (Success):**
```json
{
  "ok": true,
  "processed": 1,
  "eventIds": ["evt_abc123xyz"]
}
```

**Response 200 (Ignored - Analytics Opt-Out):**
```json
{
  "ok": true,
  "ignored": true,
  "reason": "User has analytics disabled"
}
```

**Response 400 (Bad Request):**
```json
{
  "error": {
    "code": "INVALID_EVENT_TYPE",
    "message": "Event type 'invalid.type' is not recognized",
    "details": {
      "validTypes": ["draft.create", "draft.generate.success", "..."]
    }
  }
}
```

**Response 401 (Unauthorized):**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired Firebase token"
  }
}
```

**Response 429 (Rate Limited):**
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Limit: 20 req/min",
    "retryAfter": 45
  }
}
```

**Rate Limit:** 20 requests per minute per user

**Implementation Notes:**
- Validate event schema before writing to Firestore
- Set `receivedAt` timestamp on server side
- Write to `events/{eventId}` collection
- Return immediately (don't wait for processing)
- Log all validation errors for monitoring

**Batch Processing:**
- Accept up to 50 events per request
- Process atomically (all or none for data consistency)
- Return array of event IDs on success

---

## Insights API

### GET /api/insights/weekly

**Purpose:** Retrieve aggregated weekly insights for the authenticated user.

**Authentication:** Required (Firebase ID token)

**Query Parameters:**
- `weeks` (optional): Number of weeks to retrieve (default: 1, max: 12)
- `includeComparison` (optional): Include week-over-week comparison (default: false)

**Example Request:**
```
GET /api/insights/weekly?weeks=4&includeComparison=true
```

**Response 200 (Success):**
```json
{
  "uid": "user_abc123",
  "dateRange": {
    "start": "2025-10-06",
    "end": "2025-11-02"
  },
  "items": [
    {
      "date": "2025-11-02",
      "draftsCreated": 18,
      "draftsRegenerated": 3,
      "draftsEdited": 5,
      "draftsCopied": 15,
      "avgGenerationTimeMs": 1180,
      "p95GenerationTimeMs": 2400,
      "avgEditDepth": 8,
      "oneShotSuccessRate": 83,
      "tones": {
        "warm": 7,
        "professional": 5,
        "direct": 2,
        "empathetic": 4
      },
      "languages": {
        "en": 16,
        "es": 2
      },
      "afterHoursDrafts": 3,
      "weekendDrafts": 2,
      "totalActiveTimeMs": 1800000,
      "timeSavedMinutes": 142
    }
  ],
  "comparison": {
    "draftsCreated": {
      "current": 18,
      "previous": 12,
      "change": 50,
      "trend": "up"
    },
    "timeSavedMinutes": {
      "current": 142,
      "previous": 95,
      "change": 49.5,
      "trend": "up"
    }
  },
  "aggregates": {
    "totalDrafts": 72,
    "totalTimeSavedMinutes": 568,
    "avgEditDepth": 7.5,
    "topTone": "warm",
    "topLanguage": "en"
  }
}
```

**Response 404 (No Data):**
```json
{
  "error": {
    "code": "NO_DATA_AVAILABLE",
    "message": "No insights available for this time period",
    "details": {
      "reason": "User has created fewer than 5 drafts"
    }
  }
}
```

**Performance Target:** p95 < 150ms

**Implementation Notes:**
- Read from pre-aggregated `metrics_daily` collection
- Cache results for 5 minutes (reduce Firestore reads)
- Return empty array if user has `analyticsOptIn = false`
- Calculate `timeSavedMinutes` using formula: `drafts * 12 - (avgGenTimeMs / 60000 * drafts)`

---

### GET /api/insights/dashboard

**Purpose:** Retrieve complete dashboard data optimized for frontend rendering.

**Authentication:** Required (Firebase ID token)

**Query Parameters:**
- `range` (required): `7d` | `30d` | `90d`

**Example Request:**
```
GET /api/insights/dashboard?range=30d
```

**Response 200 (Success):**
```json
{
  "uid": "user_abc123",
  "dateRange": {
    "start": "2025-10-03",
    "end": "2025-11-02",
    "days": 30
  },
  "heroMetrics": {
    "timeSaved": {
      "value": 568,
      "unit": "minutes",
      "trend": {
        "percentage": 15,
        "direction": "up",
        "comparisonPeriod": "previous_30d"
      }
    },
    "draftsCreated": {
      "value": 72,
      "usedWithoutEdits": 58,
      "successRate": 80.6
    },
    "currentStreak": {
      "days": 5,
      "longestStreak": 12
    },
    "qualityScore": {
      "value": 92,
      "trend": {
        "points": 5,
        "direction": "up"
      }
    }
  },
  "communicationPatterns": {
    "timeHeatmap": [
      {
        "day": "Monday",
        "hours": [0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 5, 4, 2, 3, 4, 5, 3, 2, 1, 0, 0, 0, 0, 0]
      },
      {
        "day": "Tuesday",
        "hours": [0, 0, 0, 0, 0, 0, 0, 2, 3, 5, 8, 6, 4, 5, 7, 8, 5, 3, 2, 1, 0, 0, 0, 0]
      },
      {
        "day": "Wednesday",
        "hours": [0, 0, 0, 0, 0, 0, 0, 1, 3, 4, 6, 5, 3, 4, 6, 7, 4, 2, 1, 0, 0, 0, 0, 0]
      }
    ],
    "peakProductivityHour": 14,
    "toneDistribution": {
      "warm": 40,
      "professional": 30,
      "empathetic": 20,
      "direct": 10
    },
    "afterHoursRate": 18
  },
  "growthMetrics": {
    "editRateTrend": [
      { "week": "Week 1", "editRate": 65 },
      { "week": "Week 2", "editRate": 45 },
      { "week": "Week 3", "editRate": 30 },
      { "week": "Week 4", "editRate": 20 }
    ],
    "confidenceScore": 85
  },
  "badges": [
    {
      "id": "time_bronze",
      "name": "Time Reclaimed - Bronze",
      "description": "Saved 2 hours",
      "unlocked": true,
      "unlockedAt": "2025-10-15T10:30:00Z",
      "icon": "trophy"
    },
    {
      "id": "streak_5week",
      "name": "5-Week Streak",
      "unlocked": false,
      "progress": 60,
      "target": 100,
      "icon": "flame"
    },
    {
      "id": "tone_master",
      "name": "Tone Master",
      "description": "Used all 4 tones effectively",
      "unlocked": false,
      "progress": 75,
      "target": 100,
      "icon": "palette"
    }
  ],
  "recommendations": [
    {
      "id": "rec_001",
      "type": "usage_optimization",
      "title": "Try 'Empathetic' tone first",
      "description": "You regenerate often on parent emails. Using 'Empathetic' first could save time.",
      "actionLabel": "Update preferences",
      "actionUrl": "/settings/preferences",
      "priority": "high"
    },
    {
      "id": "rec_002",
      "type": "scheduling",
      "title": "Protect your Wednesday flow",
      "description": "Your Wednesday drafts have 50% fewer edits. Consider scheduling heavy writing then.",
      "actionLabel": "Set reminder",
      "actionUrl": "/calendar/block-time",
      "priority": "medium"
    },
    {
      "id": "rec_003",
      "type": "feature_discovery",
      "title": "Unlock Class Brain",
      "description": "Add student context to increase your one-shot rate by 35%",
      "actionLabel": "Learn more",
      "actionUrl": "/features/class-brain",
      "priority": "medium"
    }
  ],
  "wellbeingSignals": {
    "optedIn": true,
    "afterHoursRate": 18,
    "status": "healthy",
    "alerts": []
  }
}
```

**Response 403 (Analytics Disabled):**
```json
{
  "error": {
    "code": "ANALYTICS_DISABLED",
    "message": "User has disabled analytics",
    "action": "Enable analytics in Settings to view insights"
  }
}
```

**Performance Target:** p95 < 200ms

**Caching Strategy:**
- Cache for 5 minutes per user
- Invalidate on new draft creation
- Use CDN edge caching where possible

---

## Export API

### GET /api/export/my-data.csv

**Purpose:** Export user's aggregated analytics data in CSV format for GDPR compliance.

**Authentication:** Required (Firebase ID token)

**Query Parameters:**
- `startDate` (optional): ISO date string (default: account creation date)
- `endDate` (optional): ISO date string (default: today)

**Example Request:**
```
GET /api/export/my-data.csv?startDate=2025-01-01&endDate=2025-11-02
```

**Response 200 (Success):**
```
Content-Type: text/csv
Content-Disposition: attachment; filename="zaza_insights_2025-11-02.csv"

date,drafts,avgGenTimeMs,warm,professional,direct,empathetic,languages,timeSavedMin,editDepth
2025-10-01,5,1200,2,2,0,1,en,58,12
2025-10-02,8,1150,3,3,1,1,"en,es",94,8
2025-10-03,6,1100,2,3,0,1,en,70,10
```

**Response 204 (No Data):**
- Returns empty CSV with headers only

**Performance Target:** Complete download in ≤ 2 seconds for 1 year of data

**Implementation Notes:**
- Query `metrics_daily` collection filtered by date range
- Stream CSV generation (don't load all data into memory)
- Include only aggregated data (no PII, no raw text)
- Set appropriate cache headers (no caching for privacy)

---

### POST /api/export/pdf-report

**Purpose:** Generate a formatted PDF summary report (monthly recap feature).

**Authentication:** Required (Firebase ID token)

**Request Body:**
```json
{
  "month": "2025-10",
  "includeCharts": true
}
```

**Response 200 (Success):**
```json
{
  "url": "https://storage.googleapis.com/zaza-exports/reports/user_abc123_2025-10.pdf",
  "expiresAt": "2025-11-02T23:59:59Z",
  "fileSize": 245678
}
```

**Response 202 (Accepted - Processing):**
```json
{
  "jobId": "export_job_xyz789",
  "status": "processing",
  "estimatedCompletionTime": "2025-11-02T14:35:00Z",
  "pollUrl": "/api/export/status/export_job_xyz789"
}
```

**Implementation Notes:**
- Generate PDFs asynchronously using Cloud Functions
- Store in Cloud Storage with 7-day expiration
- Return signed URL for download
- Include: hero metrics, charts, achievements, recommendations

---

## Analytics Administration

### GET /api/admin/analytics/cohorts

**Purpose:** Retrieve cohort analysis data (admin/product team only).

**Authentication:** Required (Admin role)

**Authorization:** 
```
X-Admin-Key: <admin_api_key>
Authorization: Bearer <firebase_admin_token>
```

**Query Parameters:**
- `cohortId` (optional): Specific cohort to retrieve
- `startWeek` (optional): ISO week string (e.g., "2025-W42")
- `endWeek` (optional): ISO week string

**Response 200:**
```json
{
  "cohorts": [
    {
      "cohortId": "2025-W42",
      "startDate": "2025-10-13",
      "userCount": 145,
      "channels": {
        "organic": 65,
        "referral": 40,
        "paid": 25,
        "partnership": 15
      },
      "retention": {
        "week0": 100,
        "week1": 62,
        "week2": 48,
        "week4": 35,
        "week8": 28
      },
      "conversionRate": 8.3,
      "avgDaysToConversion": 21
    }
  ]
}
```

**Rate Limit:** 100 requests per hour per admin user

---

### POST /api/admin/analytics/rollup

**Purpose:** Manually trigger daily metrics rollup (for backfilling or corrections).

**Authentication:** Required (Admin role)

**Request Body:**
```json
{
  "date": "2025-11-01",
  "reprocess": true
}
```

**Response 202:**
```json
{
  "jobId": "rollup_job_abc123",
  "status": "queued",
  "message": "Rollup job scheduled for 2025-11-01"
}
```

---

## Error Handling

### Standard Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context"
    },
    "timestamp": "2025-11-02T14:30:00.000Z",
    "requestId": "req_abc123xyz"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or expired token |
| `FORBIDDEN` | 403 | User lacks permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `INVALID_REQUEST` | 400 | Malformed request body |
| `INVALID_EVENT_TYPE` | 400 | Unrecognized event type |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |
| `SERVICE_UNAVAILABLE` | 503 | Temporary outage |

### Error Handling Best Practices

**Client-Side:**
- Always check response status codes
- Parse error messages for user display
- Implement exponential backoff for 429/503 errors
- Log `requestId` for support tickets

**Server-Side:**
- Include `requestId` in all error responses
- Log full error context (stack trace, user ID, request payload)
- Monitor error rates by endpoint
- Alert on elevated 5xx errors

---

## Rate Limiting

### Per-User Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/events/ingest` | 20 requests | per minute |
| `/api/insights/*` | 60 requests | per minute |
| `/api/export/my-data.csv` | 5 requests | per hour |
| `/api/export/pdf-report` | 3 requests | per hour |

### Response Headers

All rate-limited endpoints return these headers:

```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 1699123456
```

### Rate Limit Exceeded Response

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please retry after 45 seconds.",
    "retryAfter": 45,
    "limit": 20,
    "window": "1 minute"
  }
}
```

### Implementation

- Use Redis for distributed rate limiting
- Key format: `ratelimit:{endpoint}:{uid}:{window}`
- Sliding window algorithm
- Exempt Pro users from stricter limits (optional)

---

## Data Models

### Event Model

```typescript
interface AnalyticsEvent {
  eventId: string;
  uid: string;
  type: EventType;
  timestamp: string; // ISO 8601
  properties: Record<string, any>;
  context?: {
    screen?: string;
    sessionId?: string;
    version?: string;
    platform?: 'web' | 'ios' | 'android';
  };
  receivedAt: number; // Unix timestamp (ms)
}

enum EventType {
  DRAFT_CREATE = 'draft.create',
  DRAFT_GENERATE_START = 'draft.generate.start',
  DRAFT_GENERATE_SUCCESS = 'draft.generate.success',
  DRAFT_GENERATE_ERROR = 'draft.generate.error',
  DRAFT_REGENERATE = 'draft.regenerate',
  DRAFT_EDIT_START = 'draft.edit.start',
  DRAFT_EDIT_SAVE = 'draft.edit.save',
  DRAFT_COPY = 'draft.copy',
  DRAFT_DELETE = 'draft.delete',
  TONE_SELECT = 'tone.select',
  LANGUAGE_SELECT = 'language.select',
  INSIGHTS_VIEW = 'insights.view',
  INSIGHTS_EXPORT_CSV = 'insights.export.csv',
  INSIGHTS_GOAL_SET = 'insights.goal.set',
  BADGE_UNLOCK = 'badge.unlock',
  SESSION_START = 'session.start',
  SESSION_END = 'session.end',
}
```

### Dashboard Metrics Model

```typescript
interface DashboardMetrics {
  uid: string;
  dateRange: {
    start: string;
    end: string;
    days: number;
  };
  heroMetrics: HeroMetrics;
  communicationPatterns: CommunicationPatterns;
  growthMetrics: GrowthMetrics;
  badges: Badge[];
  recommendations: Recommendation[];
  wellbeingSignals: WellbeingSignals;
}

interface HeroMetrics {
  timeSaved: {
    value: number;
    unit: 'minutes';
    trend: Trend;
  };
  draftsCreated: {
    value: number;
    usedWithoutEdits: number;
    successRate: number;
  };
  currentStreak: {
    days: number;
    longestStreak: number;
  };
  qualityScore: {
    value: number;
    trend: {
      points: number;
      direction: 'up' | 'down' | 'stable';
    };
  };
}

interface Trend {
  percentage: number;
  direction: 'up' | 'down' | 'stable';
  comparisonPeriod: string;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  target?: number;
  icon: string;
}

interface Recommendation {
  id: string;
  type: 'usage_optimization' | 'scheduling' | 'feature_discovery' | 'wellbeing';
  title: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
  priority: 'high' | 'medium' | 'low';
}
```

### Daily Metrics Model

```typescript
interface DailyMetrics {
  uid: string;
  date: string; // YYYY-MM-DD
  draftsCreated: number;
  draftsRegenerated: number;
  draftsEdited: number;
  draftsCopied: number;
  snippetsSaved: number;
  avgGenerationTimeMs: number;
  p95GenerationTimeMs: number;
  totalTokensUsed: number;
  avgEditDepth: number;
  oneShotSuccessRate: number;
  tones: {
    warm: number;
    professional: number;
    direct: number;
    empathetic: number;
  };
  languages: Record<string, number>;
  hourDistribution: number[]; // 24-element array
  afterHoursDrafts: number;
  weekendDrafts: number;
  classBrainUsageCount: number;
  tagsCreated: number;
  exportsPerformed: number;
  sessionCount: number;
  totalActiveTimeMs: number;
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
}
```

---

## Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Set up Firebase Cloud Functions project
- [ ] Implement JWT token verification middleware
- [ ] Create Firestore security rules for all collections
- [ ] Set up Redis for rate limiting
- [ ] Configure CORS for allowed frontend domains

### Phase 2: Events API
- [ ] Implement `/api/events/ingest` endpoint
- [ ] Create event validation schemas (Zod or Joi)
- [ ] Set up event batching logic
- [ ] Implement rate limiting (20 req/min per user)
- [ ] Create event processing queue

### Phase 3: Insights API
- [ ] Implement `/api/insights/weekly` endpoint
- [ ] Implement `/api/insights/dashboard` endpoint
- [ ] Create daily metrics rollup Cloud Function
- [ ] Set up cron job for nightly aggregation (2am UTC)
- [ ] Implement caching layer (5-minute TTL)

### Phase 4: Export API
- [ ] Implement `/api/export/my-data.csv` endpoint
- [ ] Implement CSV streaming for large datasets
- [ ] Implement `/api/export/pdf-report` endpoint
- [ ] Set up Cloud Storage bucket for PDF exports
- [ ] Configure signed URLs with 7-day expiration

### Phase 5: Admin Features
- [ ] Implement `/api/admin/analytics/cohorts` endpoint
- [ ] Create admin authentication middleware
- [ ] Implement `/api/admin/analytics/rollup` endpoint
- [ ] Set up admin dashboard (optional)

### Phase 6: Monitoring & Testing
- [ ] Set up error tracking (Sentry or Cloud Error Reporting)
- [ ] Configure performance monitoring
- [ ] Write integration tests for all endpoints
- [ ] Set up alerting for elevated error rates
- [ ] Create load testing suite
- [ ] Document API in Postman/Swagger

### Phase 7: Launch Readiness
- [ ] Security audit of all endpoints
- [ ] GDPR compliance review
- [ ] Performance benchmarking (meet p95 targets)
- [ ] Create runbook for common issues
- [ ] Train support team on API functionality

---

## Additional Resources

### Sample Postman Collection
[Link to Postman collection with example requests]

### OpenAPI/Swagger Specification
[Link to OpenAPI 3.0 spec file]

### Firebase Setup Guide
[Link to step-by-step Firebase configuration]

### Testing Strategy Document
[Link to testing approach and test cases]

---

**Document Version:** 1.0  
**Last Review:** November 2, 2025  
**Next Review:** December 2, 2025  
**Change Log:** Initial version

---

## Support & Questions

For technical questions about this API specification, contact:
- **Engineering Lead:** [email]
- **Product Owner:** [email]
- **Slack Channel:** #zaza-draft-api
