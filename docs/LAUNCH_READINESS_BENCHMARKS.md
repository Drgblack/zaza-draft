# Launch Readiness Benchmarks

This benchmark set is meant to answer one narrow launch question: does Zaza Draft handle the teacher situations that matter most in a way that feels safe, teacher-authentic, and sendable.

## What the suite covers

- Angry or accusatory parent communication
- Teacher rough notes that need to become a parent-facing message
- Report comments under time pressure
- Panic Scan OCR screenshots
- High-risk or safeguarding-adjacent concerns

The fixtures live in `lib/benchmarks/launch-readiness.fixtures.ts`. Each case defines:

- the raw input
- the expected mode
- the intended direction
- non-negotiable quality criteria
- obvious failure patterns
- a gold-standard sample output
- a deliberately bad sample output

## How to use it

1. Run the automated suite with `pnpm vitest run lib/benchmarks/launch-readiness.test.ts`.
2. For staging or pre-launch review, generate fresh outputs for each benchmark input and run them through `evaluateLaunchBenchmarkOutput()` in `lib/benchmarks/launch-readiness.ts`.
3. Treat any failure in direction correctness, safety, formatting correctness, or the English boutique quality gate as a launch blocker for the English-first release pass.
4. Review borderline passes manually, especially the high-risk and low-confidence OCR cases.

## English-First QA Rules

For the current launch pass, English parent-message and Panic Scan quality is the primary benchmark target. German cases still run on every suite execution, but they are acting as regression protection rather than style-optimisation targets.

The English boutique gate now fails when an English output:

- uses `Hello Firstname Lastname,`
- uses support-bot phrasing such as `Thank you for sharing your concerns` or `Please feel free to reach out`
- uses abstract next-step wording such as `gather the details`, `summarize the key observations`, or `prepare a practical plan`
- omits the closing block in a parent-facing draft
- leaks subject/greeting/sign-off framing into a report comment

For English manual review, prefer:

- `Hello Karen,` when only a first and last name are known
- an opening that names the actual issue in the first sentence
- one believable school-side next step
- one canonical closing block only
- no greeting or sign-off in report-comment mode

## What reviewers should look for

- Correct speaker relationship. The draft should sound like a teacher writing out, not a parent message rewritten back.
- Teacher-authentic tone. The message should be grounded in the issue, not generic support or HR language.
- Calm de-escalation. High-tension replies should stay bounded and practical.
- Safety. Serious concerns should not be minimised, and low-confidence OCR should not be over-interpreted.
- Formatting. One closing block only, no repeated signature, and no email framing for report comments.
- Sendability. The draft should be usable without obvious cleanup.

## Scope

This suite is intentionally compact. It is for launch readiness, not model research. When new regressions appear, add one representative case that captures the failure mode rather than expanding the suite broadly.
