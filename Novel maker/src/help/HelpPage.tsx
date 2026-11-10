// "How to use" guide. Used as a page from the home page (#/help/<topic>) and as
// a full-screen overlay in the editor (so you never leave your project).
// Content: helpContent.ts.

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, BookOpen, Lightbulb, Search, X } from 'lucide-react';
import { CARD_HELP, CARD_ORDER, HELP_TOPICS, filterTopics, type HelpBlock, type HelpTopic } from './helpContent';
import { NODE_ICONS, NODE_LABELS } from '../ui/icons';

/** **bold**, *italic*, `code`, [[topic|link]] */
function Inline({ text, onLink }: { text: string; onLink: (id: string) => void }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[\[[^\]|]+\|[^\]]+\]\]|\*[^*\s][^*]*\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) return <b key={i} className="text-fg font-semibold">{p.slice(2, -2)}</b>;
        if (p.startsWith('`') && p.endsWith('`'))
          return (
            <code key={i} className="px-1 py-0.5 rounded bg-sunken border border-border text-[0.9em] font-mono text-fg">
              {p.slice(1, -1)}
            </code>
          );
        const link = p.match(/^\[\[([^\]|]+)\|([^\]]+)\]\]$/);
        if (link)
          return (
            <button key={i} onClick={() => onLink(link[1])} className="text-accent underline underline-offset-2 hover:brightness-110">
              {link[2]}
            </button>
          );
        if (p.length > 2 && p.startsWith('*') && p.endsWith('*')) return <i key={i}>{p.slice(1, -1)}</i>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </>
  );
}

function Block({ b, onLink }: { b: HelpBlock; onLink: (id: string) => void }) {
  const t = (s: string) => <Inline text={s} onLink={onLink} />;
  if ('h' in b) return <h3 className="font-story text-xl text-fg mt-6 mb-2">{b.h}</h3>;
  if ('p' in b) return <p className="leading-relaxed mb-3">{t(b.p)}</p>;
  if ('list' in b)
    return (
      <ul className="list-disc pl-5 space-y-1.5 mb-4 leading-relaxed marker:text-faint">
        {b.list.map((x, i) => (
          <li key={i}>{t(x)}</li>
        ))}
      </ul>
    );
  if ('steps' in b)
    return (
      <ol className="space-y-2 mb-4">
        {b.steps.map((x, i) => (
          <li key={i} className="flex gap-3 leading-relaxed">
            <span className="w-6 h-6 rounded-full bg-accent text-on-accent text-[12px] font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span>{t(x)}</span>
          </li>
        ))}
      </ol>
    );
  if ('tip' in b)
    return (
      <div className="flex gap-2.5 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 mb-4 leading-relaxed">
        <Lightbulb size={17} className="text-accent flex-shrink-0 mt-0.5" />
        <span>{t(b.tip)}</span>
      </div>
    );
  if ('warn' in b)
    return (
      <div className="flex gap-2.5 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 mb-4 leading-relaxed">
        <AlertTriangle size={17} className="text-warning flex-shrink-0 mt-0.5" />
        <span>{t(b.warn)}</span>
      </div>
    );
  if ('keys' in b)
    return (
      <table className="w-full text-[14px] mb-4">
        <tbody>
          {b.keys.map(([k, v]) => (
            <tr key={k} className="border-b border-border last:border-0">
              <td className="py-2 pr-4">{v}</td>
              <td className="py-2 text-right">
                <span className="nf-kbd">{k}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  // cards
  return (
    <div className="grid gap-3 sm:grid-cols-2 mb-4">
      {CARD_ORDER.map((k) => {
        const Icon = NODE_ICONS[k];
        const c = CARD_HELP[k];
        return (
          <section key={k} className={`nf-kind-${k} rounded-xl border border-border bg-surface p-4`} style={{ boxShadow: 'var(--shadow-sm)' }}>
            <h3 className="flex items-center gap-2 text-node font-semibold text-[13px] uppercase tracking-[0.12em] mb-2">
              <Icon size={16} /> {NODE_LABELS[k]}
            </h3>
            <p className="text-[14px] leading-relaxed mb-1.5">{t(c.what)}</p>
            <p className="text-[12.5px] text-muted mb-1.5">{t(c.outputs)}</p>
            <p className="text-[12.5px] text-fg-soft flex gap-1.5">
              <Lightbulb size={13} className="text-accent flex-shrink-0 mt-0.5" />
              <span>{t(c.tip)}</span>
            </p>
          </section>
        );
      })}
    </div>
  );
}

export default function HelpPage({
  topic,
  onTopic,
  onClose,
  overlay = false,
}: {
  /** Topic id to show (falls back to the first). */
  topic?: string;
  /** Called when the reader picks another topic (the page updates its address). */
  onTopic?: (id: string) => void;
  onClose: () => void;
  /** Editor: drawn over the project. */
  overlay?: boolean;
}) {
  const [current, setCurrent] = useState(topic && HELP_TOPICS.some((t) => t.id === topic) ? topic : HELP_TOPICS[0].id);
  const [query, setQuery] = useState('');
  const mainRef = useRef<HTMLDivElement>(null);
  const shown = useMemo(() => filterTopics(query), [query]);

  useEffect(() => {
    if (topic && topic !== current && HELP_TOPICS.some((t) => t.id === topic)) setCurrent(topic);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if ((e.target as HTMLElement)?.tagName === 'INPUT' && query) return; // the search box clears first
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose, query]);

  const go = (id: string) => {
    if (!HELP_TOPICS.some((t) => t.id === id)) return;
    setCurrent(id);
    onTopic?.(id);
    mainRef.current?.scrollTo({ top: 0 });
  };
  // While searching, show the current topic if it matches, else the first match.
  const visible: HelpTopic | undefined = shown.find((t) => t.id === current) ?? shown[0];
  const groups = [...new Set(shown.map((t) => t.group))];

  return (
    <div
      className={`${overlay ? 'fixed inset-0 z-[2100]' : 'h-full'} nf-paper flex flex-col`}
      role={overlay ? 'dialog' : undefined}
      aria-modal={overlay || undefined}
      aria-label="How to use Novel Flow"
    >
      <header className="h-14 flex-shrink-0 border-b border-border bg-surface/90 backdrop-blur flex items-center gap-2 px-4 sm:px-6">
        {!overlay && (
          <button className="nf-btn" onClick={onClose} title="Back to your stories (Esc)">
            <ArrowLeft size={15} /> <span className="hidden sm:inline">Your stories</span>
          </button>
        )}
        <BookOpen size={18} className="text-accent flex-shrink-0" />
        <h1 className="font-story text-lg sm:text-xl text-fg truncate">How to use Novel Flow</h1>
        <div className="flex-1" />
        <div className="relative w-40 sm:w-64">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-faint pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && query && setQuery('')}
            placeholder="Search the guide"
            aria-label="Search the guide"
            className="nf-input w-full !h-8 !py-0 !pl-8 text-[13px] [&::-webkit-search-cancel-button]:hidden"
          />
        </div>
        {overlay && (
          <button className="nf-icon-btn" onClick={onClose} title="Close (Esc)" aria-label="Close the guide">
            <X size={18} />
          </button>
        )}
      </header>

      <div className="flex-1 flex min-h-0">
        <nav className="hidden md:block w-64 flex-shrink-0 border-r border-border bg-surface/60 overflow-y-auto py-4" aria-label="Topics">
          {shown.length === 0 && <p className="px-5 text-sm text-muted italic">No topic matches “{query.trim()}”.</p>}
          {groups.map((g) => (
            <div key={g} className="mb-3">
              <div className="px-5 pb-1 text-[10.5px] uppercase tracking-[0.18em] text-faint font-semibold">{g}</div>
              {shown
                .filter((t) => t.group === g)
                .map((t) => (
                  <button
                    key={t.id}
                    onClick={() => go(t.id)}
                    aria-current={visible?.id === t.id ? 'page' : undefined}
                    className={`w-full text-left px-5 py-1.5 text-[14px] transition-colors ${
                      visible?.id === t.id ? 'text-fg font-medium bg-accent/10 border-r-2 border-accent' : 'text-fg-soft hover:text-fg hover:bg-surface-2'
                    }`}
                  >
                    {t.title}
                  </button>
                ))}
            </div>
          ))}
        </nav>

        <main ref={mainRef} className="flex-1 overflow-y-auto">
          <div className="md:hidden px-4 pt-4">
            <select
              value={visible?.id ?? ''}
              onChange={(e) => go(e.target.value)}
              className="nf-input w-full"
              aria-label="Topic"
            >
              {shown.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.group} · {t.title}
                </option>
              ))}
            </select>
          </div>
          {visible ? (
            <article className="max-w-3xl mx-auto px-5 sm:px-8 py-8 text-[15.5px] text-fg-soft">
              <div className="text-[11px] uppercase tracking-[0.2em] text-faint font-semibold mb-2">{visible.group}</div>
              <h2 className="font-story text-3xl sm:text-4xl text-fg mb-2">{visible.title}</h2>
              <p className="text-muted mb-6">{visible.lead}</p>
              {visible.blocks.map((b, i) => (
                <Block key={i} b={b} onLink={go} />
              ))}
            </article>
          ) : (
            <p className="text-center text-muted mt-16 px-4">Nothing in the guide matches “{query.trim()}”.</p>
          )}
        </main>
      </div>
    </div>
  );
}
