"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface HelpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function HelpDialog({ open, onOpenChange }: HelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Help & Guides</DialogTitle>
          <DialogDescription>Learn how to get the most out of Zaza Draft.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="getting-started">
              <AccordionTrigger>Getting Started</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  Zaza Draft is an AI writing assistant designed specifically for K-12 teachers. It helps you write
                  clearer lesson plans, emails, and reports with confidence-weighted suggestions.
                </p>
                <p>
                  To get started, simply type or paste your text into the editor. The AI will analyse your writing and
                  provide suggestions in the right panel.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="suggestions">
              <AccordionTrigger>Understanding Suggestions</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>Suggestions are ranked by confidence:</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>
                    <strong>High confidence (80%+)</strong>: Full card with prominent styling
                  </li>
                  <li>
                    <strong>Medium confidence (50-80%)</strong>: Subtle card with toned-down actions
                  </li>
                  <li>
                    <strong>Low confidence (&lt;50%)</strong>: Compact card format
                  </li>
                </ul>
                <p>Each suggestion includes a rationale explaining why it was made and what pedagogy it supports.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="batch-actions">
              <AccordionTrigger>Batch Actions</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>Select multiple suggestions using the checkboxes to apply batch actions:</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>Accept all selected suggestions at once</li>
                  <li>Insert all as comments for later review</li>
                  <li>Dismiss multiple suggestions</li>
                </ul>
                <p>
                  Use keyboard shortcuts: <kbd>Shift+A</kbd> to accept, <kbd>Shift+D</kbd> to dismiss, <kbd>Esc</kbd> to
                  clear selection.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="privacy">
              <AccordionTrigger>Privacy & Safety</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>Your privacy is our priority:</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>Your text is processed securely</li>
                  <li>No student personally identifiable information (PII) is required</li>
                  <li>Feedback sharing is optional and can be disabled in Settings</li>
                  <li>All data is encrypted in transit and at rest</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="keyboard">
              <AccordionTrigger>Keyboard Shortcuts</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  Press <kbd>?</kbd> to view all keyboard shortcuts, or use these common ones:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>
                    <kbd>Ctrl/Cmd+K</kbd> - Ask AI
                  </li>
                  <li>
                    <kbd>Ctrl/Cmd+B/I/U</kbd> - Format text
                  </li>
                  <li>
                    <kbd>Shift+A</kbd> - Accept selected suggestions
                  </li>
                  <li>
                    <kbd>Shift+D</kbd> - Dismiss selected suggestions
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
