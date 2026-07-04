export interface DrugLabel {
  brandName: string;
  genericName: string;
  manufacturer: string;
  purpose: string;
  indications: string;
  warnings: string;
}

export interface DrugAdverseEvent {
  term: string;
  count: number;
}

interface FDALabelResult {
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
    manufacturer_name?: string[];
  };
  purpose?: string[];
  indications_and_usage?: string[];
  warnings?: string[];
}

interface FDAEventResult {
  patient?: {
    reaction?: Array<{ reactionmeddrapt?: string }>;
  };
}

interface FDACountResult {
  term: string;
  count: number;
}

const FDA_BASE = 'https://api.fda.gov/drug';

export async function fetchDrugLabel(drugName: string): Promise<DrugLabel | null> {
  try {
    const encoded = encodeURIComponent(`"${drugName}"`);
    const res = await fetch(
      `${FDA_BASE}/label.json?search=openfda.brand_name:${encoded}+openfda.generic_name:${encoded}&limit=1`
    );
    if (!res.ok) return null;
    const json = await res.json();
    const result: FDALabelResult = json.results?.[0];
    if (!result) return null;
    return {
      brandName: result.openfda?.brand_name?.[0] ?? drugName,
      genericName: result.openfda?.generic_name?.[0] ?? '',
      manufacturer: result.openfda?.manufacturer_name?.[0] ?? '',
      purpose: result.purpose?.[0] ?? '',
      indications: result.indications_and_usage?.[0] ?? '',
      warnings: result.warnings?.[0] ?? '',
    };
  } catch {
    return null;
  }
}

export async function fetchDrugAdverseEvents(drugName: string): Promise<DrugAdverseEvent[]> {
  try {
    const encoded = encodeURIComponent(`"${drugName}"`);
    const res = await fetch(
      `${FDA_BASE}/event.json?search=patient.drug.medicinalproduct:${encoded}&count=patient.reaction.reactionmeddrapt.exact&limit=5`
    );
    if (!res.ok) {
      // Fallback: fetch individual events and aggregate
      const evRes = await fetch(
        `${FDA_BASE}/event.json?search=patient.drug.medicinalproduct:${encoded}&limit=10`
      );
      if (!evRes.ok) return [];
      const evJson = await evRes.json();
      const countMap = new Map<string, number>();
      (evJson.results ?? []).forEach((r: FDAEventResult) => {
        (r.patient?.reaction ?? []).forEach((rx) => {
          if (rx.reactionmeddrapt) {
            countMap.set(rx.reactionmeddrapt, (countMap.get(rx.reactionmeddrapt) ?? 0) + 1);
          }
        });
      });
      return Array.from(countMap.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([term, count]) => ({ term, count }));
    }
    const json = await res.json();
    return (json.results ?? []).slice(0, 5).map((r: FDACountResult) => ({
      term: r.term,
      count: r.count,
    }));
  } catch {
    return [];
  }
}
