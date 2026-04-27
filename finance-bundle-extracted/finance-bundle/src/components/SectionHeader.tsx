import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps {
  arabic?: string;
  title: string;
  subtitle?: string | ReactNode;
  align?: 'center' | 'left';
  className?: string;
}

export const SectionHeader = ({
  arabic,
  title,
  subtitle,
  align = 'center',
  className,
}: SectionHeaderProps) => (
  <div
    className={cn(
      'space-y-3',
      align === 'center' ? 'text-center mx-auto max-w-3xl' : 'text-left',
      className,
    )}
  >
    {arabic && (
      <p className="font-arabic text-2xl md:text-3xl text-primary/90">{arabic}</p>
    )}
    <h2 className="font-display text-3xl md:text-4xl lg:text-5xl gold-text leading-tight">
      {title}
    </h2>
    {subtitle && (
      <p className="font-bangla text-base md:text-lg text-muted-foreground leading-relaxed">
        {subtitle}
      </p>
    )}
    <div
      className={cn(
        'h-px w-24 bg-gradient-to-r from-transparent via-primary to-transparent',
        align === 'center' && 'mx-auto',
      )}
    />
  </div>
);
