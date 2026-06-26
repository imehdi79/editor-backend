// Wire shapes shared with the frontend client. `rates` is intentionally typed
// loosely (opaque JSON) — the backend never inspects the per-material rules.

/** One material's billing rule (mirrors the frontend MaterialRate). Opaque. */
export type MaterialRate = Record<string, unknown>;

/** A user's pricing settings as returned to / accepted from the client. */
export interface PricingSettings {
  currency: string;
  demolishRate: number;
  rates: Record<string, MaterialRate>;
}
