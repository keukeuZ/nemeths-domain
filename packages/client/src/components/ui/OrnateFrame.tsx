import { ReactNode } from 'react';

interface OrnateFrameProps {
  children: ReactNode;
  variant?: 'default' | 'gold' | 'bronze' | 'dark';
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  glow?: boolean;
}

const variantStyles = {
  default: 'border-medieval-500 bg-gradient-to-b from-medieval-600 to-medieval-700',
  gold: 'border-gold-500 bg-gradient-to-b from-medieval-600 to-medieval-700 shadow-ornate',
  bronze: 'border-bronze-400 bg-gradient-to-b from-medieval-600 to-medieval-700',
  dark: 'border-medieval-600 bg-gradient-to-b from-medieval-800 to-medieval-900',
};

const paddingStyles = {
  none: '',
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
};

export function OrnateFrame({
  children,
  variant = 'default',
  className = '',
  padding = 'md',
  glow = false,
}: OrnateFrameProps) {
  return (
    <div
      className={`
        relative border-2 rounded-medieval
        ${variantStyles[variant]}
        ${paddingStyles[padding]}
        ${glow ? 'animate-pulse-gold' : ''}
        ${className}
      `}
    >
      {/* Outer glow border */}
      <div className="absolute inset-[-4px] border border-gold-500/20 rounded-md pointer-events-none" />

      {/* Inner highlight */}
      <div className="absolute inset-[4px] border border-parchment-100/5 rounded-sm pointer-events-none" />

      {/* Corner accents */}
      <CornerAccent position="top-left" />
      <CornerAccent position="top-right" />
      <CornerAccent position="bottom-left" />
      <CornerAccent position="bottom-right" />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

function CornerAccent({ position }: { position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }) {
  const positionStyles = {
    'top-left': 'top-1 left-1',
    'top-right': 'top-1 right-1',
    'bottom-left': 'bottom-1 left-1',
    'bottom-right': 'bottom-1 right-1',
  };

  return (
    <div
      className={`
        absolute w-2 h-2 border-gold-500/40
        ${positionStyles[position]}
        ${position.includes('top') ? 'border-t' : 'border-b'}
        ${position.includes('left') ? 'border-l' : 'border-r'}
      `}
    />
  );
}
