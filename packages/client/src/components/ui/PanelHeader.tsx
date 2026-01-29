import { ReactNode } from 'react';

interface PanelHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function PanelHeader({
  title,
  subtitle,
  icon,
  action,
  className = '',
}: PanelHeaderProps) {
  return (
    <div className={`mb-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-8 h-8 flex items-center justify-center text-gold-500">
              {icon}
            </div>
          )}
          <div>
            <h2 className="font-medieval text-lg font-semibold text-gold-400 uppercase tracking-wider">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-parchment-400">{subtitle}</p>
            )}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>

      {/* Ornate divider */}
      <div className="mt-3 h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent" />
    </div>
  );
}

interface PanelSectionProps {
  title?: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
}

export function PanelSection({
  title,
  children,
  className = '',
}: PanelSectionProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {title && (
        <>
          <h3 className="font-medieval text-sm font-medium text-bronze-400 uppercase tracking-wide mb-2">
            {title}
          </h3>
          <div className="h-px bg-gradient-to-r from-bronze-500/30 to-transparent mb-3" />
        </>
      )}
      {children}
    </div>
  );
}

interface StatRowProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  color?: 'default' | 'gold' | 'green' | 'red' | 'blue';
  subValue?: string;
}

const colorStyles = {
  default: 'text-parchment-100',
  gold: 'text-gold-400',
  green: 'text-green-400',
  red: 'text-red-400',
  blue: 'text-blue-400',
};

export function StatRow({ label, value, icon, color = 'default', subValue }: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 text-parchment-400">
        {icon && <span className="w-4 h-4 flex items-center justify-center">{icon}</span>}
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-right">
        <span className={`font-medium ${colorStyles[color]}`}>{value}</span>
        {subValue && (
          <span className="ml-1 text-xs text-parchment-500">({subValue})</span>
        )}
      </div>
    </div>
  );
}
