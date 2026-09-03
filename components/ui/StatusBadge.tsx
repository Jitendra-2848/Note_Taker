import React from 'react';
import { Lock, Globe, Clock, Flame, ShieldX } from 'lucide-react';

export type StatusType = 
  | 'ACTIVE' 
  | 'EXPIRED' 
  | 'CONSUMED' 
  | 'REVOKED' 
  | 'PUBLIC' 
  | 'PROTECTED' 
  | 'ONE_TIME' 
  | 'TIME_BASED';

interface StatusBadgeProps {
  status: StatusType;
  customLabel?: string;
  className?: string;
}

export function StatusBadge({ status, customLabel, className = '' }: StatusBadgeProps) {
  const configs: Record<StatusType, { label: string; icon: React.ReactNode; styles: string }> = {
    ACTIVE: {
      label: 'Active',
      icon: <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />,
      styles: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    },
    EXPIRED: {
      label: 'Expired',
      icon: <Clock className="h-3 w-3 text-zinc-400" />,
      styles: 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50',
    },
    CONSUMED: {
      label: 'Consumed',
      icon: <Flame className="h-3 w-3 text-purple-400" />,
      styles: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    },
    REVOKED: {
      label: 'Revoked',
      icon: <ShieldX className="h-3 w-3 text-rose-400" />,
      styles: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    },
    PUBLIC: {
      label: 'Public',
      icon: <Globe className="h-3 w-3 text-zinc-400" />,
      styles: 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60',
    },
    PROTECTED: {
      label: 'Protected',
      icon: <Lock className="h-3 w-3 text-amber-400" />,
      styles: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    },
    ONE_TIME: {
      label: 'One-Time',
      icon: <Flame className="h-3 w-3 text-purple-400" />,
      styles: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    },
    TIME_BASED: {
      label: 'Time-Based',
      icon: <Clock className="h-3 w-3 text-zinc-400" />,
      styles: 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60',
    },
  };

  const current = configs[status] || {
    label: status,
    icon: null,
    styles: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border ${current.styles} ${className}`}
    >
      {current.icon}
      <span>{customLabel || current.label}</span>
    </span>
  );
}
