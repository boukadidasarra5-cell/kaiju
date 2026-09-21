import { SEVERITY_INFO } from '../data';
import type { SeverityLevel } from '../types';

interface Props {
  level: SeverityLevel;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
}

export default function SeverityBadge({ level, size = 'md', showName = true }: Props) {
  const info = SEVERITY_INFO[level];
  const sz = { sm: 'text-xs px-2 py-0.5', md: 'text-sm px-3 py-1', lg: 'text-base px-4 py-1.5' }[size];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-mono font-medium tracking-wider uppercase ${sz}`}
      style={{ color: info.color, backgroundColor: info.bg, border: `1px solid ${info.border}` }}
    >
      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>{level}</span>
      {showName && <span>{info.name}</span>}
    </span>
  );
}
