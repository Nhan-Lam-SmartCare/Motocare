export function formatWorkOrderCode(id?: string | null): string {
  if (!id) return 'SC-UNKNOWN';

  const raw = String(id).trim();
  if (!raw) return 'SC-UNKNOWN';

  const shortFromTimestamp = (ts: string): string | null => {
    const num = Number(ts);
    if (Number.isNaN(num)) return null;
    const d = new Date(num);
    if (Number.isNaN(d.getTime())) return null;

    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const suffix = ts.slice(-6).padStart(6, '0');
    return `SC-${dd}${mm}-${suffix}`;
  };

  // Preferred: IDs containing long timestamp (e.g., wo-1773801040596-5744)
  const tsMatch = raw.match(/(\d{10,})/);
  if (tsMatch?.[1]) {
    const short = shortFromTimestamp(tsMatch[1]);
    if (short) return short;
  }

  // If already in full format SC-YYYYMMDD-XXXXXX, convert to short SC-DDMM-XXXXXX
  const fullMatch = raw.match(/^SC-(\d{8})-(\d{6})$/i);
  if (fullMatch) {
    const yyyymmdd = fullMatch[1];
    const suffix = fullMatch[2];
    const dd = yyyymmdd.slice(6, 8);
    const mm = yyyymmdd.slice(4, 6);
    return `SC-${dd}${mm}-${suffix}`;
  }

  // Stable fallback for legacy/non-timestamp IDs
  if (/^SC-/i.test(raw)) return raw.toUpperCase();
  return `SC-${raw}`;
}
