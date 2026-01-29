import { ButtonHTMLAttributes, ReactNode } from 'react';

interface MedievalButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

const variantStyles = {
  default: `
    bg-gradient-to-b from-medieval-500 to-medieval-600
    border-medieval-400
    hover:from-medieval-400 hover:to-medieval-500
    hover:border-gold-500/50 hover:shadow-glow-gold-sm
    text-parchment-100
  `,
  primary: `
    bg-gradient-to-b from-gold-700 to-gold-800
    border-gold-500
    hover:from-gold-600 hover:to-gold-700
    hover:shadow-glow-gold
    text-gold-50
  `,
  danger: `
    bg-gradient-to-b from-red-900 to-red-950
    border-red-700
    hover:from-red-800 hover:to-red-900
    hover:border-red-600 hover:shadow-[0_0_10px_rgba(185,28,28,0.4)]
    text-red-100
  `,
  ghost: `
    bg-transparent
    border-transparent
    hover:bg-medieval-700/50 hover:border-gold-500/30
    text-parchment-200 hover:text-parchment-100
  `,
};

const sizeStyles = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function MedievalButton({
  children,
  variant = 'default',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  disabled,
  className = '',
  ...props
}: MedievalButtonProps) {
  return (
    <button
      className={`
        relative
        font-medieval font-medium
        uppercase tracking-wider
        border-2 rounded-medieval
        transition-all duration-200
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'active:translate-y-[1px]'}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      <span className="flex items-center justify-center gap-2">
        {loading ? (
          <span className="spinner-medieval w-4 h-4 border-2" />
        ) : icon ? (
          <span className="flex-shrink-0">{icon}</span>
        ) : null}
        {children}
      </span>
    </button>
  );
}
