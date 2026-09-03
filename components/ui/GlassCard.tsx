import React from 'react';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  elevation?: 'base' | 'elevated' | 'floating';
  className?: string;
}

export function GlassCard({
  children,
  elevation = 'elevated',
  className = '',
  ...props
}: GlassCardProps) {
  const styles = {
    base: 'bg-[#121215] border border-[#27272a] rounded-2xl shadow-sm',
    elevated: 'bg-[#121215] border border-[#27272a] rounded-2xl shadow-md',
    floating: 'bg-[#18181b] border border-[#3f3f46] rounded-2xl shadow-xl',
  };

  return (
    <div
      className={`${styles[elevation]} ${className} transition-all duration-150`}
      {...props}
    >
      {children}
    </div>
  );
}
