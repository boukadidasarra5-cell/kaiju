import { useState } from 'react';
import { useApp } from '../context';

type Mode = 'week' | 'month';

const STATUS_CFG = {
  pending:     { color: '#eab308', bg: 'rgba(234,179,8,0.2)',   label: 'Pending'    },
  approved:    { color: '#58a6ff', bg: 'rgba(88,166,255,0.2)',  label: 'Approved'   },
  rejected:    { color: '#ef4444', bg: 'rgba(239,68,68,0.15)',  label: 'Rejected'   },
  completed:   { color: '#22c55e', bg: 'rgba(34,197,94,0.15)',  label: 'Completed'  },
};

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
         a.getMonth()    === b.getMonth()    &&
         a.getDate()     === b.getDate();
}

function weekDays(anchor: Date): Date[] {
  const dow = anchor.getDay();
  const monday = new Date(anchor);
  monday.setDate(anchor.getDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function monthDays(anchor: Date): Date[] {
  const year  = anchor.getFullYear();
  const month = anchor.getMonth();
  const first = new Date(year, month, 1);
  const last  = new Date(year, month + 1, 0);
  const startOff = (first.getDay() + 6) % 7;
  const days: Date[] = [];
  for (let i = -startOff; i < last.getDate(); i++) {
    days.push(new Date(year, month, 1 + i));
  }
  while (days.length % 7 !== 0) {
    const d = new Date(days[days.length - 1]);
    d.setDate(d.getDate() + 1);
    days.push(d);
  }
  return days;
}

export default function CalendarView() {
  const { transfers } = useApp();
  const [mode, setMode] = useState<Mode>('week');
  const [anchor, setAnchor] = useState(new Date());

  const today = new Date();
  const days  = mode === 'week' ? weekDays(anchor) : monthDays(anchor);
  const wDays = weekDays(anchor);

  const navigate = (dir: 1 | -1) => {
    const next = new Date(anchor);
    if (mode === 'week') next.setDate(anchor.getDate() + dir * 7);
    else next.setMonth(anchor.getMonth() + dir);
    setAnchor(next);
  };

  const periodLabel = mode === 'week'
    ? `${wDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${wDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : anchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const forDay = (day: Date) =>
    transfers.filter(t => t.scheduledAt && sameDay(new Date(t.scheduledAt), day));

  const maxPerDay = mode === 'week' ? 10 : 3;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)', color: '#f0f6fc' }}>
            Operational Calendar
          </h2>
          <div className="font-mono text-xs mt-1" style={{ color: '#8b949e' }}>
            ESTIMATED DELIVERY | ALL DISTRICTS
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid #30363d' }}>
            {(['week', 'month'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="px-4 py-2 font-mono text-xs tracking-wide transition-colors"
                style={{
                  backgroundColor: mode === m ? '#1c2128' : 'transparent',
                  color: mode === m ? '#f0f6fc' : '#8b949e',
                }}
              >
                {m.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="px-3 py-2 rounded font-mono text-sm transition-opacity hover:opacity-80"
              style={{ color: '#8b949e' }}
            >
              ←
            </button>
            <span className="font-mono text-sm text-center" style={{ color: '#c9d1d9', minWidth: '200px' }}>
              {periodLabel}
            </span>
            <button
              onClick={() => navigate(1)}
              className="px-3 py-2 rounded font-mono text-sm transition-opacity hover:opacity-80"
              style={{ color: '#8b949e' }}
            >
              →
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #30363d' }}>
        {/* Day headers */}
        <div className="grid grid-cols-7" style={{ backgroundColor: '#161b22', borderBottom: '1px solid #30363d' }}>
          {DAY_NAMES.map(d => (
            <div key={d} className="py-3 text-center font-mono text-xs uppercase tracking-wider" style={{ color: '#8b949e' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dayT     = forDay(day);
            const isToday  = sameDay(day, today);
            const inMonth  = day.getMonth() === anchor.getMonth();
            const col      = i % 7;
            const isLastCol = col === 6;
            const row      = Math.floor(i / 7);
            const lastRow  = Math.floor((days.length - 1) / 7);
            const isLastRow = row === lastRow;

            return (
              <div
                key={i}
                className="space-y-1 p-2"
                style={{
                  minHeight: mode === 'week' ? '200px' : '96px',
                  backgroundColor: isToday ? 'rgba(88,166,255,0.04)' : 'transparent',
                  borderRight:  !isLastCol  ? '1px solid #21262d' : 'none',
                  borderBottom: !isLastRow  ? '1px solid #21262d' : 'none',
                  opacity: mode === 'month' && !inMonth ? 0.35 : 1,
                }}
              >
                <div
                  className="font-mono text-xs w-6 h-6 flex items-center justify-center rounded-full"
                  style={{
                    color: isToday ? '#f0f6fc' : '#8b949e',
                    backgroundColor: isToday ? '#58a6ff' : 'transparent',
                    fontWeight: isToday ? 700 : 400,
                  }}
                >
                  {day.getDate()}
                </div>

                {dayT.slice(0, maxPerDay).map(t => {
                  const cfg = STATUS_CFG[t.status];
                  return (
                    <div
                      key={t.id}
                      className="rounded px-1.5 py-0.5 text-xs truncate cursor-default"
                      style={{ backgroundColor: cfg.bg, color: cfg.color }}
                      title={`${t.resource}: ${t.from} → ${t.to} ×${t.quantity} [${t.status}]`}
                    >
                      {mode === 'week'
                        ? `${t.resource} · ${t.from}→${t.to} ×${t.quantity}`
                        : t.resource.split(' ')[0]
                      }
                    </div>
                  );
                })}

                {dayT.length > maxPerDay && (
                  <div className="text-xs font-mono" style={{ color: '#8b949e' }}>
                    +{dayT.length - maxPerDay}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        {Object.entries(STATUS_CFG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: cfg.bg, border: `1px solid ${cfg.color}` }} />
            <span className="text-xs" style={{ color: '#8b949e' }}>{cfg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
