type TooltipProps = {
  content: string;
  children: React.ReactNode;
};

export function Tooltip({ content, children }: TooltipProps) {
  return (
    <div className="group relative inline-block">
      {children}
      <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
        <div className="rounded-md bg-gray-900 px-2 py-1 text-xs text-white whitespace-nowrap">
          {content}
        </div>
      </div>
    </div>
  );
}


