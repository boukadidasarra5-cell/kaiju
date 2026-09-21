import { useEffect, useState } from 'react';
import { useApp } from '../context';
import { api, type DistrictDTO } from '../api/endpoints';
import { ApiError } from '../api/client';
import type { Role } from '../types';
import { SEVERITY_INFO } from '../data';

export default function Login() {
  const { login, register } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('QC');
  const [districts, setDistricts] = useState<DistrictDTO[]>([]);
  const [districtId, setDistrictId] = useState<number | null>(null);
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.districts()
      .then(list => { setDistricts(list); setDistrictId(list[0]?.id ?? null); })
      .catch(() => setError('Cannot reach the server. Check that the API is running.'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError('All fields required.'); return; }
    setBusy(true);
    setError('');
    try {
      if (isRegister) await register({ username, password, role, districtId });
      else await login(username, password);
    } catch (err) {
      setError(err instanceof ApiError ? `${err.errorCode}: ${err.message}` : 'Unexpected error.');
      setBusy(false);
    }
  };

  const ROLES: { value: Role; label: string; desc: string }[] = [
    { value: 'QC', label: 'QC', desc: 'Quarter Coordinator' },
    { value: 'LC', label: 'LC', desc: 'Logistics Coordinator' },
    { value: 'CD', label: 'CD', desc: 'City Director' },
  ];

  const inputStyle = {
    backgroundColor: '#161b22',
    border: '1px solid #30363d',
    color: '#f0f6fc',
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#0d1117' }}>
      {/* Left panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-96 p-12 shrink-0"
        style={{ borderRight: '1px solid #21262d' }}
      >
        <div>
          <div className="text-5xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-display)', color: '#f0f6fc' }}>
            KAIJU
          </div>
          <div className="font-mono text-xs tracking-widest mt-2" style={{ color: '#8b949e' }}>
            CRISIS MANAGER
          </div>
          <div className="mt-6 text-sm leading-relaxed" style={{ color: '#8b949e' }}>
            Tokyork Emergency Management<br />Integrated Resource Platform
          </div>
        </div>

        <div className="space-y-5">
          <div className="font-mono text-xs uppercase tracking-widest" style={{ color: '#30363d' }}>
            Severity Levels
          </div>
          {([1, 2, 3, 4, 5] as const).map(lvl => {
            const info = SEVERITY_INFO[lvl];
            return (
              <div key={lvl} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: info.color }} />
                <span className="font-mono text-xs" style={{ color: '#8b949e' }}>
                  LVL {lvl} — <span style={{ color: info.color }}>{info.name}</span>
                </span>
              </div>
            );
          })}
        </div>

        <div className="font-mono text-xs" style={{ color: '#21262d' }}>
          {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden">
            <div className="text-4xl font-bold" style={{ fontFamily: 'var(--font-display)', color: '#f0f6fc' }}>KAIJU</div>
            <div className="font-mono text-xs tracking-widest" style={{ color: '#8b949e' }}>CRISIS MANAGER</div>
          </div>

          <div>
            <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)', color: '#f0f6fc' }}>
              {isRegister ? 'Create Account' : 'Sign In'}
            </h1>
            <p className="text-sm mt-1" style={{ color: '#8b949e' }}>
              {isRegister ? 'Register for Tokyork Emergency System' : 'Tokyork Emergency Management System'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="font-mono text-xs uppercase tracking-wider" style={{ color: '#8b949e' }}>Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-colors"
                style={inputStyle}
                placeholder="operator.username"
                autoComplete="username"
              />
            </div>

            <div className="space-y-1.5">
              <label className="font-mono text-xs uppercase tracking-wider" style={{ color: '#8b949e' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-lg px-4 py-3 text-sm outline-none"
                style={inputStyle}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {isRegister && (
            <div className="space-y-1.5">
              <label className="font-mono text-xs uppercase tracking-wider" style={{ color: '#8b949e' }}>Role</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRole(r.value)}
                    className="rounded-lg p-3 text-center transition-all"
                    style={{
                      backgroundColor: role === r.value ? '#1c2128' : '#161b22',
                      border: role === r.value ? '1px solid #58a6ff' : '1px solid #30363d',
                      color: role === r.value ? '#58a6ff' : '#8b949e',
                    }}
                  >
                    <div className="font-bold text-lg" style={{ fontFamily: 'var(--font-display)' }}>{r.label}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#8b949e', fontSize: '10px' }}>{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            )}

            {isRegister && role === 'QC' && (
              <div className="space-y-1.5">
                <label className="font-mono text-xs uppercase tracking-wider" style={{ color: '#8b949e' }}>
                  Assigned Quarter
                </label>
                <select
                  value={districtId ?? ''}
                  onChange={e => setDistrictId(Number(e.target.value))}
                  className="w-full rounded-lg px-4 py-3 text-sm outline-none"
                  style={inputStyle}
                >
                  {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}

            {error && <p className="text-xs font-mono" style={{ color: '#ef4444' }}>{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg py-3 text-base font-semibold tracking-wide transition-opacity hover:opacity-90"
              style={{ fontFamily: 'var(--font-display)', backgroundColor: '#238636', color: '#f0f6fc', opacity: busy ? 0.6 : 1 }}
            >
              {busy ? 'PLEASE WAIT…' : isRegister ? 'CREATE ACCOUNT' : 'SIGN IN'}
            </button>
          </form>

          <button
            onClick={() => { setIsRegister(v => !v); setError(''); }}
            className="text-sm transition-opacity hover:opacity-80"
            style={{ color: '#58a6ff' }}
          >
            {isRegister ? '← Back to sign in' : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
}