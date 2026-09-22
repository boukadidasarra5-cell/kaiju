import { useState } from 'react';
import { useApp } from '../context';
import { QUARTERS } from '../data';
import { ApiError } from '../api/client';
import type { Quarter, RouteType, Role, SeverityLevel } from '../types';

// Matrice de permissions (kaiju-rules.pdf) : simple aide UX, le serveur reste la source de vérité
function canRequestTransfer(level: SeverityLevel, role: Role) {
  if (level === 5) return true;
  if (level === 4) return role === 'QC' || role === 'LC';
  if (level === 3) return role === 'QC';
  return false;
}

const inputStyle = {
  backgroundColor: '#161b22',
  border: '1px solid #30363d',
  color: '#f0f6fc',
};

export default function TransferForm() {
  const { user, quarters, resources, addTransfer, setCurrentView } = useApp();

  const defaultFrom = (user?.role === 'QC' ? user.quarter : 'Apex') as Quarter;

  const [resourceId, setResourceId] = useState<number>(resources[0]?.id ?? 0);
  const [from,     setFrom]     = useState<Quarter>(defaultFrom);
  const [to,       setTo]       = useState<Quarter>(defaultFrom === 'Warden' ? 'Apex' : 'Warden');
  const [transitPick, setTransitPick] = useState<Quarter>('Xeno');
  const [quantity, setQuantity] = useState('');
  const [route,    setRoute]    = useState<RouteType>('direct');
  const [done,     setDone]     = useState(false);
  const [busy,     setBusy]     = useState(false);
  const [error,    setError]    = useState('');

  const transitOptions = QUARTERS.filter(x => x !== from && x !== to);
  const transit = transitOptions.includes(transitPick) ? transitPick : transitOptions[0];

  const q = (name: Quarter) => quarters.find(x => x.name === name);
  const isAdjacent = (a: Quarter, b: Quarter) => q(a)?.adjacentTo.includes(b) ?? false;
  const adjacent  = isAdjacent(from, to);
  const maritime  = (q(from)?.hasMaritimeAccess && q(to)?.hasMaritimeAccess) ?? false;
  const sourceLevel = q(from)?.severity ?? 1;
  const allowed   = user ? canRequestTransfer(sourceLevel, user.role) : false;

  const routeValid =
    route === 'direct'   ? adjacent :
    route === 'maritime' ? maritime :
    !adjacent && isAdjacent(from, transit) && isAdjacent(transit, to);

  const fromQ    = quarters.find(q => q.name === from);
  const stockInf = fromQ?.resources.find(r => r.resourceId === resourceId);
  const resource = stockInf?.type ?? '';
  const maxT     = stockInf ? Math.max(0, stockInf.current - stockInf.retention) : 0;
  const qty      = parseInt(quantity) || 0;
  // Les règles métier sont appliquées par le serveur : le formulaire n'affiche que des avertissements et laisse envoyer, pour voir les refus de l'API
  const canSubmit = qty > 0 && !busy;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError('');
    try {
      await addTransfer({
        resourceId, from, to,
        transit: route === 'transit' ? transit : undefined,
        quantity: qty,
        routeType: route,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? `${err.errorCode}: ${err.message}` : 'Unexpected error.');
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="p-6 flex items-center justify-center" style={{ minHeight: '400px' }}>
        <div className="text-center space-y-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-2xl"
            style={{ backgroundColor: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.4)' }}
          >
            ✓
          </div>
          <h2 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: '#22c55e' }}>
            Transfer Requested
          </h2>
          <p className="text-sm" style={{ color: '#8b949e' }}>
            Your request is pending approval from the relevant coordinators.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => { setDone(false); setQuantity(''); }}
              className="px-4 py-2 rounded-lg font-mono text-xs tracking-wide transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#161b22', border: '1px solid #30363d', color: '#c9d1d9' }}
            >
              NEW REQUEST
            </button>
            <button
              onClick={() => setCurrentView('dashboard')}
              className="px-4 py-2 rounded-lg font-mono text-xs tracking-wide transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#238636', color: '#f0f6fc' }}
            >
              BACK TO DASHBOARD
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl">
      <div>
        <h2 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)', color: '#f0f6fc' }}>
          Transfer Request
        </h2>
        <div className="font-mono text-xs mt-1" style={{ color: '#8b949e' }}>
          SUBMIT RESOURCE TRANSFER REQUEST
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Resource */}
        <div className="space-y-1.5">
          <label className="font-mono text-xs uppercase tracking-wider" style={{ color: '#8b949e' }}>
            Resource Type
          </label>
          <select
            value={resourceId}
            onChange={e => setResourceId(Number(e.target.value))}
            className="w-full rounded-lg px-4 py-3 text-sm outline-none"
            style={inputStyle}
          >
            {resources.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        {/* From / To */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="font-mono text-xs uppercase tracking-wider" style={{ color: '#8b949e' }}>From District</label>
            <select
              value={from}
              onChange={e => setFrom(e.target.value as Quarter)}
              disabled={user?.role === 'QC'}
              className="w-full rounded-lg px-4 py-3 text-sm outline-none"
              style={{ ...inputStyle, opacity: user?.role === 'QC' ? 0.7 : 1 }}
            >
              {QUARTERS.map(q => <option key={q}>{q}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="font-mono text-xs uppercase tracking-wider" style={{ color: '#8b949e' }}>To District</label>
            <select
              value={to}
              onChange={e => setTo(e.target.value as Quarter)}
              className="w-full rounded-lg px-4 py-3 text-sm outline-none"
              style={inputStyle}
            >
              {QUARTERS.filter(q => q !== from).map(q => <option key={q}>{q}</option>)}
            </select>
          </div>
        </div>

        {/* Route type */}
        <div className="space-y-1.5">
          <label className="font-mono text-xs uppercase tracking-wider" style={{ color: '#8b949e' }}>Route Type</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(['direct', 'transit', 'maritime'] as RouteType[]).map(rt => {
              const active   = route === rt;
              return (
                <button
                  key={rt}
                  type="button"
                  onClick={() => setRoute(rt)}
                  className="rounded-lg p-3 text-left transition-all"
                  style={{
                    backgroundColor: active ? '#1c2128' : '#161b22',
                    border: active ? '1px solid #58a6ff' : '1px solid #30363d',
                    color: active ? '#58a6ff' : '#8b949e',
                    cursor: 'pointer',
                  }}
                >
                  <div className="font-mono text-xs uppercase font-medium">{rt}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#8b949e' }}>
                    {rt === 'direct'   ? 'Adjacent only'  :
                     rt === 'transit'  ? 'Via transit hub' :
                                        'Coastal districts'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Transit hub */}
        {route === 'transit' && (
          <div className="space-y-1.5">
            <label className="font-mono text-xs uppercase tracking-wider" style={{ color: '#8b949e' }}>
              Transit Hub
            </label>
            <select
              value={transit}
              onChange={e => setTransitPick(e.target.value as Quarter)}
              className="w-full rounded-lg px-4 py-3 text-sm outline-none"
              style={inputStyle}
            >
              {transitOptions.map(x => <option key={x}>{x}</option>)}
            </select>
          </div>
        )}

        {/* Route validity */}
        <div
          className="rounded-lg px-4 py-3 flex items-start gap-3"
          style={{
            backgroundColor: routeValid ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${routeValid ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}
        >
          <div
            className="w-2 h-2 rounded-full mt-0.5 shrink-0"
            style={{ backgroundColor: routeValid ? '#22c55e' : '#ef4444' }}
          />
          <span className="font-mono text-xs leading-relaxed" style={{ color: routeValid ? '#22c55e' : '#ef4444' }}>
            {routeValid
              ? `ROUTE VALID: ${from}${route === 'transit' ? ` → [${transit}]` : ''} → ${to} via ${route}`
              : route === 'direct'
              ? `INVALID: ${from} and ${to} are not adjacent districts`
              : route === 'maritime'
              ? 'INVALID: Maritime requires both districts to have coastal access (Echo, Xeno, Zion)'
              : `INVALID: Check adjacency — ${from} → ${transit} → ${to}`
            }
          </span>
        </div>

        {/* Quantity */}
        <div className="space-y-1.5">
          <label className="font-mono text-xs uppercase tracking-wider flex items-baseline gap-2" style={{ color: '#8b949e' }}>
            Quantity
            {stockInf && (
              <span style={{ color: '#30363d', fontWeight: 400 }}>
                - available: {stockInf.current} · max transferable: {maxT} (reserve {stockInf.retention})
              </span>
            )}
          </label>
          <input
            type="number"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            className="w-full rounded-lg px-4 py-3 text-sm outline-none font-mono"
            style={inputStyle}
            placeholder={`1 – ${maxT}`}
          />
          {qty > maxT && qty > 0 && (
            <p className="font-mono text-xs" style={{ color: '#ef4444' }}>
              Exceeds transferable amount — must retain {stockInf?.retention} units minimum
            </p>
          )}
        </div>

        {!allowed && (
          <p className="font-mono text-xs" style={{ color: '#ef4444' }}>
            {user?.role} cannot request transfers from {from} at disaster level {sourceLevel}
          </p>
        )}
        {error && <p className="font-mono text-xs" style={{ color: '#ef4444' }}>{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-3 rounded-lg text-base font-semibold tracking-wide transition-opacity"
          style={{
            fontFamily: 'var(--font-display)',
            backgroundColor: '#238636',
            color: '#f0f6fc',
            opacity: canSubmit ? 1 : 0.35,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
          }}
        >
          SUBMIT TRANSFER REQUEST
        </button>
      </form>
    </div>
  );
}
