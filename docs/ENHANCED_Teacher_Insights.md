### 3.3 Teacher Insights Dashboard (Enhanced)

**Goal.** Provide actionable, privacy-safe intelligence that helps teachers understand their productivity gains, communication patterns, and wellbeing signals—without exposing student PII.

**Dashboard Location:** Profile → Insights (default: last 7 days, toggle to 30/90 days)

---

#### **3.3.1 Core Metrics Display**

**Time Intelligence**
- **Total time saved** (week/month view)
  - Formula: `time_saved_minutes = (drafts × baseline_minutes) - (sum(generation_time_ms) / 60000)`
  - Baseline: 12 min/draft for reports, 8 min for emails, 15 min for recommendations
  - Transparent tooltip: "Based on teacher time-use studies (NCES 2020)"
- **Peak productivity hours** (heatmap visualization)
  - Shows when teacher generates most drafts
  - Insight: "You're most productive Tuesday afternoons—consider blocking that time"
- **Average response time** (prompt → usable draft)
  - Target: <30 seconds for 80% of generations
  - Trend indicator: improving/stable/declining

**Quality Signals**
- **Edit depth score** (0-100, higher = less editing needed)
  - Formula: `100 - (characters_changed / original_length × 100)`
  - Insight: "Your edit rate dropped 15% this month—growing confidence!"
- **One-shot success rate** (% of drafts used without regeneration)
  - Target: >70% after 10 drafts
- **Tone consistency** (variance in tone selection over time)
  - Flags: sudden shifts may indicate stress/context change

**Communication Patterns**
- **Draft type distribution** (report cards, parent emails, recommendations, incident reports)
  - Derived from prompt analysis (keyword extraction)
- **Tone usage over time** (stacked area chart)
  - Warm, Professional, Direct, Empathetic
  - Insight: "You used 'Empathetic' 40% more in difficult conversations this month"
- **Language diversity** (top 3 languages used)
  - Celebrate multilingual support: "You communicated in 3 languages this week!"

---

#### **3.3.2 Wellbeing & Work-Life Balance Indicators**

**Boundary Signals** (opt-in, privacy-first)
- **After-hours drafting** (% of drafts created 7pm-7am or weekends)
  - Warning threshold: >30% of drafts after hours
  - Zara nudge: "You've drafted 5 times this Sunday—consider scheduling responses instead"
- **Late-night spike detection** (drafts after 10pm)
  - Trigger: 3+ consecutive late nights
  - Intervention: "Taking care of yourself? Here are some boundary-setting tips."
- **Consecutive days active** (streak tracking)
  - Celebrate: 5-day streaks
  - Concern: 14+ day streaks without break → wellbeing check-in

**Stress Indicators** (derived, never exposed as "stress score")
- **Regeneration frequency** (avg attempts per draft)
  - Baseline: 1.2 attempts
  - Alert: >2.0 suggests difficulty finding right words
- **Edit intensity** (substantial rewrites vs. minor tweaks)
  - High edit intensity + late hours = potential burnout signal
- **Difficult conversation density** (% of "empathetic" + "direct" tones)
  - Spike detection: >50% challenging tones in 1 week
  - Support: "This week had tough conversations—you handled them well"

---

#### **3.3.3 Growth & Achievement Tracking**

**Confidence Progression**
- **Edit rate trajectory** (declining over time = growing trust)
  - Visualization: Line graph with trend line
  - Milestone: "Your first 10 drafts averaged 8 edits. Your last 10 averaged 3!"
- **Feature adoption curve** (tags, Class Brain, tone experimentation)
  - Insight: "You started using Class Brain—personalization improved 25%"

**Milestones & Badges** (gamification, but meaningful)
- **Time Reclaimed badges**
  - Bronze: 2 hours saved
  - Silver: 10 hours saved
  - Gold: 50 hours saved
- **Consistency badges**
  - "5-Week Streak" (used Draft 5 weeks in a row)
  - "Weekend Warrior Retired" (reduced weekend drafting by 50%)
- **Mastery badges**
  - "Tone Master" (used all 4 tones effectively)
  - "Multilingual Champion" (drafted in 3+ languages)
  - "One-Shot Wonder" (90% first-draft success rate for 1 month)

**Personal Goals** (user-defined)
- Teachers set custom goals:
  - "Reduce weekend work by 30 minutes/week"
  - "Respond to parent emails within 24 hours"
  - "Write all report cards in one session instead of 3"
- Progress tracking with weekly check-ins
- Celebration when achieved + share option

---

#### **3.3.4 Comparative Context (Non-Competitive)**

**Anonymized Benchmarks** (opt-in data sharing)
- "Teachers using Draft save an average of 3.2 hours/week"
- "Your edit rate is better than 68% of users in your grade level"
- "Most teachers see their best results on [Tuesday afternoons]"

**Trend Analysis**
- Month-over-month comparison (personal)
  - "This month vs. last: +40% efficiency, -20% after-hours work"
- Seasonal patterns
  - "Report card season: You saved 6 extra hours this quarter"

---

#### **3.3.5 Actionable Recommendations**

**Usage Optimization**
- "You regenerate often on parent emails—try the 'Empathetic' tone first"
- "Your Wednesday drafts have 50% fewer edits—schedule heavy writing then"
- "Class Brain increases your one-shot rate by 35%—add more student context"

**Wellbeing Suggestions**
- "You drafted 4 times after 10pm this week—consider these time-saving strategies"
- "Difficult conversations spiked—here are self-care resources"
- "You're working weekends—explore our scheduling features to protect your time"

**Feature Discovery**
- "You haven't tried bulk export yet—save 10 minutes on report card compilation"
- "Tag your snippets to find them 80% faster next time"

---

#### **3.3.6 Export & Portability**

**CSV Export** (Settings → Privacy → Download My Data)
- Fields: date, drafts_count, time_saved_min, avg_generation_ms, tone_warm, tone_professional, tone_direct, tone_empathetic, languages_used, edit_rate
- No PII, no raw text, aggregated only
- Download completes in <2 seconds

**PDF Summary** (monthly recap, shareable)
- Formatted dashboard snapshot
- Highlights: top achievement, most-used feature, time saved
- Opt-in: Share anonymized data to improve Zaza

---

#### **3.3.7 Privacy & Transparency**

**Data Minimization**
- Dashboard uses only: generation timestamps, tone/language selections, edit events, regeneration counts
- Never stores: raw prompt text, generated snippets, student identifiers
- Aggregated daily (no hourly tracking for privacy)

**Transparency Tooltips**
- Every metric has "How is this calculated?" explanation
- Time-saved formula visible inline
- Benchmark methodology disclosed

**Consent Controls**
- Analytics opt-in toggle (Settings → Privacy)
- Clear explanation: "Help improve Zaza by sharing anonymized usage patterns"
- Opt-out: All analytics stop immediately, historical data retained but not updated

---

#### **3.3.8 Technical Requirements**

**Performance**
- Dashboard loads in <1 second (cached daily rollups)
- Real-time metrics: drafts today, current streak
- Historical metrics: pre-aggregated in metrics_daily collection

**Responsiveness**
- Mobile-optimized (collapsed cards, swipeable sections)
- Desktop: 2-column layout with expandable detail views

**Accessibility**
- WCAG 2.1 AA compliant
- Screen reader friendly (all charts have text alternatives)
- High contrast mode support

---

#### **3.3.9 Success Metrics for Insights Feature**

**Engagement**
- **Insights page weekly reach:** ≥40% of WAU
- **CSV export adoption:** ≥10% of active teachers in first 60 days
- **Goal-setting feature usage:** ≥25% of Pro users set at least one goal
- **Badge unlock rate:** Average 2 badges per active user by Month 3

**Impact**
- **Verified time saved (self-report survey):** Median ≥30 min/week
- **Wellbeing intervention effectiveness:** ≥60% of nudged users reduce after-hours work
- **Feature discovery via recommendations:** ≥30% of users try suggested features

**Retention**
- **Users who view Insights 2+ times:** 60% higher 30-day retention
- **Goal-setters conversion rate:** 2× higher free-to-Pro conversion

---

#### **3.3.10 Out of Scope (MVP)**

- Admin/institutional analytics (school-wide dashboards)
- Predictive modeling (churn risk, burnout forecasting)
- Peer comparison (teacher-to-teacher benchmarking)
- Integration with external tools (export to Google Sheets, etc.)
- A/B test framework for recommendations
- Natural language insights ("Ask Zara about my usage")

---

**Why This Matters**

The enhanced Insights Dashboard transforms Draft from a utility into a **reflective companion** that helps teachers understand not just what they're doing, but how they're working and whether they're thriving. By combining productivity metrics with wellbeing signals, we differentiate from commodity AI tools and deliver on the Zaza promise: **teacher wellbeing through intelligent automation**.
