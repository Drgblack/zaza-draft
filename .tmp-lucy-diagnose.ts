import { evaluateDraftQuality } from './lib/draft/quality-evaluation'
import { evaluateProfessionalJudgement } from './lib/draft/professional-judgement'
import { classifyTeacherIntent, checkIntentPreservation } from './lib/draft/intent-classification'
import { detectRegisterViolations } from './lib/draft/register-accuracy'

const source = `Dear Lucy's Dad,
I understand that Lucy may feel more comfortable having her phone with her, but classroom rules are clear that phones are not used during lessons.
I can't make individual exceptions in the moment, as this would quickly become unmanageable across the class. I need to apply the same expectations consistently for all students.
I will continue to support Lucy in class, but these expectations will remain in place.
Regards,
Greg`

const candidate = `Dear Parent/Carer,
I understand your concerns about Lucy's needs in class. While I maintain consistent expectations for all students to ensure fairness, I'm committed to supporting Lucy within this framework.
I'd be happy to discuss how we can best help Lucy meet these expectations while ensuring she feels supported in her learning.
Kind regards,
Greg`

const quality = evaluateDraftQuality({
  sourceText: source,
  candidateText: candidate,
  language: 'en',
  teacherDraftMode: true,
  safetyAnalysis: null,
})
const sourceIntent = classifyTeacherIntent(source)
const candidateIntent = classifyTeacherIntent(candidate)
const intent = checkIntentPreservation({ sourceIntent, candidateIntent, sourceText: source, candidateText: candidate })
const judgement = evaluateProfessionalJudgement({
  sourceText: source,
  candidateText: candidate,
  sourceIntent: sourceIntent.intent,
  language: 'en',
  safetyAnalysis: null,
})
const register = detectRegisterViolations(candidate)
console.log(JSON.stringify({ quality, sourceIntent, candidateIntent, intent, judgement, register }, null, 2))
