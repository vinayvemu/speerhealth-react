// ─── Types ────────────────────────────────────────────────────────────────────

export interface DrugLabelData {
  brandName: string;
  genericName: string;
  manufacturer: string;
  indication: string;        // 1-liner trimmed from indications_and_usage
  boxedWarning: string | null;
}

export interface AdverseEvent {
  term: string;
  count: number;
}

export type FetchState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; data: T }
  | { status: 'error'; message: string }
  | { status: 'empty' };

// ─── TTL Cache (10 minutes) ───────────────────────────────────────────────────

const TTL_MS = 10 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const labelCache = new Map<string, CacheEntry<DrugLabelData | null>>();
const eventsCache = new Map<string, CacheEntry<AdverseEvent[]>>();

function cacheGet<T>(map: Map<string, CacheEntry<T>>, key: string): T | undefined {
  const entry = map.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) { map.delete(key); return undefined; }
  return entry.data;
}

function cacheSet<T>(map: Map<string, CacheEntry<T>>, key: string, data: T): void {
  map.set(key, { data, expiresAt: Date.now() + TTL_MS });
}

// ─── Raw FDA response types ───────────────────────────────────────────────────

interface FDALabelResult {
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
    manufacturer_name?: string[];
  };
  indications_and_usage?: string[];
  boxed_warning?: string[];
  warnings_and_cautions?: string[];
}

interface FDACountBucket {
  term: string;
  count: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FDA_BASE = 'https://api.fda.gov/drug';

/** Normalize whitespace in an FDA text field — no truncation. */
function cleanFDAText(text: string): string {
  return text.replace(/\n+/g, '\n').replace(/[ \t]+/g, ' ').trim();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch drug label data from openFDA.
 * Endpoint: GET /drug/label.json?search=openfda.brand_name:"{drug}"&limit=1
 * Returns null when the drug is not found.
 */
export async function fetchDrugLabel(drug: string): Promise<DrugLabelData | null> {
  const key = drug.toLowerCase();
  const cached = cacheGet(labelCache, key);
  if (cached !== undefined) return cached;

  const encoded = encodeURIComponent(`"${drug}"`);
  const url = `${FDA_BASE}/label.json?search=openfda.brand_name:${encoded}+openfda.generic_name:${encoded}&limit=1`;

  let result: FDALabelResult | undefined;
  try {
    const res = await fetch(url);
    if (res.status === 404) { cacheSet(labelCache, key, null); return null; }
    if (!res.ok) throw new Error(`FDA label HTTP ${res.status}`);
    const json = await res.json() as { results?: FDALabelResult[] };
    result = json.results?.[0];
  } catch (e) {
    throw new Error(`FDA label fetch failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (!result) { cacheSet(labelCache, key, null); return null; }

  const data: DrugLabelData = {
    brandName: result.openfda?.brand_name?.[0] ?? drug,
    genericName: result.openfda?.generic_name?.[0] ?? '',
    manufacturer: result.openfda?.manufacturer_name?.[0] ?? '',
    indication: result.indications_and_usage?.[0]
      ? cleanFDAText(result.indications_and_usage[0])
      : '',
    boxedWarning: result.boxed_warning?.[0]
      ? cleanFDAText(result.boxed_warning[0])
      : null,
  };

  cacheSet(labelCache, key, data);
  return data;
}

/**
 * Fetch top-5 adverse events from openFDA.
 * Endpoint: GET /drug/event.json?search=patient.drug.openfda.brand_name:"{drug}"&count=patient.reaction.reactionmeddrapt.exact&limit=5
 */
export async function fetchAdverseEvents(drug: string): Promise<AdverseEvent[]> {
  const key = drug.toLowerCase();
  const cached = cacheGet(eventsCache, key);
  if (cached !== undefined) return cached;

  const encoded = encodeURIComponent(`"${drug}"`);
  const url = `${FDA_BASE}/event.json?search=patient.drug.openfda.brand_name:${encoded}&count=patient.reaction.reactionmeddrapt.exact&limit=5`;

  let events: AdverseEvent[] = [];
  try {
    const res = await fetch(url);
    if (res.status === 404) { cacheSet(eventsCache, key, []); return []; }
    if (!res.ok) throw new Error(`FDA events HTTP ${res.status}`);
    const json = await res.json() as { results?: FDACountBucket[] };
    events = (json.results ?? []).slice(0, 5).map((r) => ({ term: r.term, count: r.count }));
  } catch (e) {
    throw new Error(`FDA events fetch failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  cacheSet(eventsCache, key, events);
  return events;
}

/** Clear TTL cache for a specific drug (useful for testing). */
export function clearDrugCache(drug?: string): void {
  if (drug) {
    const key = drug.toLowerCase();
    labelCache.delete(key);
    eventsCache.delete(key);
  } else {
    labelCache.clear();
    eventsCache.clear();
  }
}
