import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Button + popover that closes on outside click or Escape. */
export default function Dropdown({
  trigger,
  children,
  align = 'left',
  width = 'w-52',
  className = '',
  up = false,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: 'left' | 'right';
  width?: string;
  className?: string;
  up?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={`relative ${className}`} ref={ref}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <div
          role="menu"
          className={`nf-menu animate-pop absolute ${up ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${width}`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({
  icon,
  label,
  hint,
  onClick,
  danger,
  className = '',
}: {
  icon?: ReactNode;
  label: ReactNode;
  hint?: string;
  onClick: () => void;
  danger?: boolean;
  className?: string;
}) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={`nf-menu-item ${danger ? 'hover:!text-danger hover:!bg-danger/10' : ''} ${className}`}
    >
      {icon && <span className="w-4 flex justify-center text-muted">{icon}</span>}
      <span className="flex-1">{label}</span>
      {hint && <span className="text-[11px] text-faint">{hint}</span>}
    </button>
  );
}
