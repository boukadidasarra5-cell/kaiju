import { useApp } from '../context';
import { SEVERITY_INFO } from '../data';
import type { Transfer, SeverityLevel } from '../types';
import SeverityBadge from '../components/SeverityBadge';
import StockBar from '../components/StockBar';

// ── Shared transfer row ──────────────────────────────────────────────────────

const STATUS_CFG = {
  pending:    { color: '#eab308', bg: 'rgba(234,179,8,0.1)',   label: 'PENDING'    },
  approved:   { color: '#58a6ff', bg: 'rgba(88,166,255,0.1)',  label: 'APPROVED'   },
  rejected:   { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   label: 'REJECTED'   },
  completed:  { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   label: 'COMPLETED'  },
};

function TransferRow({ t, actions }: { t: Transfer; actions?: boolean }) {
  const { approveTransfer, rejectTransfer } = useApp();
  const cfg = STATUS_CFG[t.status];
  return (
    <div className="rounded-lg p-3 space-y-1.5" style={{ backgroundColor: '#1c2128', border: '1px solid #30363d' }}>
      <div className="flex justify-between items-start">
        <span className="font-mono text-xs" style={{ color: '#8b949e' }}>{t.id.toUpperCase()}</span>
        <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
          {cfg.label}
        </span>
      </div>
      <div className="text-sm font-medium" style={{ color: '#f0f6fc' }}>{t.resource}</div>
      <div className="font-mono text-xs flex items-center gap-1.5 flex-wrap" style={{ color: '#8b949e' }}>
        <span>{t.from}</span>
        {t.transit && <><span style={{ color: '#30363d' }}>→</span><span style={{ color: '#eab308' }}>[{t.transit}]</span></>}
        <span style={{ color: '#30363d' }}>→</span>
        <span>{t.to}</span>
        <span style={{ color: '#30363d' }}>·</span>
        <span style={{ color: '#58a6ff' }}>×{t.quantity}</span>
      </div>
      {actions && t.status === 'pending' && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => approveTransfer(t)}
            className="flex-1 py-1.5 rounded text-xs font-mono transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.35)' }}
          >
            APPROVE
          </button>
          <button
            onClick={() => rejectTransfer(t)}
            className="flex-1 py-1.5 rounded text-xs font-mono transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            REJECT
          </button>
        </div>
      )}
    </div>
  );
}

// ── QC Dashboard ─────────────────────────────────────────────────────────────

function QCDashboard() {
  const { user, quarters, transfers, approveTransfer, rejectTransfer, setCurrentView } = useApp();
  const myQ = quarters.find(q => q.name === user?.quarter);
  if (!myQ) return null;

  const pending = transfers.filter(
    t => (t.to === myQ.name || t.from === myQ.name) && t.status === 'pending'
  );
  const critCount = myQ.resources.filter(r => r.current <= r.retention).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)', color: '#f0f6fc' }}>
            {myQ.name} District
          </h2>
          <div className="font-mono text-xs mt-1" style={{ color: '#8b949e' }}>QUARTER COORDINATOR VIEW</div>
        </div>
        <div className="flex items-center gap-3">
          <SeverityBadge level={myQ.severity} size="lg" />
          <button
            onClick={() => setCurrentView('transfer')}
            className="px-4 py-2.5 rounded-lg font-mono text-xs tracking-wide transition-opacity hover:opacity-80"
            style={{ backgroundColor: '#238636', color: '#f0f6fc' }}
          >
            + REQUEST TRANSFER
          </button>
        </div>
      </div>

      {critCount > 0 && (
        <div
          className="rounded-lg px-4 py-3 flex items-center gap-3"
          style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          <span className="font-mono text-xs font-bold" style={{ color: '#ef4444' }}>⚠ CRITICAL</span>
          <span className="text-sm" style={{ color: '#c9d1d9' }}>
            {critCount} resource{critCount > 1 ? 's' : ''} below retention threshold — immediate action required
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Resources */}
        <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}>
          <div className="font-mono text-xs uppercase tracking-wider" style={{ color: '#8b949e' }}>
            Resource Inventory
          </div>
          <div className="space-y-4">
            {myQ.resources.map(r => <StockBar key={r.type} stock={r} />)}
          </div>
        </div>

        {/* Pending approvals */}
        <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}>
          <div className="font-mono text-xs uppercase tracking-wider" style={{ color: '#8b949e' }}>
            Pending Approvals ({pending.length})
          </div>
          {pending.length === 0 ? (
            <p className="text-sm" style={{ color: '#8b949e' }}>No pending requests.</p>
          ) : (
            <div className="space-y-3">
              {pending.map(t => (
                <div key={t.id} className="rounded-lg p-4 space-y-3" style={{ backgroundColor: '#1c2128', border: '1px solid #30363d' }}>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-mono text-xs" style={{ color: '#8b949e' }}>{t.id.toUpperCase()}</div>
                      <div className="text-sm font-medium mt-0.5" style={{ color: '#f0f6fc' }}>{t.resource}</div>
                      <div className="font-mono text-xs mt-0.5" style={{ color: '#8b949e' }}>
                        {t.from} {t.transit ? `→ [${t.transit}]` : ''} → {t.to}
                      </div>
                    </div>
                    <div className="text-2xl font-bold font-mono" style={{ color: '#58a6ff' }}>×{t.quantity}</div>
                  </div>
                  {t.from !== myQ.name ? (
                    <p className="font-mono text-xs" style={{ color: '#8b949e' }}>Awaiting approval from {t.from}</p>
                  ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveTransfer(t)}
                      className="flex-1 py-2 rounded-lg text-xs font-mono tracking-wide transition-opacity hover:opacity-80"
                      style={{ backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.35)' }}
                    >
                      APPROVE
                    </button>
                    <button
                      onClick={() => rejectTransfer(t)}
                      className="flex-1 py-2 rounded-lg text-xs font-mono tracking-wide transition-opacity hover:opacity-80"
                      style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
                    >
                      REJECT
                    </button>
                  </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Recent transfers for this quarter */}
          <div className="pt-2" style={{ borderTop: '1px solid #21262d' }}>
            <div className="font-mono text-xs uppercase tracking-wider mb-3" style={{ color: '#8b949e' }}>
              Recent Activity
            </div>
            <div className="space-y-2">
              {transfers
                .filter(t => (t.to === myQ.name || t.from === myQ.name) && t.status !== 'pending')
                .slice(0, 4)
                .map(t => <TransferRow key={t.id} t={t} />)
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── LC Dashboard ─────────────────────────────────────────────────────────────

function LCDashboard() {
  const { quarters, transfers } = useApp();
  const approved  = transfers.filter(t => t.status === 'approved');
  const pending   = transfers.filter(t => t.status === 'pending');
  const chains    = transfers.filter(t => t.routeType === 'transit');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)', color: '#f0f6fc' }}>
          Logistics Overview
        </h2>
        <div className="font-mono text-xs mt-1" style={{ color: '#8b949e' }}>
          LOGISTICS COORDINATOR — INTER-DISTRICT MANAGEMENT
        </div>
      </div>

      {/* Quarter mini cards */}
      <div className="grid grid-cols-5 gap-3">
        {quarters.map(q => {
          const info = SEVERITY_INFO[q.severity];
          const crit = q.resources.filter(r => r.current <= r.retention).length;
          return (
            <div key={q.name} className="rounded-xl p-4 space-y-3" style={{ backgroundColor: '#161b22', border: `1px solid ${info.border}` }}>
              <div className="flex justify-between items-start gap-1">
                <div className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: '#f0f6fc' }}>
                  {q.name}
                </div>
                <SeverityBadge level={q.severity} size="sm" showName={false} />
              </div>
              {crit > 0 && (
                <div className="font-mono text-xs" style={{ color: '#ef4444' }}>
                  ⚠ {crit} critical
                </div>
              )}
              <div className="space-y-1">
                {q.resources.slice(0, 4).map(r => {
                  const pct = Math.min((r.current / r.initial) * 100, 100);
                  const isCrit = r.current <= r.retention;
                  return (
                    <div key={r.type} className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: '#21262d' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: isCrit ? '#ef4444' : pct > 50 ? '#22c55e' : '#eab308' }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* In transit */}
        <div className="rounded-xl p-5 space-y-3" style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}>
          <div className="font-mono text-xs uppercase tracking-wider" style={{ color: '#8b949e' }}>
            Approved ({approved.length})
          </div>
          {approved.map(t => <TransferRow key={t.id} t={t} />)}
          {approved.length === 0 && <p className="text-sm" style={{ color: '#8b949e' }}>No approved transfers.</p>}
        </div>

        {/* Awaiting organization */}
        <div className="rounded-xl p-5 space-y-3" style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}>
          <div className="font-mono text-xs uppercase tracking-wider" style={{ color: '#8b949e' }}>
            Awaiting Organization ({pending.length})
          </div>
          {pending.map(t => <TransferRow key={t.id} t={t} />)}
          {pending.length === 0 && <p className="text-sm" style={{ color: '#8b949e' }}>No pending transfers.</p>}
        </div>
      </div>

      {/* Transit chain visualization */}
      {chains.length > 0 && (
        <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}>
          <div className="font-mono text-xs uppercase tracking-wider" style={{ color: '#8b949e' }}>
            Transit Chains ({chains.length})
          </div>
          <div className="space-y-3">
            {chains.map(t => {
              const cfg = STATUS_CFG[t.status];
              return (
                <div
                  key={t.id}
                  className="rounded-lg px-4 py-3 flex items-center gap-3 flex-wrap"
                  style={{ backgroundColor: '#1c2128', border: '1px solid #30363d' }}
                >
                  <span className="font-mono text-xs" style={{ color: '#8b949e' }}>{t.id.toUpperCase()}</span>

                  {/* Chain visual */}
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="font-mono text-sm font-medium" style={{ color: '#c9d1d9' }}>{t.from}</span>
                    <div className="flex items-center gap-1">
                      <div className="h-px w-6" style={{ backgroundColor: '#30363d' }} />
                      <span
                        className="font-mono text-xs px-2 py-0.5 rounded"
                        style={{ color: '#eab308', backgroundColor: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)' }}
                      >
                        {t.transit}
                      </span>
                      <div className="h-px w-6" style={{ backgroundColor: '#30363d' }} />
                    </div>
                    <span className="font-mono text-sm font-medium" style={{ color: '#c9d1d9' }}>{t.to}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs" style={{ color: '#8b949e' }}>{t.resource}</span>
                    <span className="font-mono text-sm font-bold" style={{ color: '#58a6ff' }}>×{t.quantity}</span>
                    <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── CD Dashboard ─────────────────────────────────────────────────────────────

function CDDashboard() {
  const { quarters, setQuarterSeverity, lowerRetentionThresholds, transfers } = useApp();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)', color: '#f0f6fc' }}>
            City Director
          </h2>
          <div className="font-mono text-xs mt-1" style={{ color: '#8b949e' }}>
            TOKYORK EMERGENCY MANAGEMENT | FULL CITY CONTROL
          </div>
        </div>

      </div>

      {/* All quarters overview */}
      <div className="space-y-3">
        {quarters.map(q => {
          const info = SEVERITY_INFO[q.severity];
          const critResources = q.resources.filter(r => r.current <= r.retention);
          return (
            <div
              key={q.name}
              className="rounded-xl p-5"
              style={{ backgroundColor: '#161b22', border: `1px solid ${info.border}` }}
            >
              <div className="flex items-center gap-6 flex-wrap">
                <div className="w-32 shrink-0">
                  <div className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: '#f0f6fc' }}>
                    {q.name}
                  </div>
                  <SeverityBadge level={q.severity} size="sm" />
                </div>

                {/* Quick resource bars */}
                <div className="flex-1 grid grid-cols-5 gap-3 min-w-0">
                  {q.resources.slice(0, 5).map(r => {
                    const pct = Math.min((r.current / r.initial) * 100, 100);
                    const isCrit = r.current <= r.retention;
                    return (
                      <div key={r.type} className="space-y-1">
                        <div className="text-xs truncate" style={{ color: '#8b949e' }}>
                          {r.type.split(' ')[0]}
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#21262d' }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: isCrit ? '#ef4444' : pct > 60 ? '#22c55e' : '#eab308' }}
                          />
                        </div>
                        <div className="font-mono text-xs" style={{ color: isCrit ? '#ef4444' : '#8b949e' }}>{r.current}</div>
                      </div>
                    );
                  })}
                </div>


                {/* Level buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-xs" style={{ color: '#8b949e' }}>LVL</span>
                  <div className="flex gap-1">
                    {([1, 2, 3, 4, 5] as SeverityLevel[]).map(lvl => {
                      const li = SEVERITY_INFO[lvl];
                      const active = q.severity === lvl;
                      return (
                        <button
                          key={lvl}
                          onClick={() => setQuarterSeverity(q.name, lvl)}
                          title={li.name}
                          className="w-7 h-7 rounded font-mono text-xs font-bold transition-all hover:opacity-90"
                          style={{
                            backgroundColor: active ? li.bg : '#1c2128',
                            color: active ? li.color : '#8b949e',
                            border: active ? `1px solid ${li.border}` : '1px solid #30363d',
                          }}
                        >
                          {lvl}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {q.severity === 5 && (
                <button
                  onClick={() => lowerRetentionThresholds(q.name)}
                  className="mt-3 px-3 py-1.5 rounded-lg font-mono text-xs tracking-wide transition-opacity hover:opacity-80"
                  style={{ backgroundColor: 'rgba(168,85,247,0.15)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.5)' }}
                >
                  ⚠ LOWER {q.name.toUpperCase()} RETENTION THRESHOLD TO 15%
                </button>
              )}

              {critResources.length > 0 && (
                <div className="mt-3 flex gap-2 flex-wrap pt-3" style={{ borderTop: '1px solid #21262d' }}>
                  {critResources.map(r => (
                    <span
                      key={r.type}
                      className="font-mono text-xs px-2 py-0.5 rounded"
                      style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)' }}
                    >
                      ⚠ {r.type}: {r.current} / {r.retention}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Transfer summary */}
      <div className="rounded-xl p-5 space-y-3" style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}>
        <div className="font-mono text-xs uppercase tracking-wider" style={{ color: '#8b949e' }}>
          All Transfers | Recent Activity
        </div>
        <div className="grid grid-cols-2 gap-3">
          {transfers.slice(0, 8).map(t => <TransferRow key={t.id} t={t} actions />)}
        </div>
      </div>
    </div>
  );
}

// ── Router ────────────────────────────────────────────────────────────────────

export default function DashboardView() {
  const { user } = useApp();
  if (user?.role === 'QC') return <QCDashboard />;
  if (user?.role === 'LC') return <LCDashboard />;
  return <CDDashboard />;
}
