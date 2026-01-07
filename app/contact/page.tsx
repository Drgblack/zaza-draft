"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Mail, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export default function ContactPage() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle")
  const [error, setError] = useState<string>("")

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setState("sending")

    const form = e.currentTarget
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value.trim(),
      email: (form.elements.namedItem("email") as HTMLInputElement).value.trim(),
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value.trim(),
      company: (form.elements.namedItem("company") as HTMLInputElement).value.trim(),
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Request failed")
      setState("sent")
      form.reset()
    } catch (err) {
      setError("Sorry, something went wrong. Please email support@zazatechnologies.com.")
      setState("error")
    }
  }

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
              <Mail className="w-8 h-8 text-violet-600 dark:text-violet-400" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
                Contact Us
              </h1>
            </div>

            <div className="prose prose-slate dark:prose-invert max-w-none mb-8">
              <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed">
                Have a question or feedback? We'd love to hear from you.
              </p>
            </div>

            {state === "sent" ? (
              <div className="p-6 bg-gradient-to-br from-violet-50 to-pink-50 dark:from-violet-950/30 dark:to-pink-950/30 rounded-xl border border-violet-200 dark:border-violet-800 text-center">
                <p className="text-slate-700 dark:text-slate-300 font-medium mb-2">Thank you for your message!</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">We'll get back to you as soon as possible.</p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-6">
                <input
                  type="text"
                  name="company"
                  tabIndex={-1}
                  autoComplete="off"
                  style={{ position: "absolute", left: "-10000px" }}
                  aria-hidden="true"
                />

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Name
                  </label>
                  <Input id="name" name="name" type="text" required className="w-full" placeholder="Your name" />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Email
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="w-full"
                    placeholder="your.email@example.com"
                  />
                </div>

                <div>
                  <label
                    htmlFor="message"
                    className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                  >
                    Message
                  </label>
                  <Textarea
                    id="message"
                    name="message"
                    required
                    className="w-full min-h-[150px]"
                    placeholder="How can we help?"
                  />
                </div>

                {state === "sending" && <p className="text-sm text-slate-600 dark:text-slate-400">Sending...</p>}
                {error && (
                  <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={state === "sending"}
                  className="w-full bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white font-medium py-6 rounded-xl transition-all"
                >
                  {state === "sending" ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            )}

            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
                Or email us directly at{" "}
                <a
                  href="mailto:support@zazatechnologies.com"
                  className="text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 font-medium"
                >
                  support@zazatechnologies.com
                </a>
              </p>
            </div>
          </article>
        </div>
      </div>

    </div>
  )
}
