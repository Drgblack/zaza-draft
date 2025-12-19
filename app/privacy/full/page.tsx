import Link from "next/link"
import { ArrowLeft, Shield } from "lucide-react"
import FooterSlim from "@/components/FooterSlim"

export default function PrivacyFullPage() {
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50/30 via-white to-pink-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col">
      <div className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-16 animate-[fadeIn_0.4s_ease-out]">
          <Link
            href="/privacy"
            className="inline-flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Privacy summary
          </Link>

          <article className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-violet-100 dark:border-slate-700 p-8 md:p-12 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-8 h-8 text-violet-600 dark:text-violet-400" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
                Privacy Policy (Full)
              </h1>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-8">Updated on: {today}</p>

            <div className="prose prose-slate dark:prose-invert max-w-none space-y-8">
              <section>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Who we are</h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  Zaza Draft is a product by Zaza Technologies. We help teachers write clearly and compassionately with
                  the support of AI.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                  What this policy covers
                </h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  This policy explains what data we collect, why we collect it, how we use it, and your rights.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Data we collect</h2>
                <ul className="list-disc pl-6 space-y-2 text-slate-700 dark:text-slate-300">
                  <li>Account data: name, email.</li>
                  <li>Usage data: app interactions, feature usage, diagnostics.</li>
                  <li>Document data: text you write or paste for the purpose of generating suggestions.</li>
                  <li>Support data: messages you send us.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">How we use your data</h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  We provide and improve the service, personalise suggestions, secure the platform, and communicate with
                  you about updates or support.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                  How long we keep data
                </h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  We retain account and billing data while your account is active and as required by law. You can
                  request deletion at any time.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">AI and your content</h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  We do not train foundation models on your writing. Processing is performed to provide suggestions and
                  then stored only as needed to deliver features you choose, such as saved drafts.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Legal bases (GDPR)</h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  Contract, legitimate interests, consent where required, and compliance with legal obligations.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Your rights</h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  You can request access, correction, deletion, restriction, or portability of your data. You can object
                  to certain processing. Contact us to exercise these rights.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                  International transfers
                </h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  We may process data outside your country. We use appropriate safeguards such as Standard Contractual
                  Clauses.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Security</h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  We use modern security practices including encryption in transit and at rest, least-privilege access,
                  and continuous monitoring.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Children</h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  Zaza Draft is for professional use by adults. Do not upload personal data about children.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                  Changes to this policy
                </h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  We may update this policy. We will post the new version with an updated date.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Contact</h2>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  Email:{" "}
                  <a
                    href="mailto:support@zazatechnologies.com"
                    className="text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-medium"
                  >
                    support@zazatechnologies.com
                  </a>
                  . We aim to respond within 72 hours.
                </p>
              </section>
            </div>
          </article>
        </div>
      </div>

      <FooterSlim />
    </div>
  )
}
