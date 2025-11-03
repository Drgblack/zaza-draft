export function MetricCardSkeleton() {
  return (
    <div className="bg-gray-200 dark:bg-gray-800 rounded-2xl p-6 sm:p-8 animate-pulse relative overflow-hidden">
      <div className="absolute inset-0 shimmer" />
      <div className="relative">
        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-300 dark:bg-gray-700 rounded-xl mb-4" />
        <div className="h-10 sm:h-12 w-24 bg-gray-300 dark:bg-gray-700 rounded mb-2" />
        <div className="h-5 sm:h-6 w-32 bg-gray-300 dark:bg-gray-700 rounded mb-1" />
        <div className="h-3 sm:h-4 w-48 bg-gray-300 dark:bg-gray-700 rounded" />
      </div>
    </div>
  )
}

export function TemplateCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 animate-pulse relative overflow-hidden">
      <div className="absolute inset-0 shimmer" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
        <div className="h-6 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
        <div className="space-y-2 mb-4">
          <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-4/6 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="flex items-center gap-2 mb-4">
          <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
          <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
        <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    </div>
  )
}

export function DraftCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 animate-pulse relative overflow-hidden">
      <div className="absolute inset-0 shimmer" />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="space-y-2 mb-4">
          <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-4/5 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    </div>
  )
}

export function FormFieldSkeleton() {
  return (
    <div className="space-y-2 animate-pulse relative overflow-hidden">
      <div className="absolute inset-0 shimmer" />
      <div className="relative">
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    </div>
  )
}

export function EditorSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 sm:p-6 lg:p-8 animate-pulse relative overflow-hidden">
      <div className="absolute inset-0 shimmer" />
      <div className="relative">
        {/* Undo/Redo buttons skeleton */}
        <div className="flex justify-end gap-1 mb-3">
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-md" />
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-md" />
        </div>

        {/* Textarea skeleton */}
        <div className="h-[180px] sm:h-[200px] w-full bg-gray-200 dark:bg-gray-700 rounded-lg mb-2" />

        {/* Helper text skeleton */}
        <div className="flex justify-between items-center mb-4">
          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>

        {/* Tone selector label skeleton */}
        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-3" />

        {/* Tone buttons skeleton */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0" />
          ))}
        </div>

        {/* Generate button skeleton */}
        <div className="h-14 sm:h-16 w-full bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    </div>
  )
}
