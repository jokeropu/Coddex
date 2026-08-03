import { forwardRef } from 'react';
import * as Dlg from '@radix-ui/react-dialog';
import * as Menu from '@radix-ui/react-dropdown-menu';
import * as Tip from '@radix-ui/react-tooltip';
import * as TabsRoot from '@radix-ui/react-tabs';
import { X } from 'lucide-react';
import { cn } from './cn';

export const Dialog = Dlg.Root;
export const DialogTrigger = Dlg.Trigger;
export const DialogClose = Dlg.Close;

export const DialogContent = forwardRef(function DialogContent(
  { className, title, description, children, footer, width = 'max-w-lg', ...props },
  ref
) {
  return (
    <Dlg.Portal>
      <Dlg.Overlay
        className={cn(
          'anim-overlay fixed inset-0 z-50 backdrop-blur-[2px]',
          'bg-[color-mix(in_srgb,var(--c-sheet-sunk)_82%,transparent)]'
        )}
      />
      <Dlg.Content
        ref={ref}
        className={cn(
          'sheet tooth corner-ticks anim-dialog fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)]',
          '-translate-x-1/2 -translate-y-1/2 shadow-[var(--shadow-lift)] focus:outline-none',
          width,
          className
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4 border-b border-rule bg-sheet-sunk px-4 py-2.5">
          <div className="flex min-w-0 flex-col gap-0.5">
            <Dlg.Title className="t-h3 text-ink">{title}</Dlg.Title>
            {description && (
              <Dlg.Description className="t-body-sm text-ink-3">{description}</Dlg.Description>
            )}
          </div>
          <Dlg.Close
            className="-mr-1 -mt-0.5 shrink-0 border border-transparent p-1 text-ink-3 transition-colors hover:border-rule hover:text-ink"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.75} />
          </Dlg.Close>
        </div>

        <div className="max-h-[min(70vh,42rem)] overflow-y-auto px-4 py-4">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-rule bg-sheet-sunk px-4 py-2.5">
            {footer}
          </div>
        )}
      </Dlg.Content>
    </Dlg.Portal>
  );
});

export const DropdownMenu = Menu.Root;
export const DropdownTrigger = Menu.Trigger;

export const DropdownContent = ({ className, children, align = 'end', ...props }) => (
  <Menu.Portal>
    <Menu.Content
      align={align}
      sideOffset={4}
      className={cn(
        'sheet anim-pop z-50 min-w-52 p-1 shadow-[var(--shadow-lift)]',
        className
      )}
      {...props}
    >
      {children}
    </Menu.Content>
  </Menu.Portal>
);

export const DropdownItem = ({ className, tone, icon: Icon, children, ...props }) => (
  <Menu.Item
    className={cn(
      't-field flex cursor-pointer select-none items-center gap-2 px-2.5 py-1.5 outline-none',
      'text-ink-2 transition-colors',
      'data-[highlighted]:bg-sheet-hover data-[highlighted]:text-ink',
      tone === 'danger' && 'text-redline data-[highlighted]:bg-redline data-[highlighted]:text-sheet',
      className
    )}
    {...props}
  >
    {Icon && <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />}
    {children}
  </Menu.Item>
);

export const DropdownLabel = ({ children, className }) => (
  <Menu.Label className={cn('t-micro px-2.5 pb-1 pt-2 text-ink-3', className)}>{children}</Menu.Label>
);

export const DropdownSeparator = ({ className }) => (
  <Menu.Separator className={cn('my-1 h-px bg-rule', className)} />
);

export const TooltipProvider = ({ children }) => (
  <Tip.Provider delayDuration={280} skipDelayDuration={120}>
    {children}
  </Tip.Provider>
);

export const Tooltip = ({ label, children, side = 'top' }) => {
  if (!label) return children;
  return (
    <Tip.Root>
      <Tip.Trigger asChild>{children}</Tip.Trigger>
      <Tip.Portal>
        <Tip.Content
          side={side}
          sideOffset={5}
          className={cn(
            't-micro sheet anim-pop z-50 max-w-56 px-2 py-1 text-ink-2 shadow-[var(--shadow-lift)]'
          )}
        >
          {label}
        </Tip.Content>
      </Tip.Portal>
    </Tip.Root>
  );
};

export const Tabs = TabsRoot.Root;

export const TabsBar = ({ className, children, right }) => (
  <div className={cn('flex items-stretch justify-between border-b border-rule bg-sheet-sunk', className)}>
    <TabsRoot.List className="flex min-w-0 items-stretch overflow-x-auto">{children}</TabsRoot.List>
    {right && <div className="flex shrink-0 items-center gap-1.5 px-2">{right}</div>}
  </div>
);

export const Tab = ({ value, icon: Icon, children, className, count }) => (
  <TabsRoot.Trigger
    value={value}
    className={cn(
      't-field relative flex shrink-0 items-center gap-1.5 border-r border-rule px-3 py-2 outline-none',
      'text-ink-3 transition-colors hover:bg-sheet-hover hover:text-ink-2',
      'data-[state=active]:bg-sheet-raised data-[state=active]:text-ink',
      'after:absolute after:inset-x-0 after:top-0 after:h-[2px] after:bg-transparent',
      'data-[state=active]:after:bg-line',
      className
    )}
  >
    {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />}
    {children}
    {count !== undefined && count !== null && (
      <span className="t-data ml-0.5 text-ink-3">{count}</span>
    )}
  </TabsRoot.Trigger>
);

export const TabPanel = ({ value, className, children }) => (
  <TabsRoot.Content value={value} className={cn('outline-none', className)}>
    {children}
  </TabsRoot.Content>
);
