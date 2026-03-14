import type { DraftLanguage, DraftMode } from "@/lib/types"
import type { MessageDirection } from "@/lib/generation/classification"

export interface TeacherAuthenticityBenchmark {
  id: string
  language: DraftLanguage
  mode: DraftMode
  direction: MessageDirection
  shouldReject: string
  shouldAccept: string
}

export const TEACHER_AUTHENTICITY_BENCHMARKS: TeacherAuthenticityBenchmark[] = [
  {
    id: "en-parent-homework-reply",
    language: "en",
    mode: "parent_message",
    direction: "parent_to_teacher",
    shouldReject:
      "Thank you for sharing your concerns about the homework load. I understand how important this is, and it might be helpful to discuss gentle support next week.",
    shouldAccept:
      "I have checked the homework set this week and can see why it felt heavy at home. I will trim tomorrow's follow-up task and speak with Noah in class so the workload is clearer.",
  },
  {
    id: "en-panic-angry-accusation",
    language: "en",
    mode: "parent_message",
    direction: "parent_to_teacher",
    shouldReject:
      "Thank you for sharing your concern; my priority is to address it calmly and respectfully. As a next step, I will gather the details, summarize the key observations, and prepare a practical plan.",
    shouldAccept:
      "Thank you for bringing this to my attention. I will speak with the staff involved this morning and look into what happened, then I will come back to you with an update.",
  },
  {
    id: "en-panic-safety-concern",
    language: "en",
    mode: "parent_message",
    direction: "parent_to_teacher",
    shouldReject:
      "I understand how important this is and want to respond carefully. I will keep an eye on it tomorrow and it might be helpful to discuss gentle support once I have summarized the key observations.",
    shouldAccept:
      "I'm sorry to hear that Mia felt unsafe today. I am speaking with the staff involved straight away and checking exactly what happened so I can update you as soon as I can.",
  },
  {
    id: "en-panic-grading-complaint",
    language: "en",
    mode: "parent_message",
    direction: "parent_to_teacher",
    shouldReject:
      "Thank you for sharing your concerns about the grade. I will prepare a practical plan and keep the focus on supporting your child.",
    shouldAccept:
      "Thank you for flagging this. I will look back over the marked work this afternoon and come back to you once I have checked how the grade was applied.",
  },
  {
    id: "en-safe-draft-notes",
    language: "en",
    mode: "parent_message",
    direction: "teacher_internal_notes",
    shouldReject:
      "Thank you for raising this with me. I want to respond carefully and keep the focus on supporting your child as we move forward.",
    shouldAccept:
      "I wanted to update you on the late homework this week. Sam completed the classwork, but the home tasks were rushed, so I will break the next piece into smaller steps.",
  },
  {
    id: "en-routine-parent-message",
    language: "en",
    mode: "parent_message",
    direction: "teacher_to_parent",
    shouldReject:
      "I understand how important this is for your family, and I will gather the details, monitor the situation, and please feel free to reach out if it might be helpful to discuss.",
    shouldAccept:
      "Ava settled well into the new reading group today and joined in more confidently. I will keep the same routine in place next week and let you know if anything changes.",
  },
  {
    id: "en-voice-to-calm",
    language: "en",
    mode: "parent_message",
    direction: "teacher_internal_notes",
    shouldReject:
      "I want to reply with care because I understand how overwhelming this feels. It might be helpful to discuss this in a calm space.",
    shouldAccept:
      "I wanted to follow up on today's incident. I spoke with Maya after the lesson, and I will seat her closer to me tomorrow so I can reset expectations quickly.",
  },
  {
    id: "en-report-comment",
    language: "en",
    mode: "report_comment",
    direction: "report_comment",
    shouldReject:
      "Dear parent, thank you for sharing your concerns. The student is on an important journey and please feel free to reach out.",
    shouldAccept:
      "Luca contributes readily during class discussion and now checks his written work more carefully. He is beginning to sustain attention for longer independent tasks.",
  },
  {
    id: "en-report-comment-progress-plus-concern",
    language: "en",
    mode: "report_comment",
    direction: "report_comment",
    shouldReject:
      "Jane continues to make progress in reading and is a valued member of the class. She works well when supported.",
    shouldAccept:
      "Jane reads with growing fluency and contributes thoughtful ideas during guided discussion. She still needs to slow down when recording her answers so that her written work matches the quality of her oral responses.",
  },
  {
    id: "en-report-comment-mixed-performance",
    language: "en",
    mode: "report_comment",
    direction: "report_comment",
    shouldReject:
      "Ethan is making steady progress overall. With continued support, he has the potential to produce stronger written work.",
    shouldAccept:
      "Ethan explains mathematical thinking clearly in class and is more willing to attempt unfamiliar problems. His written recording remains less consistent, so he needs to set out his methods more carefully in independent work.",
  },
  {
    id: "en-report-comment-behaviour-social",
    language: "en",
    mode: "report_comment",
    direction: "report_comment",
    shouldReject:
      "Amira is a valued member of the class and continues to make progress socially. She works well when supported.",
    shouldAccept:
      "Amira has become more settled in group tasks and now listens more carefully to the views of others. She still needs reminders to manage frustration appropriately when activities do not go her way straight away.",
  },
  {
    id: "en-report-comment-high-achieving",
    language: "en",
    mode: "report_comment",
    direction: "report_comment",
    shouldReject:
      "Oliver continues to make progress across the curriculum and has the potential to achieve highly. He is a valued member of the class.",
    shouldAccept:
      "Oliver produces thoughtful, well-organised work and applies feedback quickly to improve it further. He contributes maturely in discussion and often extends ideas beyond the task expectations.",
  },
  {
    id: "en-report-comment-additional-support",
    language: "en",
    mode: "report_comment",
    direction: "report_comment",
    shouldReject:
      "Mia is making steady progress and works well when supported. With continued support, she has the potential to improve further.",
    shouldAccept:
      "Mia is more willing to join in whole-class learning and responds positively to clear routines. She still needs regular scaffolding to organise her ideas independently, particularly when writing at length.",
  },
  {
    id: "de-parent-homework-reply",
    language: "de",
    mode: "parent_message",
    direction: "parent_to_teacher",
    shouldReject:
      "Vielen Dank, dass Sie Ihre Sorge geteilt haben. Es könnte hilfreich sein, wenn wir gemeinsam für mehr Ruhe und Klarheit sorgen.",
    shouldAccept:
      "Ich habe mir die Hausaufgaben dieser Woche noch einmal angesehen und kann nachvollziehen, dass der Umfang zu hoch wirkte. Ich passe die nächste Aufgabe kürzer an und bespreche den Arbeitsplan morgen mit Leon.",
  },
  {
    id: "de-panic-defensive-parent",
    language: "de",
    mode: "parent_message",
    direction: "parent_to_teacher",
    shouldReject:
      "Vielen Dank, dass Sie Ihre Sorge geteilt haben. Mir ist wichtig, dass wir diesen Punkt gemeinsam ernst nehmen, und ich werde die Details zusammentragen und die Situation beobachten.",
    shouldAccept:
      "Danke, dass Sie mir das so offen geschrieben haben. Ich schaue mir die Situation mit den beteiligten Kolleginnen noch heute an und melde mich dann zeitnah bei Ihnen zurück.",
  },
  {
    id: "de-safe-draft-notes",
    language: "de",
    mode: "parent_message",
    direction: "teacher_internal_notes",
    shouldReject:
      "Vielen Dank für Ihre Nachricht. Ich möchte ruhig und sorgfältig darauf eingehen und die Situation behutsam begleiten.",
    shouldAccept:
      "Ich möchte Ihnen eine kurze Rückmeldung zu Emmas Start in die Woche geben. Sie hat im Unterricht konzentriert gearbeitet, braucht bei den schriftlichen Aufgaben aber noch klare Zwischenschritte.",
  },
  {
    id: "de-routine-parent-message",
    language: "de",
    mode: "parent_message",
    direction: "teacher_to_parent",
    shouldReject:
      "Ich verstehe, wie wichtig das ist. Melden Sie sich gern, wenn es hilfreich wäre, darüber zu sprechen.",
    shouldAccept:
      "Jonas hat sich heute deutlich ruhiger auf die Gruppenarbeit eingelassen und seinen Partner gut unterstützt. Ich halte diese Sitzordnung zunächst bei, weil sie ihm im Moment gut hilft.",
  },
  {
    id: "de-voice-to-calm",
    language: "de",
    mode: "parent_message",
    direction: "teacher_internal_notes",
    shouldReject:
      "Ich möchte behutsam antworten und gemeinsam für mehr Ruhe und Klarheit sorgen. Es könnte hilfreich sein, dies bald zu besprechen.",
    shouldAccept:
      "Ich wollte mich nach dem heutigen Vormittag kurz melden. Nach der Pause fiel es Mila schwer, wieder in die Aufgabe zu finden, deshalb beginne ich morgen mit einer klaren kurzen Wiederholung.",
  },
  {
    id: "de-report-comment",
    language: "de",
    mode: "report_comment",
    direction: "report_comment",
    shouldReject:
      "Liebe Eltern, vielen Dank für Ihre Nachricht. Melden Sie sich gern, wenn Sie noch Fragen haben.",
    shouldAccept:
      "Nora arbeitet zunehmend ausdauernd und beteiligt sich sachlich an Unterrichtsgesprächen. Bei längeren Schreibaufgaben zeigt sie mehr Sicherheit als zu Beginn des Halbjahres.",
  },
]
