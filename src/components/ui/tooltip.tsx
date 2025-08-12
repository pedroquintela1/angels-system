import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { cn } from '@/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-lg border bg-popover px-4 py-3 text-sm text-popover-foreground shadow-lg',
      'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
      'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
      'max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg',
      'transition-all duration-200 ease-in-out',
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

// Componente especializado para tooltips de métricas
const MetricTooltip = React.forwardRef<
  HTMLDivElement,
  {
    title: string;
    description: string;
    formula?: string;
    example?: string;
    link?: string;
    children: React.ReactNode;
    side?: 'top' | 'bottom' | 'left' | 'right';
  }
>(
  (
    { title, description, formula, example, link, children, side = 'right' },
    ref
  ) => (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} className="max-w-sm">
        <div ref={ref} className="space-y-2">
          <div className="font-semibold text-sm text-foreground border-b border-border pb-1">
            {title}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
          {formula && (
            <div className="bg-muted rounded p-2 text-xs font-mono">
              <div className="text-muted-foreground mb-1">Fórmula:</div>
              <div className="text-foreground">{formula}</div>
            </div>
          )}
          {example && (
            <div className="text-xs text-muted-foreground">
              <strong>Exemplo:</strong> {example}
            </div>
          )}
          {link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-xs text-primary hover:underline"
            >
              📚 Saiba mais
            </a>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
);
MetricTooltip.displayName = 'MetricTooltip';

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  MetricTooltip,
};
