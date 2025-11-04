"use client";
export const revalidate = 0;

import { Button } from "@/components/ui/button"
import { ArrowLeft, Heart, Zap, Sprout, Users } from "lucide-react"
import Link from "next/link"
import { useLanguage } from "@/contexts/language-context"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"

export default function AboutPage() {
  const { language } = useLanguage()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header title="About Zaza Draft" subtitle="Learn more about our mission" />

      <div className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <Link href="/">
            <Button
              variant="outline"
              className="mb-8 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-all duration-150 focus-visible:ring-2 focus-visible:ring-purple-500"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>

          <header className="mb-16 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                About Zaza Draft
              </span>
            </h1>
            <p className="text-xl sm:text-2xl text-muted-foreground font-medium">
              Write with heart. Teach with clarity.
            </p>
          </header>

          <section className="mb-16 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-3xl -z-10" />
            <div className="p-8 sm:p-12">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-foreground">Our Mission</h2>
              </div>
              <p className="text-lg leading-relaxed text-muted-foreground">
                Zaza Draft helps teachers communicate with parents effectively while protecting their personal time and
                wellbeing. We believe teachers deserve tools that respect their boundaries and celebrate their impact.
              </p>
            </div>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-800 to-transparent mb-16" />

          <section className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-foreground">What We Do</h2>
            </div>
            <p className="text-lg leading-relaxed text-muted-foreground mb-6">Zaza Draft uses AI to help teachers:</p>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full mt-2 flex-shrink-0" />
                <p className="text-lg text-muted-foreground">
                  Generate professional, empathetic parent communications in seconds
                </p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full mt-2 flex-shrink-0" />
                <p className="text-lg text-muted-foreground">Save hours of drafting time each week</p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full mt-2 flex-shrink-0" />
                <p className="text-lg text-muted-foreground">Maintain healthy work-life boundaries</p>
              </li>
              <li className="flex items-start gap-3">
                <div className="w-2 h-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full mt-2 flex-shrink-0" />
                <p className="text-lg text-muted-foreground">Track their teaching impact with meaningful analytics</p>
              </li>
            </ul>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-800 to-transparent mb-16" />

          <section className="mb-16">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Sprout className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-foreground">Our Values</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:shadow-lg hover:border-purple-200 dark:hover:border-purple-800 transition-all duration-200">
                <h3 className="text-xl font-semibold text-foreground mb-3 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Teachers First
                </h3>
                <p className="text-base leading-relaxed text-muted-foreground">
                  Every feature is designed with teacher wellbeing in mind
                </p>
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:shadow-lg hover:border-purple-200 dark:hover:border-purple-800 transition-all duration-200">
                <h3 className="text-xl font-semibold text-foreground mb-3 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Trust & Transparency
                </h3>
                <p className="text-base leading-relaxed text-muted-foreground">
                  We're upfront about how our AI works and what data we use
                </p>
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:shadow-lg hover:border-purple-200 dark:hover:border-purple-800 transition-all duration-200">
                <h3 className="text-xl font-semibold text-foreground mb-3 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Sustainability
                </h3>
                <p className="text-base leading-relaxed text-muted-foreground">
                  We help teachers build sustainable communication habits
                </p>
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:shadow-lg hover:border-purple-200 dark:hover:border-purple-800 transition-all duration-200">
                <h3 className="text-xl font-semibold text-foreground mb-3 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Inclusivity
                </h3>
                <p className="text-base leading-relaxed text-muted-foreground">
                  Zaza Draft works for teachers of all subjects, grade levels, and experience
                </p>
              </div>
            </div>
          </section>

          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-800 to-transparent mb-16" />

          <section className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-foreground">The Team</h2>
            </div>
            <p className="text-lg leading-relaxed text-muted-foreground">
              Zaza Draft is part of Zaza Technologies, founded by educators who understand the challenges of modern
              teaching. Our team combines deep expertise in education, AI, and product design to create tools that
              genuinely help teachers.
            </p>
          </section>

          <section className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-3xl -z-10" />
            <div className="p-8 sm:p-12 text-center">
              <h2 className="text-3xl font-bold text-foreground mb-4">Get in Touch</h2>
              <p className="text-lg leading-relaxed text-muted-foreground mb-8 max-w-2xl mx-auto">
                Have questions or feedback? We'd love to hear from you. Our team is here to help you make the most of
                Zaza Draft.
              </p>
              <Link href="/contact">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                >
                  Contact Us
                </Button>
              </Link>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  )
}






