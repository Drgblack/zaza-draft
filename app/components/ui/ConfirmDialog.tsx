"use client";
import { useEffect, useRef } from 'react';

export function ConfirmDialog({ open, title = 'Confirm', description, onConfirm, onCancel }: {
  open: boolean;
  title?: string;
  description?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    // focus first button
    const btn = dialogRef.current?.querySelector('button');
    (btn as HTMLElement | null)?.focus();
    return () => previouslyFocused?.focus?.();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center" role="presentation">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        className="bg-white rounded p-6 max-w-sm w-full"
      >
        <h3 id="confirm-title" className="text-lg font-semibold">{title}</h3>
        {description && <p id="confirm-desc" className="mt-2 text-sm text-gray-700">{description}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button data-testid="confirm-cancel" onClick={onCancel} className="px-3 py-1 border rounded">Cancel</button>
          <button data-testid="confirm-ok" onClick={onConfirm} className="px-3 py-1 bg-red-600 text-white rounded">Delete</button>
        </div>
      </div>
    </div>
  );
}




