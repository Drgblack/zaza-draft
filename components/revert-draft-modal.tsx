"use client"

import { AlertCircle, RotateCcw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useLanguage } from "@/contexts/language-context"

interface RevertDraftModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export function RevertDraftModal({ isOpen, onClose, onConfirm }: RevertDraftModalProps) {
  const { t } = useLanguage()

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="revert-modal-title"
    >
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <h2 id="revert-modal-title" className="text-xl font-bold text-gray-900 dark:text-white">
              Revert to Original?
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          This will discard your edits and restore the AI-generated draft. This action cannot be undone.
        </p>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
            Cancel
          </Button>
          <Button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Revert
          </Button>
        </div>
      </div>
    </div>
  )
}
