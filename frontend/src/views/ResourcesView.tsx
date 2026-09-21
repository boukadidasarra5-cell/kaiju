import { useState } from 'react';
import { useApp } from '../context';
import { QUARTERS, SEVERITY_INFO } from '../data';
import type { Quarter } from '../types';

export default function ResourcesView() {
  const { quarters, resources } = useApp();
  const [filter, setFilter] = useState<Quarter | 'all'>('all');

  const visible = filter === 'all' ? quarters : quarters.filter(q => q.name === filter);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)', color: '#f0f6fc' }}>
            Resources
          </h2>
          <div className="font-mono text-xs mt-1" style={{ color: '#8b949e' }}>CITY-WIDE RESOURCE INVENTORY</div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {(['all', ...QUARTERS] as (Quarter | 'all')[]).map(q => (
            <button
              key={q}
              onClick={() => setFilter(q)}
              className="px-3 py-1.5 rounded-lg font-mono text-xs tracking-wide transition-all"
              style={{
                backgroundColor: filter === q ? '#1c2128' : 'transparent',
                color: filter === q ? '#f0f6fc' : '#8b949e',
                border: filter === q ? '1px solid #58a6ff' : '1px solid #30363d',
              }}
            >
              {q === 'all' ? 'ALL' : q.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #30363d' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#161b22', borderBottom: '1px solid #30363d' }}>
                <th className="text-left py-3 px-4 font-mono text-xs uppercase tracking-wider w-44" style={{ color: '#8b949e' }}>
                  Resource
                </th>
                {visible.map(q => {
                  const info = SEVERITY_INFO[q.severity];
                  return (
                    <th key={q.name} className="py-3 px-4 text-center font-semibold text-base" style={{ fontFamily: 'var(--font-display)', color: info.color }}>
                      {q.name}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {resources.map(({ name: resource }, i) => (
                <tr
                  key={resource}
                  style={{
                    borderBottom: '1px solid #21262d',
                    backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  }}
                >
                  <td className="py-3 px-4 font-medium" style={{ color: '#c9d1d9' }}>{resource}</td>
                  {visible.map(q => {
                    const stock = q.resources.find(r => r.type === resource);
                    if (!stock) return <td key={q.name} className="px-4 py-3 text-center" style={{ color: '#30363d' }}>—</td>;
                    const pct = Math.min((stock.current / stock.initial) * 100, 100);
                    const isCrit = stock.current <= stock.retention;
                    const isLow  = stock.current <= stock.retention * 1.5;
                    const barColor = isCrit ? '#ef4444' : isLow ? '#f97316' : pct > 70 ? '#22c55e' : '#eab308';
                    return (
                      <td key={q.name} className="py-3 px-4 text-center">
                        <div className="space-y-1.5 inline-flex flex-col items-center w-full">
                          <div className="flex justify-center items-baseline gap-1 font-mono text-sm">
                            <span style={{ color: isCrit ? '#ef4444' : '#f0f6fc', fontWeight: isCrit ? 700 : 400 }}>
                              {stock.current}
                            </span>
                            <span style={{ color: '#30363d' }}>/</span>
                            <span style={{ color: '#8b949e', fontSize: '11px' }}>{stock.initial}</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden w-20" style={{ backgroundColor: '#21262d' }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                          </div>
                          <div className="font-mono text-xs" style={{ color: '#8b949e', fontSize: '10px' }}>
                            min {stock.retention}
                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex gap-4 flex-wrap">
        {[
          { color: '#22c55e', label: 'Healthy (>70%)' },
          { color: '#eab308', label: 'Low (30-70%)'   },
          { color: '#f97316', label: 'Near minimum'   },
          { color: '#ef4444', label: 'Below retention' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
            <span className="text-xs" style={{ color: '#8b949e' }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
