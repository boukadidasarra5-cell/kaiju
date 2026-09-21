import { useApp } from '../context';

const TYPE_CONFIG = {
  'severity-change':   { label: 'SEVERITY', color: '#f97316' },
  'transfer-conflict': { label: 'CONFLICT',  color: '#ef4444' },
  'stock-update':      { label: 'STOCK',     color: '#eab308' },
  'transfer-update':   { label: 'TRANSFER',  color: '#58a6ff' },
  'error':             { label: 'ERROR',     color: '#ef4444' },
};

export default function Notifications() {
  const { notifications, dismissNotification } = useApp();
  const visible = notifications.filter(n => !n.read).slice(0, 4);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80 pointer-events-none">
      {visible.map(n => {
        const cfg = TYPE_CONFIG[n.type];
        return (
          <div
            key={n.id}
            className="rounded-lg p-3 flex gap-3 items-start shadow-2xl pointer-events-auto"
            style={{
              backgroundColor: '#1c2128',
              border: '1px solid #30363d',
              animation: 'slideIn 0.2s ease-out',
            }}
          >
            <span className="font-mono text-xs font-bold mt-0.5 shrink-0" style={{ color: cfg.color }}>
              {cfg.label}
            </span>
            <p className="text-xs flex-1 leading-relaxed" style={{ color: '#c9d1d9' }}>{n.message}</p>
            <button
              onClick={() => dismissNotification(n.id)}
              className="text-sm leading-none shrink-0 hover:opacity-80 transition-opacity"
              style={{ color: '#8b949e' }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
