import type { ResourceStock } from '../types';

interface Props {
  stock: ResourceStock;
  compact?: boolean;
}

export default function StockBar({ stock, compact = false }: Props) {
  const { current, initial, retention, type } = stock;
  const pct = Math.min((current / initial) * 100, 100);
  const retPct = Math.min((retention / initial) * 100, 100);
  const isCrit = current <= retention;
  const isLow = current <= retention * 1.5;
  const barColor = isCrit ? '#ef4444' : isLow ? '#f97316' : pct < 60 ? '#eab308' : '#22c55e';

  return (
    <div className={compact ? 'space-y-0.5' : 'space-y-1.5'}>
      {!compact && (
        <div className="flex justify-between items-baseline">
          <span className="text-sm font-medium" style={{ color: '#c9d1d9' }}>{type}</span>
          <span className="text-sm font-mono" style={{ color: isCrit ? '#ef4444' : '#8b949e' }}>
            {current} <span style={{ color: '#30363d' }}>/</span> {initial}
          </span>
        </div>
      )}
      <div className="relative h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#21262d' }}>
        <div
          className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
        <div
          className="absolute top-0 h-full w-px"
          style={{ left: `${retPct}%`, backgroundColor: 'rgba(255,255,255,0.25)' }}
          title={`Min: ${retention}`}
        />
      </div>
      {!compact && (
        <div className="flex justify-between">
          <span className="text-xs font-mono" style={{ color: isCrit ? '#ef4444' : isLow ? '#f97316' : '#8b949e' }}>
            {isCrit ? '⚠ BELOW RETENTION' : isLow ? '↓ LOW' : 'OK'}
          </span>
          <span className="text-xs font-mono" style={{ color: '#8b949e' }}>min {retention}</span>
        </div>
      )}
    </div>
  );
}
