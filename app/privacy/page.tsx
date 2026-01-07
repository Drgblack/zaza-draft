import Link from "next/link"
import { ArrowLeft, Shield } from "lucide-react"

export default function PrivacyPage() {
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
              <Shield className="w-8 h-8 text-violet-600 dark:text-violet-400" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
                Privacy Policy
              </h1>
            </div>

            <div className="prose prose-slate dark:prose-invert max-w-none">
              <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed">
                Your data stays private. We never train AI models on your writing. Everything you write is processed
                securely and deleted when you choose.
              </p>

              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-8 mb-4">What We Collect</h2>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                We collect only what's necessary to provide the service: your email address, document content (processed
                in real-time), and usage analytics to improve the product.
              </p>

              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-8 mb-4">
                How We Protect Your Data
              </h2>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                All data is encrypted in transit and at rest. We use industry-standard security practices and never
                share your content with third parties for training or marketing purposes.
              </p>

              <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mt-8 mb-4">Student Privacy</h2>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                Zaza Draft is designed to work without requiring any personally identifiable information about students.
                We recommend removing student names and other identifying details before using the service.
              </p>

              <div className="mt-12">
                <Link
                  href="/privacy/full"
                  className="inline-flex items-center gap-2 text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-medium transition-colors"
                >
                  View full privacy policy →
                </Link>
              </div>
            </div>
          </article>
        </div>
      </div>

    </div>
  )
}
