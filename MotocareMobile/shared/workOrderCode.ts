export function formatWorkOrderCode(id?: string | null): string {
  if (!id) return 'SC-UNKNOWN';

  const raw = String(id).trim();
  if (!raw) return 'SC-UNKNOWN';

  if (/^sc-/i.test(raw)) {
    return `SC-${raw.slice(3)}`;
  }

  // For UUID-like IDs, keep screen-friendly short code.
  if (raw.length > 24 && raw.includes('-')) {
    return `SC-${raw.slice(0, 8)}`;
  }

  return `SC-${raw}`;
}
