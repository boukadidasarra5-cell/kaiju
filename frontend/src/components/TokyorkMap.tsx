import { useState } from 'react';
import { useApp } from '../context';
import { SEVERITY_INFO } from '../data';
import type { Quarter } from '../types';
import SeverityBadge from './SeverityBadge';
import { MAP_SIZE, SEA_PATH, DISTRICT_PATHS, DISTRICT_LABELS } from './tokyorkMapData';

const QUARTERS_ORDER: Quarter[] = ['Apex', 'Echo', 'Warden', 'Xeno', 'Zion'];

export default function TokyorkMap() {
  const { quarters, setCurrentView } = useApp();
  const [hovered, setHovered] = useState<Quarter | null>(null);
  const [selected, setSelected] = useState<Quarter | null>(null);

  const getQ = (name: Quarter) => quarters.find(q => q.name === name)!;
  const selectedQ = selected ? getQ(selected) : null;

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 sm:p-6 lg:h-full" style={{ minHeight: 0 }}>
      {/* SVG map */}
      <div className="flex-1 flex items-center justify-center min-w-0">
        <div className="w-full max-w-2xl mx-auto">
          <svg
            viewBox={`0 0 ${MAP_SIZE.width} ${MAP_SIZE.height}`}
            className="w-full"
            style={{ filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.6))' }}
          >
            {/* Land, sea */}
            <rect width={MAP_SIZE.width} height={MAP_SIZE.height} fill="#161b22" />
            <path d={SEA_PATH} fill="#0f2233" fillRule="evenodd" stroke="#1d3a55" strokeWidth="1.5" />

            {/* Districts : le quartier survolé ou sélectionné est dessiné en dernier pour que son contour passe au-dessus */}
            {[...QUARTERS_ORDER]
              .sort((a, b) => Number(a === hovered || a === selected) - Number(b === hovered || b === selected))
              .map(name => {
                const q = getQ(name);
                const info = SEVERITY_INFO[q.severity];
                const isH = hovered === name;
                const isS = selected === name;
                return (
                  <path
                    key={name}
                    d={DISTRICT_PATHS[name]}
                    fill={info.color}
                    fillOpacity={isS ? 0.55 : isH ? 0.45 : 0.32}
                    fillRule="evenodd"
                    stroke={isS || isH ? info.color : '#0d1117'}
                    strokeWidth={isS ? 5 : isH ? 4 : 2.5}
                    strokeLinejoin="round"
                    style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                    onMouseEnter={() => setHovered(name)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => setSelected(selected === name ? null : name)}
                  />
                );
              })}

            {/* Labels */}
            {QUARTERS_ORDER.map(name => {
              const q = getQ(name);
              const info = SEVERITY_INFO[q.severity];
              const { x, y } = DISTRICT_LABELS[name];
              return (
                <g key={name} style={{ pointerEvents: 'none' }} textAnchor="middle" paintOrder="stroke" stroke="#0d1117" strokeLinejoin="round">
                  <text
                    x={x}
                    y={y}
                    fontFamily="'Barlow Condensed', sans-serif"
                    fontSize="40"
                    fontWeight="700"
                    letterSpacing="3"
                    strokeWidth="6"
                    fill={info.color}
                  >
                    {name.toUpperCase()}
                  </text>
                  <text
                    x={x}
                    y={y + 26}
                    fontFamily="'JetBrains Mono', monospace"
                    fontSize="18"
                    strokeWidth="4"
                    fill={info.color}
                  >
                    LVL {q.severity} · {info.name}
                  </text>
                </g>
              );
            })}

            {/* Scale */}
            <g style={{ pointerEvents: 'none' }} stroke="#8b949e" strokeWidth="3" fill="#8b949e">
              <line x1="20" y1="940" x2="252" y2="940" />
              <line x1="20" y1="932" x2="20" y2="948" />
              <line x1="252" y1="932" x2="252" y2="948" />
              <text x="136" y="925" textAnchor="middle" stroke="none" fontFamily="'JetBrains Mono', monospace" fontSize="18">10 km</text>
            </g>
          </svg>
        </div>
      </div>

      {/* Side panel */}
      <div className="w-full lg:w-72 shrink-0 space-y-4 lg:overflow-y-auto">
        {/* Selected district detail */}
        {selectedQ ? (
          <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: '#f0f6fc' }}>
                  {selectedQ.name}
                </div>
                <div className="font-mono text-xs mt-0.5" style={{ color: '#8b949e' }}>DISTRICT OVERVIEW</div>
              </div>
              <SeverityBadge level={selectedQ.severity} size="sm" />
            </div>

            <div className="space-y-2">
              {selectedQ.resources.slice(0, 6).map(r => {
                const pct = Math.min((r.current / r.initial) * 100, 100);
                const isCrit = r.current <= r.retention;
                return (
                  <div key={r.type} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span style={{ color: '#8b949e' }}>{r.type}</span>
                      <span className="font-mono" style={{ color: isCrit ? '#ef4444' : '#c9d1d9' }}>{r.current}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#21262d' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: isCrit ? '#ef4444' : pct > 60 ? '#22c55e' : '#eab308',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
              {selectedQ.resources.length > 6 && (
                <p className="text-xs" style={{ color: '#8b949e' }}>
                  +{selectedQ.resources.length - 6} more
                </p>
              )}
            </div>

            <button
              onClick={() => setCurrentView('dashboard')}
              className="w-full py-2 rounded-lg text-sm font-mono tracking-wide transition-opacity hover:opacity-80"
              style={{ backgroundColor: '#1c2128', border: '1px solid #30363d', color: '#58a6ff' }}
            >
              VIEW DASHBOARD →
            </button>
          </div>
        ) : (
          <div className="rounded-xl p-5" style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}>
            <p className="text-sm" style={{ color: '#8b949e' }}>Select a district to view its status.</p>
          </div>
        )}

        {/* All districts summary list */}
        <div className="rounded-xl p-4 space-y-1" style={{ backgroundColor: '#161b22', border: '1px solid #30363d' }}>
          <div className="font-mono text-xs uppercase tracking-wider pb-2" style={{ color: '#8b949e', borderBottom: '1px solid #21262d' }}>
            District Summary
          </div>
          {quarters.map(q => {
            const info = SEVERITY_INFO[q.severity];
            const critCount = q.resources.filter(r => r.current <= r.retention).length;
            return (
              <button
                key={q.name}
                onClick={() => setSelected(q.name as Quarter)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors hover:bg-white/5"
                style={{ backgroundColor: selected === q.name ? '#1c2128' : 'transparent' }}
              >
                <div className="text-left">
                  <div className="text-sm font-medium" style={{ color: '#c9d1d9', fontFamily: 'var(--font-display)' }}>
                    {q.name}
                  </div>
                  {critCount > 0 && (
                    <div className="font-mono text-xs" style={{ color: '#ef4444' }}>{critCount} critical</div>
                  )}
                </div>
                <span
                  className="font-mono text-xs px-2 py-0.5 rounded"
                  style={{ color: info.color, backgroundColor: info.bg }}
                >
                  {info.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
