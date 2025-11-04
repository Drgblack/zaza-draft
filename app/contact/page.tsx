"use client";
export const revalidate = 0;

import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Mail, Clock } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { Footer } from "@/components/footer"
import { Header } from "@/components/header"

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In a real app, this would send the form data to an API
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 5000)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header title="Contact Us" subtitle="Get in touch with the Zaza Draft team" />

      <div className="bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 text-white py-8">
        <div className="max-w-6xl mx-auto px-6">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">We'd love to hear from you ðŸ’¬</h1>
          <p className="text-lg text-purple-50">Get in touch with the Zaza Draft team</p>
        </div>
      </div>

      <div className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-12">
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

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* LEFT COLUMN - Contact Form */}
            <div className="bg-card rounded-lg border border-border p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-foreground mb-6">Send us a message</h2>

              {submitted ? (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">Thank you!</h3>
                  <p className="text-green-800 dark:text-green-200">We'll get back to you within 24 hours.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="name" className="text-sm font-medium">
                      Name *
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-2 text-base focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-2 text-base focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="your.email@example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="subject" className="text-sm font-medium">
                      Subject *
                    </Label>
                    <Select
                      value={formData.subject}
                      onValueChange={(value) => setFormData({ ...formData, subject: value })}
                    >
                      <SelectTrigger className="mt-2 text-base focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                        <SelectValue placeholder="Select a subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General Inquiry</SelectItem>
                        <SelectItem value="support">Technical Support</SelectItem>
                        <SelectItem value="billing">Billing Question</SelectItem>
                        <SelectItem value="feature">Feature Request</SelectItem>
                        <SelectItem value="privacy">Privacy Concern</SelectItem>
                        <SelectItem value="partnership">Partnership Inquiry</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="message" className="text-sm font-medium">
                      Message *
                    </Label>
                    <Textarea
                      id="message"
                      required
                      minLength={20}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="mt-2 min-h-[160px] text-base focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      placeholder="Tell us how we can help..."
                    />
                    <p className="text-xs text-muted-foreground mt-2">Minimum 20 characters</p>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium"
                  >
                    Send Message
                  </Button>
                </form>
              )}
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-lg border border-purple-100 dark:border-purple-900/30 p-6 sm:p-8 space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-purple-600" />
                  Email Us
                </h3>
                <div className="space-y-3 text-base">
                  <div>
                    <a
                      href="mailto:support@zazatechnologies.com"
                      className="text-purple-600 hover:text-purple-700 font-medium transition-colors"
                    >
                      support@zazatechnologies.com
                    </a>
                    <span className="text-sm block text-muted-foreground mt-0.5">General support</span>
                  </div>
                  <div>
                    <a
                      href="mailto:privacy@zazatechnologies.com"
                      className="text-purple-600 hover:text-purple-700 font-medium transition-colors"
                    >
                      privacy@zazatechnologies.com
                    </a>
                    <span className="text-sm block text-muted-foreground mt-0.5">Privacy questions</span>
                  </div>
                  <div>
                    <a
                      href="mailto:hello@zazatechnologies.com"
                      className="text-purple-600 hover:text-purple-700 font-medium transition-colors"
                    >
                      hello@zazatechnologies.com
                    </a>
                    <span className="text-sm block text-muted-foreground mt-0.5">General inquiries</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-purple-200 dark:border-purple-800/30 pt-6">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-600" />
                  Office Hours
                </h3>
                <div className="space-y-1 text-base text-muted-foreground">
                  <p className="font-medium text-foreground">Monday - Friday: 9:00 AM - 5:00 PM CET</p>
                  <p className="text-sm">We typically respond within 24 hours</p>
                </div>
              </div>

              <div className="border-t border-purple-200 dark:border-purple-800/30 pt-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Company Information</h3>
                <div className="space-y-1 text-base text-muted-foreground">
                  <p className="font-medium text-foreground">Zaza Technologies UG (haftungsbeschrÃ¤nkt)</p>
                  <p className="text-sm">GumbertstraÃŸe 150</p>
                  <p className="text-sm">40229 DÃ¼sseldorf, Germany</p>
                </div>
              </div>

              <div className="border-t border-purple-200 dark:border-purple-800/30 pt-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Follow Us</h3>
                <div className="flex gap-4">
                  <a
                    href="https://www.tiktok.com/@zazateach"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-purple-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 rounded"
                    aria-label="Follow us on TikTok"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                    </svg>
                  </a>
                  <a
                    href="https://twitter.com/zazateach"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-purple-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 rounded"
                    aria-label="Follow us on X (formerly Twitter)"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                  <a
                    href="https://www.linkedin.com/company/zazateach"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-purple-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 rounded"
                    aria-label="Follow us on LinkedIn"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}






