import type { Quarter } from './types';

export const QUARTERS: Quarter[] = ['Apex', 'Echo', 'Warden', 'Xeno', 'Zion'];

export const SEVERITY_INFO: Record<number, { name: string; color: string; bg: string; border: string }> = {
  1: { name: 'Watch',        color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.35)'  },
  2: { name: 'Alert',        color: '#eab308', bg: 'rgba(234,179,8,0.12)',   border: 'rgba(234,179,8,0.35)'  },
  3: { name: 'Emergency',    color: '#f97316', bg: 'rgba(249,115,22,0.12)',  border: 'rgba(249,115,22,0.35)' },
  4: { name: 'Critical',     color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.35)'  },
  5: { name: 'Catastrophic', color: '#a855f7', bg: 'rgba(168,85,247,0.12)',  border: 'rgba(168,85,247,0.35)' },
};