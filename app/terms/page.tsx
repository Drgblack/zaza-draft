import Link from "next/link"
import { ArrowLeft, FileText } from "lucide-react"
import FooterSlim from "@/components/FooterSlim"

export default function TermsPage() {
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
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-8 h-8 text-violet-600 dark:text-violet-400" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
                Terms of Service
              </h1>
            </div>

            <div className="prose prose-slate dark:prose-invert max-w-none">
              <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed">
                By using Zaza Draft, you agree to use it responsibly, with respect for students and colleagues. Zaza
                Technologies provides the service as-is and reserves the right to update its terms.
              </p>

              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-8 mb-4">Acceptable Use</h2>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                Zaza Draft is designed for educational communication. You agree not to use the service for any unlawful
                purpose, to generate harmful content, or to violate the privacy of students or colleagues.
              </p>

              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-8 mb-4">
                Your Responsibilities
              </h2>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                You are responsible for reviewing and editing all AI-generated content before use. Zaza Draft is a tool
                to assist, not replace, your professional judgment.
              </p>

              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-8 mb-4">Service Changes</h2>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                We may update, modify, or discontinue features at any time. We'll notify you of significant changes via
                email or in-app notifications.
              </p>

              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-8 mb-4">
                Limitation of Liability
              </h2>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                Zaza Technologies provides the service "as is" without warranties. We are not liable for any damages
                arising from your use of the service.
              </p>
            </div>
          </article>
        </div>
      </div>

      <FooterSlim />
    </div>
  )
}
