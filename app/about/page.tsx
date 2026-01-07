import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50/30 via-white to-pink-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col">
      <div className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-16 animate-[fadeIn_0.4s_ease-out]">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Zaza Draft
          </Link>

          <article className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-violet-100 dark:border-slate-700 p-8 md:p-12 shadow-sm">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent mb-6">
              About Zaza Draft
            </h1>

            <div className="prose prose-slate dark:prose-invert max-w-none">
              <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed">
                Zaza Draft helps teachers communicate with clarity and compassion. Designed by educators, powered by AI,
                it lightens the load of written communication so teachers can focus on what matters most — their
                students.
              </p>

              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-8 mb-4">Our Mission</h2>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                We believe that teachers deserve tools that respect their expertise and amplify their voice. Zaza Draft
                is built to support, not replace, the human touch that makes great teaching possible.
              </p>

              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-8 mb-4">
                Built by Educators
              </h2>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                Every feature in Zaza Draft comes from real classroom experience. We understand the time pressures,
                emotional labor, and high standards that define teaching today.
              </p>

              <div className="mt-12 p-6 bg-gradient-to-br from-violet-50 to-pink-50 dark:from-violet-950/30 dark:to-pink-950/30 rounded-xl border border-violet-200 dark:border-violet-800">
                <p className="text-center text-slate-700 dark:text-slate-300 font-medium">
                  Write with heart. Teach with clarity.
                </p>
              </div>
            </div>
          </article>
        </div>
      </div>

    </div>
  )
}
