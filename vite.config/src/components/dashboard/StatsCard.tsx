import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'info';
}

const variantStyles = {
  default: 'bg-card',
  primary: 'gradient-primary text-primary-foreground',
  success: 'gradient-success text-success-foreground',
  warning: 'gradient-warning text-warning-foreground',
  info: 'gradient-info text-info-foreground',
};

export default function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  variant = 'default',
}: StatsCardProps) {
  const isGradient = variant !== 'default';

  return (
    <Card className={cn('border-0 shadow-sm', variantStyles[variant])}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className={cn('text-sm font-medium', isGradient ? 'opacity-90' : 'text-muted-foreground')}>
              {title}
            </p>
            <p className={cn('text-3xl font-bold', isGradient ? '' : 'text-foreground')}>
              {value}
            </p>
            {subtitle && (
              <p className={cn('text-sm', isGradient ? 'opacity-75' : 'text-muted-foreground')}>
                {subtitle}
              </p>
            )}
            {trend && (
              <div className={cn(
                'inline-flex items-center text-sm font-medium',
                trend.isPositive ? 'text-success' : 'text-destructive'
              )}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </div>
            )}
          </div>
          <div className={cn(
            'p-3 rounded-xl',
            isGradient ? 'bg-foreground/10' : 'bg-primary/10'
          )}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}