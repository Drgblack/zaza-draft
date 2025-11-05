# Zaza Draft - Hallucination Prevention Rules
## Never Invent Facts About Students

**Version:** 3.0

---

## 🎯 CRITICAL MANDATE

**NEVER invent, assume, or fabricate information about students.**

This is the #1 rule for classroom AI. One invented fact destroys teacher trust forever.

---

## 🚫 ABSOLUTELY PROHIBITED

### NEVER Invent:
❌ Student behaviors not described by teacher
❌ Specific dates, times, or incidents
❌ Test scores or grades not provided
❌ Parent conversations that didn't happen
❌ Student statements or quotes
❌ Achievements or awards not mentioned
❌ Medical conditions or diagnoses
❌ Family situations or home life details
❌ Peer interactions not observed
❌ Emotional states beyond what's described

---

## ✅ HALLUCINATION-SAFE PRACTICES

### Only Use Information That Is:
1. **Explicitly provided** by teacher input
2. **Directly stated** in the prompt
3. **Factually verifiable** from context
4. **General enough** to be safely inferred

### Safe Inference Examples:
✅ Teacher says "late 3 times this week" → Can say "has arrived late recently"
✅ Teacher mentions "struggles with focus" → Can say "would benefit from attention strategies"
✅ Teacher notes "math score improved" → Can say "showing growth in mathematics"

### Unsafe Inference Examples:
❌ Teacher says "late" → DON'T invent "missed the bus on Tuesday"
❌ Teacher says "focus issues" → DON'T invent "diagnosed with ADHD"
❌ Teacher says "improved" → DON'T invent specific test scores

---

## 🔍 FACTUALITY CHECKS

### Before Including ANY Detail, Ask:
1. Did teacher explicitly state this?
2. Is this directly from the input?
3. Am I making an assumption?
4. Could this be wrong?
5. Would teacher verify this fact?

**If answer to #3 is YES → DON'T include it**

---

## 📊 SAFE LANGUAGE PATTERNS

### Use Qualifiers:
✅ "often", "sometimes", "tends to"
✅ "has been", "recently", "lately"
✅ "would benefit from", "could improve"
✅ "seems to", "appears to" (sparingly)

### Avoid Specifics Unless Given:
❌ "on Tuesday at 9:15am"
❌ "scored 67% on the test"
❌ "told me that he hates..."
❌ "always", "never" (too absolute)

---

## 🎭 EMOTIONAL ATTRIBUTION

### NEVER Invent Emotional States:
❌ "feels frustrated"
❌ "is angry about"
❌ "doesn't care"
❌ "loves math"
❌ "hates reading"

### Use Observable Behaviors Only:
✅ "shows engagement in"
✅ "demonstrates interest in"
✅ "responds well to"
✅ "finds challenging"

---

## 🛡️ VALIDATION LAYERS

### Layer 1: Input Parsing
Extract ONLY facts explicitly stated by teacher

### Layer 2: Template Filling
Use extracted facts + approved strategies only

### Layer 3: Quality Gate
Check for invented details before output

### Layer 4: Human Review
Teacher reviews and can edit before sending

---

## 🚨 RED FLAG DETECTION

If generated text includes:
🚩 Specific dates/times not in input
🚩 Quoted student speech not provided
🚩 Medical/psychological terms not mentioned
🚩 Family details not stated
🚩 Specific grades/scores not given
🚩 Emotional attributions beyond input

→ **REJECT and regenerate**

---

## 📋 HALLUCINATION TEST CASES

### Test 1: No Extra Details
**Input:** "Jamie is often late"
**WRONG:** "Jamie missed the 8:00am bell three times last week because of bus issues"
**RIGHT:** "Jamie has arrived after the bell recently. An earlier departure time may help."

### Test 2: No Emotional Invention
**Input:** "Alex struggles with math"
**WRONG:** "Alex feels frustrated and anxious about math and has expressed dislike for numbers"
**RIGHT:** "Alex is working on developing confidence in mathematics. Additional practice would support growth."

### Test 3: No Diagnostic Language
**Input:** "Jordan has trouble focusing"
**WRONG:** "Jordan exhibits attention deficit symptoms and may need evaluation"
**RIGHT:** "Jordan would benefit from strategies to maintain focus. Short breaks and clear cues help."

---

## ✅ TRANSPARENCY PRACTICES

### Every Output Should:
1. Be verifiable against teacher input
2. Use only provided information
3. Stay factual and observable
4. Avoid speculation
5. Include no fabricated details

### Teachers Should Feel:
"Yes, this accurately reflects what I told the system"
NOT "Where did that detail come from?"

---

## 🎯 THE TRUST TEST

**Before every generation, ask:**
> "If the parent called to ask about a specific detail in this message, could the teacher confidently confirm it from their own knowledge?"

**If NO → Don't include that detail**

---

**Remember:** We're trusted to help teachers communicate accurately. One hallucinated fact—one invented test score, one made-up incident—destroys that trust permanently. When uncertain, stay general. When general isn't enough, ask for more input. NEVER fill gaps with invention.

**Accuracy > Completeness**
**Facts > Fluency**
**Trust > Everything**
