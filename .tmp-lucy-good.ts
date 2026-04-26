import { evaluateDraftQuality } from './lib/draft/quality-evaluation'
import { evaluateProfessionalJudgement } from './lib/draft/professional-judgement'

const source = `Dear Lucy's Dad,
I understand that Lucy may feel more comfortable having her phone with her, but classroom rules are clear that phones are not used during lessons.
I can't make individual exceptions in the moment, as this would quickly become unmanageable across the class. I need to apply the same expectations consistently for all students.
I will continue to support Lucy in class, but these expectations will remain in place.
Regards,
Greg`

const candidate = `Dear Parent/Carer,
Thank you for getting in touch.
I understand that Lucy may feel more comfortable having her phone with her, and I will continue to support her sensitively in class.
The classroom expectation is that phones are not used during lessons. I apply this consistently so that expectations remain clear and fair for all students.
Kind regards,
Greg`

const quality = evaluateDraftQuality({ sourceText: source, candidateText: candidate, language: 'en', teacherDraftMode: true, safetyAnalysis: null })
const judgement = evaluateProfessionalJudgement({ sourceText: source, candidateText: candidate, sourceIntent: 'limit', language: 'en', safetyAnalysis: null })
console.log(JSON.stringify({ quality, judgement }, null, 2))
