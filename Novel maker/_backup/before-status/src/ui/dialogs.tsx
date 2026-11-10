// Themed replacements for window.alert / confirm / prompt, plus toasts.
// Call from anywhere: `await confirmDialog({...})`, `notify('Saved')`.

import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';

type DialogKind = 'alert' | 'confirm' | 'prompt';

interface DialogRequest {
  id: number;
  kind: DialogKind;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  defaultValue?: string;
  placeholder?: string;
  resolve: (v: boolean | string | null) => void;
}

export type ToastKind = 'success' | 'info' | 'error';
interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
}

interface DialogState {
  queue: DialogRequest[];
  toasts: Toast[];
  push: (d: Omit<DialogRequest, 'id'>) => void;
  close: (id: number, value: boolean | string | null) => void;
  toast: (text: string, kind?: ToastKind) => void;
  dismiss: (id: number) => void;
}

let seq = 1;

export const useDialogs = create<DialogState>((set, get) => ({
  queue: [],
  toasts: [],
  push: (d) => set({ queue: [...get().queue, { ...d, id: seq++ }] }),
  close: (id, value) => {
    const d = get().queue.find((q) => q.id === id);
    set({ queue: get().queue.filter((q) => q.id !== id) });
    d?.resolve(value);
  },
  toast: (text, kind = 'success') => {
    const id = seq++;
    set({ toasts: [...get().toasts, { id, kind, text }].slice(-4) });
    window.setTimeout(() => get().dismiss(id), kind === 'error' ? 6000 : 2600);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

interface Opts {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export function alertDialog(opts: Opts): Promise<void> {
  return new Promise((resolve) =>
    useDialogs.getState().push({ kind: 'alert', ...opts, resolve: () => resolve() })
  );
}

export function confirmDialog(opts: Opts): Promise<boolean> {
  return new Promise((resolve) =>
    useDialogs.getState().push({ kind: 'confirm', ...opts, resolve: (v) => resolve(v === true) })
  );
}

export function promptDialog(opts: Opts & { defaultValue?: string; placeholder?: string }): Promise<string | null> {
  return new Promise((resolve) =>
    useDialogs.getState().push({
      kind: 'prompt',
      ...opts,
      resolve: (v) => resolve(typeof v === 'string' ? v : null),
    })
  );
}

export function notify(text: string, kind: ToastKind = 'success') {
  useDialogs.getState().toast(text, kind);
}

/** Renders the active dialog and the toast stack. Mount once at the app root. */
export function DialogHost() {
  const queue = useDialogs((s) => s.queue);
  const toasts = useDialogs((s) => s.toasts);
  const dismiss = useDialogs((s) => s.dismiss);
  const current = queue[0];

  return (
    <>
      {current && <DialogView key={current.id} d={current} />}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[3000] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map((t) => {
          const Icon = t.kind === 'success' ? CheckCircle2 : t.kind === 'error' ? AlertTriangle : Info;
          return (
            <div
              key={t.id}
              role="status"
              className="animate-pop pointer-events-auto flex items-center gap-2.5 bg-surface border border-border rounded-xl pl-3 pr-1.5 py-2 text-[13px] text-fg"
              style={{ boxShadow: 'var(--shadow-lg)' }}
            >
              <Icon
                size={16}
                className={t.kind === 'success' ? 'text-success' : t.kind === 'error' ? 'text-danger' : 'text-accent'}
              />
              <span className="max-w-[60vw]">{t.text}</span>
              <button className="nf-icon-btn !w-6 !h-6" onClick={() => dismiss(t.id)} aria-label="Dismiss">
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

function DialogView({ d }: { d: DialogRequest }) {
  const close = useDialogs((s) => s.close);
  const [value, setValue] = useState(d.defaultValue ?? '');
  const okRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (d.kind === 'prompt') {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else okRef.current?.focus();
  }, [d.kind]);

  const ok = () => close(d.id, d.kind === 'prompt' ? value : true);
  const cancel = () => close(d.id, d.kind === 'prompt' ? null : false);

  return (
    <div
      className="fixed inset-0 z-[2500] bg-black/30 backdrop-blur-[1px] flex items-center justify-center p-4"
      onMouseDown={(e) => e.target === e.currentTarget && d.kind !== 'alert' && cancel()}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          cancel();
        }
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby={`dlg-${d.id}`} className="nf-panel animate-pop w-full max-w-sm p-5">
        <h2 id={`dlg-${d.id}`} className="font-story text-lg text-fg mb-1.5">
          {d.title}
        </h2>
        {d.message && <p className="text-[13.5px] text-muted leading-relaxed whitespace-pre-line">{d.message}</p>}
        {d.kind === 'prompt' && (
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && value.trim() && ok()}
            placeholder={d.placeholder}
            className="nf-input w-full mt-3"
          />
        )}
        <div className="flex justify-end gap-2 mt-5">
          {d.kind !== 'alert' && (
            <button className="nf-btn nf-btn-outline" onClick={cancel}>
              {d.cancelLabel ?? 'Cancel'}
            </button>
          )}
          <button
            ref={okRef}
            className={`nf-btn ${d.danger ? 'bg-danger text-on-accent hover:!bg-danger hover:brightness-110 hover:!text-on-accent' : 'nf-btn-primary'}`}
            onClick={ok}
            disabled={d.kind === 'prompt' && !value.trim()}
          >
            {d.confirmLabel ?? 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
