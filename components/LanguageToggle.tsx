import { useState } from "react";

export default function LanguageToggle({
  value = "EN-US",
  onChange,
}: {
  value?: "EN-US" | "EN-GB";
  onChange?: (v: "EN-US" | "EN-GB") => void;
}) {
  const [cur, setCur] = useState(value);
  const set = (v: "EN-US" | "EN-GB") => { setCur(v); onChange?.(v); };

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-slate-300/70 bg-white px-1 py-1 shadow-sm
                    dark:border-slate-700 dark:bg-slate-800">
      {(["EN-US","EN-GB"] as const).map(v => {
        const pressed = cur === v;
        return (
          <button
            key={v}
            type="button"
            aria-pressed={pressed}
            onClick={() => set(v)}
            className={[
              "px-3 h-7 rounded-full text-sm font-medium transition-[background,box-shadow,transform]",
              pressed
                ? "bg-violet-600 text-white shadow-sm"
                : "bg-transparent text-slate-700 hover:bg-slate-100 active:scale-[0.98] dark:text-slate-200 dark:hover:bg-slate-700/60",
            ].join(" ")}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}
