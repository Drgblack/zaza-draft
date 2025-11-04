"use client";
export const revalidate = 0;

import { Button } from "@/components/ui/button"
import { ArrowLeft, Lock, BarChart, Brain, Shield, Key, Cookie, Users, Globe, FileText, Mail } from "lucide-react"
import Link from "next/link"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header title="Privacy Policy" subtitle="Your privacy matters to us" />

      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-8">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-bold">Your Privacy Matters to Us</h1>
          <p className="text-sm mt-2 text-purple-100">Last updated: January 2025</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Back button */}
        <Link href="/">
          <Button
            variant="outline"
            className="mb-8 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>

        {/* Content sections */}
        <div className="space-y-10 text-foreground">
          <section className="bg-muted/30 rounded-lg p-6 border border-muted">
            <div className="flex items-start gap-3 mb-3">
              <Shield className="w-6 h-6 text-purple-600 mt-1 flex-shrink-0" />
              <h2 className="text-2xl font-semibold text-foreground">Our Commitment to Privacy</h2>
            </div>
            <p className="text-base leading-relaxed text-muted-foreground ml-9">
              At Zaza Technologies, we take your privacy seriously. This policy explains how we collect, use, and
              protect your data.
            </p>
          </section>

          <section>
            <div className="flex items-start gap-3 mb-4">
              <FileText className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
              <h2 className="text-xl font-semibold text-foreground">1. Information We Collect</h2>
            </div>

            <div className="ml-8 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Account Information:</h3>
                <ul className="list-disc pl-6 space-y-2 text-base text-muted-foreground">
                  <li>Name, email, school, grade level, subjects taught</li>
                  <li>Password (encrypted)</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                  <BarChart className="w-4 h-4 text-purple-600" />
                  Usage Data:
                </h3>
                <ul className="list-disc pl-6 space-y-2 text-base text-muted-foreground">
                  <li>Drafts you generate (stored securely)</li>
                  <li>Templates you use</li>
                  <li>Analytics metrics (time saved, streaks, etc.)</li>
                  <li>Settings and preferences</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">Technical Data:</h3>
                <ul className="list-disc pl-6 space-y-2 text-base text-muted-foreground">
                  <li>Device information</li>
                  <li>Browser type</li>
                  <li>IP address (anonymized)</li>
                  <li>Cookies for authentication and preferences</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-start gap-3 mb-4">
              <Brain className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
              <h2 className="text-xl font-semibold text-foreground">2. How We Use Your Data</h2>
            </div>
            <p className="text-base leading-relaxed text-muted-foreground mb-3 ml-8">We use your information to:</p>
            <ul className="list-disc pl-14 space-y-2 text-base text-muted-foreground">
              <li>Provide Zaza Draft services</li>
              <li>Generate personalized drafts and suggestions</li>
              <li>Calculate analytics and insights</li>
              <li>Improve our AI models (with anonymized data only)</li>
              <li>Send important updates and notifications (with your permission)</li>
            </ul>
          </section>

          <section>
            <div className="flex items-start gap-3 mb-4">
              <Shield className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
              <h2 className="text-xl font-semibold text-foreground">3. Data Sharing</h2>
            </div>
            <div className="ml-8 space-y-4">
              <div>
                <p className="text-base leading-relaxed text-muted-foreground mb-2 font-semibold">We DO NOT:</p>
                <ul className="list-disc pl-6 space-y-2 text-base text-muted-foreground">
                  <li>Sell your data to third parties</li>
                  <li>Share your drafts with anyone</li>
                  <li>Use your data for advertising</li>
                </ul>
              </div>
              <div>
                <p className="text-base leading-relaxed text-muted-foreground mb-2 font-semibold">
                  We MAY share anonymized, aggregated data:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-base text-muted-foreground">
                  <li>To improve AI models</li>
                  <li>For research purposes</li>
                  <li>In compliance with legal requirements</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-start gap-3 mb-4">
              <Lock className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
              <h2 className="text-xl font-semibold text-foreground">4. Data Security</h2>
            </div>
            <ul className="list-disc pl-14 space-y-2 text-base text-muted-foreground">
              <li>All data encrypted in transit (TLS/SSL)</li>
              <li>Encrypted at rest in secure databases</li>
              <li>Regular security audits</li>
              <li>Access controls and authentication</li>
              <li>GDPR and CCPA compliant</li>
            </ul>
          </section>

          <section>
            <div className="flex items-start gap-3 mb-4">
              <Key className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
              <h2 className="text-xl font-semibold text-foreground">5. Your Rights</h2>
            </div>
            <p className="text-base leading-relaxed text-muted-foreground mb-3 ml-8">You have the right to:</p>
            <ul className="list-disc pl-14 space-y-2 text-base text-muted-foreground">
              <li>Access your data (download my data)</li>
              <li>Correct inaccurate data</li>
              <li>Delete your account and data</li>
              <li>Opt out of data sharing for improvement</li>
              <li>Export your drafts</li>
            </ul>
          </section>

          <section>
            <div className="flex items-start gap-3 mb-4">
              <Cookie className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
              <h2 className="text-xl font-semibold text-foreground">6. Cookies</h2>
            </div>
            <p className="text-base leading-relaxed text-muted-foreground mb-3 ml-8">We use cookies for:</p>
            <ul className="list-disc pl-14 space-y-2 text-base text-muted-foreground">
              <li>Authentication (essential)</li>
              <li>Preferences (dark mode, language)</li>
              <li>Analytics (optional, can opt out)</li>
            </ul>
          </section>

          <section>
            <div className="flex items-start gap-3 mb-4">
              <Users className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
              <h2 className="text-xl font-semibold text-foreground">7. Children's Privacy</h2>
            </div>
            <p className="text-base leading-relaxed text-muted-foreground ml-8">
              Zaza Draft is designed for teachers (18+). We do not knowingly collect data from children.
            </p>
          </section>

          <section>
            <div className="flex items-start gap-3 mb-4">
              <Globe className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
              <h2 className="text-xl font-semibold text-foreground">8. International Data Transfers</h2>
            </div>
            <p className="text-base leading-relaxed text-muted-foreground ml-8">
              Data may be processed in the United States and European Union. We ensure appropriate safeguards are in
              place for international transfers.
            </p>
          </section>

          <section>
            <div className="flex items-start gap-3 mb-4">
              <FileText className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
              <h2 className="text-xl font-semibold text-foreground">9. Changes to Privacy Policy</h2>
            </div>
            <p className="text-base leading-relaxed text-muted-foreground ml-8">
              We may update this policy. We'll notify you of significant changes via email or in-app notification.
            </p>
          </section>

          <section>
            <div className="flex items-start gap-3 mb-4">
              <Mail className="w-5 h-5 text-purple-600 mt-1 flex-shrink-0" />
              <h2 className="text-xl font-semibold text-foreground">10. Contact Us</h2>
            </div>
            <div className="ml-8">
              <p className="text-base leading-relaxed text-muted-foreground mb-3">Privacy questions or requests?</p>
              <ul className="list-none space-y-2 text-base text-muted-foreground">
                <li>
                  <span className="font-semibold text-foreground">Email:</span>{" "}
                  <a
                    href="mailto:privacy@zazatechnologies.com"
                    className="text-purple-600 hover:text-purple-700 transition-colors underline"
                  >
                    privacy@zazatechnologies.com
                  </a>
                </li>
                <li>
                  <span className="font-semibold text-foreground">Address:</span>
                  <br />
                  <span className="ml-16">Zaza Technologies UG (haftungsbeschrÃ¤nkt)</span>
                  <br />
                  <span className="ml-16">GumbertstraÃŸe 150</span>
                  <br />
                  <span className="ml-16">40229 DÃ¼sseldorf, Germany</span>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  )
}






