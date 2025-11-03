"use client"

import { Component, type ReactNode } from "react"
import { AlertTriangle, RefreshCw, Home, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorId: string
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorId: "" }
  }

  static getDerivedStateFromError(error: Error): State {
    const errorId = `ERR-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Save any unsaved work to localStorage
    try {
      const textarea = document.querySelector("textarea")
      if (textarea?.value) {
        localStorage.setItem("emergency_draft_backup", textarea.value)
        localStorage.setItem("emergency_draft_timestamp", new Date().toISOString())
      }
    } catch (e) {
      console.error("[v0] Failed to save emergency backup:", e)
    }

    return { hasError: true, error, errorId }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("[v0] Error boundary caught:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6" />

            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Something unexpected happened</h1>

            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
              We're sorry—Zaza Draft encountered an error. We've been notified and will fix it soon.
            </p>

            <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 mb-8">
              <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">Error ID: {this.state.errorId}</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <Button
                onClick={() => window.location.reload()}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Refresh Page
              </Button>

              <Button onClick={() => (window.location.href = "/")} variant="outline" size="lg">
                <Home className="w-5 h-5 mr-2" />
                Go to Dashboard
              </Button>

              <Button
                onClick={() =>
                  (window.location.href =
                    "mailto:support@zazatechnologies.com?subject=Error Report: " + this.state.errorId)
                }
                variant="outline"
                size="lg"
              >
                <Mail className="w-5 h-5 mr-2" />
                Report Issue
              </Button>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Need help? Email{" "}
              <a href="mailto:support@zazatechnologies.com" className="text-purple-600 hover:underline">
                support@zazatechnologies.com
              </a>
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
