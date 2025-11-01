import { useEffect, useMemo, useState } from "react";

function fkGrade(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter(Boolean);
  const syllables = text.toLowerCase().match(/[aeiouy]+/g)?.length ?? 0;
  if (!words.length || !sentences.length) return 0;
  return Math.max(0, Math.round(0.39 * (words.length / sentences.length) + 11.8 * (syllables / words.length) - 15.59));
}

export default function DocStatsAuto({
  editorSelector = "#editor-root",
  draftsUsed = 0,
  draftsLimit = 10,
}: {
  editorSelector?: string;
  draftsUsed?: number;
  draftsLimit?: number;
}) {
  const [text, setText] = useState("");

  useEffect(() => {
    const el = document.querySelector(editorSelector) as HTMLElement | null;
    if (!el) return;
    const pull = () => setText(el.innerText ?? "");
    pull();
    const obs = new MutationObserver(pull);
    obs.observe(el, { childList: true, subtree: true, characterData: true });
    el.addEventListener("input", pull);
    return () => { obs.disconnect(); el.removeEventListener("input", pull); };
  }, [editorSelector]);

  const words = useMemo(() => (text.trim() ? text.trim().split(/\s+/).length : 0), [text]);
  const grade = useMemo(() => fkGrade(text), [text]);

  return (
    <div className="flex items-center gap-4 text-[13px] text-slate-600 dark:text-slate-300"
         aria-live="polite" data-testid="doc-stats" title="Live document statistics">
      <span>{words} words</span>
      <span>Reading level: {grade}</span>
      <span>{draftsUsed} / {draftsLimit} drafts used</span>
    </div>
  );
}
