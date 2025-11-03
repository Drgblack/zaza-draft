"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header title="Terms of Service" subtitle="Last updated: January 2025" />

      <div className="bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 py-8 px-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/">
            <Button
              variant="outline"
              className="mb-4 border-white/30 bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm transition-all duration-150 focus-visible:ring-2 focus-visible:ring-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          {/* Removed title and subtitle from here */}
        </div>
      </div>

      <div className="flex-1 max-w-4xl mx-auto px-6 py-12 w-full">
        <div className="space-y-10">
          <section>
            <h2 className="text-xl font-semibold mb-4 text-purple-600 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 text-sm font-bold">
                1
              </span>
              Acceptance of Terms
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground pl-10">
              By accessing and using Zaza Draft, you accept and agree to be bound by the terms and provision of this
              agreement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-purple-600 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 text-sm font-bold">
                2
              </span>
              Description of Service
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground pl-10">
              Zaza Draft provides AI-powered communication assistance for teachers, including draft generation,
              templates, analytics, and wellbeing tracking.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-purple-600 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 text-sm font-bold">
                3
              </span>
              User Accounts
            </h2>
            <ul className="list-disc pl-16 space-y-2 text-base text-muted-foreground">
              <li>You must create an account to use Zaza Draft</li>
              <li>You are responsible for maintaining the confidentiality of your account</li>
              <li>You must provide accurate information</li>
              <li>One account per user</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-purple-600 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 text-sm font-bold">
                4
              </span>
              Acceptable Use
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground pl-10 mb-3">You agree to:</p>
            <ul className="list-disc pl-16 space-y-2 text-base text-muted-foreground">
              <li>Use Zaza Draft for educational communication purposes</li>
              <li>Provide accurate information when describing situations</li>
              <li>Not misuse or abuse the service</li>
              <li>Respect intellectual property rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-purple-600 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 text-sm font-bold">
                5
              </span>
              Content Ownership
            </h2>
            <ul className="list-disc pl-16 space-y-2 text-base text-muted-foreground">
              <li>You retain ownership of content you create</li>
              <li>Generated drafts are your property</li>
              <li>We use anonymized data to improve the service (with your permission)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-purple-600 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 text-sm font-bold">
                6
              </span>
              Privacy
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground pl-10">
              Your use of Zaza Draft is also governed by our{" "}
              <Link
                href="/privacy"
                className="text-purple-600 hover:text-purple-700 underline underline-offset-2 transition-colors"
              >
                Privacy Policy
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-purple-600 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 text-sm font-bold">
                7
              </span>
              Subscription and Billing
            </h2>
            <ul className="list-disc pl-16 space-y-2 text-base text-muted-foreground">
              <li>Free tier: 10 drafts per month</li>
              <li>Premium tier: Unlimited drafts plus additional features</li>
              <li>Billing is monthly or annual</li>
              <li>Cancellation policy: Cancel anytime, no refunds for partial months</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-purple-600 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 text-sm font-bold">
                8
              </span>
              Limitation of Liability
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground pl-10">
              Zaza Draft is provided "as is" without warranties of any kind. We are not liable for any damages arising
              from your use of the service. You use Zaza Draft at your own risk.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-purple-600 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 text-sm font-bold">
                9
              </span>
              Changes to Terms
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground pl-10">
              We may update these terms from time to time. Continued use constitutes acceptance of updated terms. We
              will notify you of significant changes via email or in-app notification.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 text-purple-600 flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 text-sm font-bold">
                10
              </span>
              Contact
            </h2>
            <div className="text-base leading-relaxed text-muted-foreground pl-10 space-y-3">
              <p>
                Questions about these terms? Contact us at{" "}
                <a
                  href="mailto:legal@zazatechnologies.com"
                  className="text-purple-600 hover:text-purple-700 underline underline-offset-2 transition-colors"
                >
                  legal@zazatechnologies.com
                </a>
              </p>
              <div className="text-sm">
                <p className="font-semibold mb-1">Company Information</p>
                <p>
                  <strong>Zaza Technologies UG (haftungsbeschränkt)</strong>
                  <br />
                  Gumbertstraße 150
                  <br />
                  40229 Düsseldorf, Germany
                  <br />
                  Email: legal@zazatechnologies.com
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  )
}
