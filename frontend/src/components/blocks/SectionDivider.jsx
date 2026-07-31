// End-of-section divider (spec 4d). Rendered by the frontend only — never
// stored in the database. Marks the end of a topic/concept group (subtle END
// pill) or the end of the whole chapter (prominent "— END OF CHAPTER —").

export default function SectionDivider({ variant = 'section' }) {
  const isChapter = variant === 'chapter';
  return (
    <div
      className={`flex items-center gap-3 select-none ${isChapter ? 'my-10' : 'my-8'}`}
      role="separator"
      aria-label={isChapter ? 'End of chapter' : 'End of section'}
    >
      <div
        className={`h-px flex-1 bg-gradient-to-r from-transparent to-aqua-400/60 ${
          isChapter ? 'via-aqua-300/70' : 'via-aqua-400/50'
        }`}
      />
      {isChapter ? (
        <span className="glass-strong rounded-full px-5 py-1.5 text-[11px] font-bold tracking-[0.2em] text-aqua-200 shadow-[0_0_24px_rgba(56,189,248,0.18)]">
          — END OF CHAPTER —
        </span>
      ) : (
        <span className="glass rounded-full px-3.5 py-1 text-[9px] font-bold tracking-[0.35em] text-slate-400">
          END
        </span>
      )}
      <div
        className={`h-px flex-1 bg-gradient-to-l from-transparent to-aqua-400/60 ${
          isChapter ? 'via-aqua-300/70' : 'via-aqua-400/50'
        }`}
      />
    </div>
  );
}
