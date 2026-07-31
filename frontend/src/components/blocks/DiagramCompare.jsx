// Biology diagram_compare — two-column visual card: left/right concept with
// similarities and differences listed with check/cross icons.

function Check() {
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-400/15 border border-emerald-400/40 shrink-0 mt-0.5">
      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#34d399" strokeWidth="3">
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </span>
  );
}

function Cross() {
  return (
    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-400/15 border border-rose-400/40 shrink-0 mt-0.5">
      <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="#fb7185" strokeWidth="3">
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </span>
  );
}

export default function DiagramCompare({ data }) {
  if (!data?.left || !data?.right) return <p className="text-slate-400 text-sm">No comparison data.</p>;

  const { left, right, similarities = [], differences = [] } = data;

  return (
    <div className="space-y-4">
      {/* Two concepts side by side */}
      <div className="grid sm:grid-cols-2 gap-3">
        {[left, right].map((side, idx) => (
          <div
            key={side.name}
            className="rounded-2xl border p-4"
            style={{
              background: idx === 0 ? 'rgba(56,189,248,0.07)' : 'rgba(45,212,191,0.07)',
              borderColor: idx === 0 ? 'rgba(56,189,248,0.35)' : 'rgba(45,212,191,0.35)',
            }}
          >
            <p
              className="font-bold text-sm mb-3 flex items-center gap-2"
              style={{ color: idx === 0 ? '#7dd3fc' : '#5eead4' }}
            >
              <span className="w-2 h-2 rounded-full" style={{ background: idx === 0 ? '#38bdf8' : '#2dd4bf' }} />
              {side.name}
            </p>
            <ul className="space-y-1.5">
              {(side.points || []).map((p, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
                  <Cross />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Similarities */}
      {similarities.length > 0 && (
        <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/5 p-4">
          <p className="text-sm font-bold text-emerald-300 mb-3">Similarities</p>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
            {similarities.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
                <Check />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Differences table */}
      {differences.length > 0 && (
        <div className="rounded-2xl overflow-hidden border border-white/12">
          <div className="grid grid-cols-[1fr_auto_1fr] bg-white/5 text-xs font-bold uppercase tracking-wider">
            <div className="px-4 py-2 text-aqua-300">{left.name}</div>
            <div className="px-2 py-2 text-slate-500 self-center">vs</div>
            <div className="px-4 py-2 text-teal-300">{right.name}</div>
          </div>
          {differences.map((d, i) => (
            <div
              key={i}
              className={`grid grid-cols-[1fr_auto_1fr] border-t border-white/8 text-sm ${
                i % 2 ? 'bg-white/[0.03]' : ''
              }`}
            >
              <div className="px-4 py-2.5 text-slate-300 flex items-start gap-2">
                <Cross />
                <span>{d.left}</span>
              </div>
              <div className="px-2 py-2.5 text-slate-500 self-center font-bold">✕</div>
              <div className="px-4 py-2.5 text-slate-300 flex items-start gap-2 justify-end text-right">
                <span>{d.right}</span>
                <Check />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
