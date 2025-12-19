"use client"

import { X } from "lucide-react"
import { useState } from "react"

interface SaveDraftModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (tags: string[]) => void
}

export function SaveDraftModal({ isOpen, onClose, onSave }: SaveDraftModalProps) {
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")

  const suggestedTags = ["Parent Email", "Report Card", "Behavior", "Progress Update"]

  const handleAddTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags([...tags, tag])
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleSave = () => {
    onSave(tags)
    setTags([])
    setTagInput("")
  }

  const handleClose = () => {
    onClose()
    setTags([])
    setTagInput("")
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Save to Library</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition focus-visible:ring-2 focus-visible:ring-purple-600 rounded"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tag Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Add tags to organize your drafts
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && tagInput.trim()) {
                  handleAddTag(tagInput.trim())
                  setTagInput("")
                }
              }}
              placeholder="Type a tag and press Enter"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        {/* Suggested Tags */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Suggested tags:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleAddTag(tag)}
                className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm hover:bg-purple-200 dark:hover:bg-purple-900/50 transition focus-visible:ring-2 focus-visible:ring-purple-600"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Tags */}
        {tags.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Selected tags:</p>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-purple-600 text-white rounded-full text-sm"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-purple-200 transition focus-visible:ring-2 focus-visible:ring-white rounded"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition focus-visible:ring-2 focus-visible:ring-purple-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2"
          >
            Save Draft
          </button>
        </div>
      </div>
    </div>
  )
}
