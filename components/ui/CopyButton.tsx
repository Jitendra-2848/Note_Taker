'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  textToCopy: string;
  label?: string;
  copiedLabel?: string;
  variant?: 'primary' | 'secondary' | 'amber' | 'terracotta' | 'stone';
  className?: string;
}

export function CopyButton({
  textToCopy,
  label = 'Copy',
  copiedLabel = 'Copied',
  variant = 'secondary',
  className = '',
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const variantStyles = {
    primary: 'bg-indigo-600 hover:bg-indigo-500 text-white border-transparent',
    secondary: 'bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-200 border-zinc-700/70',
    amber: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30',
    terracotta: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700',
    stone: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700',
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all duration-150 cursor-pointer ${variantStyles[variant] || variantStyles.secondary} ${className}`}
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-emerald-400" />
          <span className="text-emerald-400 font-medium">{copiedLabel}</span>
        </>
      ) : (
        <>
          <Copy className="h-3 w-3 opacity-70" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}
