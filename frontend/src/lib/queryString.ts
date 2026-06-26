/**
 * Serialize a flat params object into a query string for the LeaseFi backend.
 *
 * - `undefined` / `null` values are skipped (so optional filters drop out).
 * - `boolean` becomes `"true"`/`"false"` (the backend parses these literally).
 * - Everything else is stringified via `URLSearchParams`.
 * - The result is prefixed with `?` only when at least one param survives, so
 *   callers can safely do `` `${PATH}${toQueryString(params)}` ``.
 *
 * Arrays are intentionally NOT supported: the property/listing search filters
 * are single-valued on every field. Pass a CSV string (e.g. `bbox`) yourself
 * if an endpoint ever needs one.
 */
export function toQueryString(
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    search.append(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}
