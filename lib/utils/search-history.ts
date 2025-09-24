export type SearchHistoryItem = {
  query: string;
  ts: number; // timestamp in ms
  meta?: Record<string, any>;
};

const STORAGE_KEY = 'search_history_v1';
const MAX_ITEMS = 10;

function safeGetStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getRecentSearches(): SearchHistoryItem[] {
  const ls = safeGetStorage();
  if (!ls) return [];
  try {
    const raw = ls.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as SearchHistoryItem[];
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x) => x && typeof x.query === 'string' && x.query.trim().length)
      .sort((a, b) => b.ts - a.ts)
      .slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string, meta?: Record<string, any>) {
  const q = (query || '').trim();
  if (!q) return;
  const ls = safeGetStorage();
  if (!ls) return;
  try {
    const existing = getRecentSearches();
    const filtered = existing.filter(
      (i) => i.query.toLowerCase() !== q.toLowerCase(),
    );
    const next: SearchHistoryItem[] = [
      { query: q, ts: Date.now(), meta },
      ...filtered,
    ].slice(0, MAX_ITEMS);
    ls.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

export function clearRecentSearches() {
  const ls = safeGetStorage();
  if (!ls) return;
  try {
    ls.removeItem(STORAGE_KEY);
  } catch {}
}

export function removeRecentSearch(query: string) {
  const q = (query || '').trim();
  if (!q) return;
  const ls = safeGetStorage();
  if (!ls) return;
  try {
    const existing = getRecentSearches();
    const next = existing.filter(
      (i) => i.query.toLowerCase() !== q.toLowerCase(),
    );
    ls.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

export function formatRelative(ts: number): string {
  const delta = Date.now() - ts;
  const mins = Math.floor(delta / 60000);
  if (mins < 1) return 'Just now';
  if (mins === 1) return '1 minute ago';
  if (mins < 60) return `${mins} minutes ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs === 1) return '1 hour ago';
  if (hrs < 24) return `${hrs} hours ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}
