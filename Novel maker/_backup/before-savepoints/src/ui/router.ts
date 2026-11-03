import { useEffect, useState } from 'react';

export type Route = { page: 'home' } | { page: 'project'; name: string };

function parse(hash: string): Route {
  const m = hash.match(/^#\/p\/(.+)$/);
  if (m) {
    try {
      return { page: 'project', name: decodeURIComponent(m[1]) };
    } catch {
      /* fall through */
    }
  }
  return { page: 'home' };
}

export function projectHash(name: string) {
  return `#/p/${encodeURIComponent(name)}`;
}

export function goHome() {
  window.location.hash = '#/';
}
export function goProject(name: string) {
  window.location.hash = projectHash(name);
}

/** Tiny hash router: #/ = home, #/p/<name> = editor. */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
