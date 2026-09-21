import type { ReactNode } from 'react';
import { useApp } from '../context';
import SeverityBadge from './SeverityBadge';

const NAV = [
  { id: 'map',       label: 'CITY MAP'   },
  { id: 'dashboard', label: 'DASHBOARD'  },
  { id: 'resources', label: 'RESOURCES'  },
  { id: 'calendar',  label: 'CALENDAR'   },
  { id: 'transfer',  label: 'TRANSFER'   },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout, currentView, setCurrentView, disasterLevel, notifications, isConnected } = useApp();
  const unread = notifications.filter(n => !n.read).length;
  const viewLabel = NAV.find(n => n.id === currentView)?.label ?? '';

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#0d1117' }}>
      {/* Sidebar */}
      <aside className="w-52 shrink-0 flex flex-col" style={{ borderRight: '1px solid #21262d' }}>
        <div className="px-5 py-5" style={{ borderBottom: '1px solid #21262d' }}>
          <div className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)', color: '#f0f6fc' }}>
            KAIJU
          </div>
          <div className="font-mono text-xs tracking-widest" style={{ color: '#8b949e' }}>CRISIS MANAGER</div>
        </div>

        <div className="px-5 py-4" style={{ borderBottom: '1px solid #21262d' }}>
          <div className="font-mono text-xs" style={{ color: '#58a6ff' }}>{user?.role}</div>
          <div className="text-sm font-medium mt-0.5" style={{ color: '#f0f6fc' }}>{user?.username}</div>
          {user?.quarter && (
            <div className="text-xs mt-0.5" style={{ color: '#8b949e' }}>{user.quarter} District</div>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className="w-full text-left px-3 py-2.5 rounded-md font-mono text-xs tracking-wider transition-colors"
              style={{
                color: currentView === item.id ? '#f0f6fc' : '#8b949e',
                backgroundColor: currentView === item.id ? '#1c2128' : 'transparent',
                borderLeft: currentView === item.id ? '2px solid #58a6ff' : '2px solid transparent',
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="px-5 py-4 space-y-3" style={{ borderTop: '1px solid #21262d' }}>
          <div className="flex items-center gap-2">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: isConnected ? '#22c55e' : '#ef4444',
                boxShadow: isConnected ? '0 0 6px #22c55e' : 'none',
              }}
            />
            <span className="font-mono text-xs" style={{ color: '#8b949e' }}>
              {isConnected ? 'CONNECTED' : 'OFFLINE'}
            </span>
          </div>
          <button
            onClick={logout}
            className="font-mono text-xs transition-opacity hover:opacity-80"
            style={{ color: '#8b949e' }}
          >
            SIGN OUT →
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header
          className="flex items-center justify-between px-6 py-3 shrink-0"
          style={{ borderBottom: '1px solid #21262d' }}
        >
          <h1
            className="text-lg font-semibold tracking-widest"
            style={{ fontFamily: 'var(--font-display)', color: '#f0f6fc' }}
          >
            {viewLabel}
          </h1>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs" style={{ color: '#8b949e' }}>CITY THREAT</span>
              <SeverityBadge level={disasterLevel} size="md" />
            </div>

            {unread > 0 && (
              <div
                className="flex items-center gap-1.5 px-2.5 py-1 rounded"
                style={{ backgroundColor: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.35)' }}
              >
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#f97316' }} />
                <span className="font-mono text-xs" style={{ color: '#f97316' }}>
                  {unread} ALERT{unread > 1 ? 'S' : ''}
                </span>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
