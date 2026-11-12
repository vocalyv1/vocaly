import "server-only";

// Client PawaPay (API v2, dépôts Mobile Money). Le jeton reste côté serveur (variable PAWAPAY_API_TOKEN).
// PAWAPAY_ENV=production pour l'API réelle, sinon bac à sable.

export const OPERATORS = { MTN_MOMO_COG: "MTN Mobile Money", AIRTEL_COG: "Airtel Money" } as const;
export type Operator = keyof typeof OPERATORS;

export function pawapayConfigured() {
  return Boolean(process.env.PAWAPAY_API_TOKEN);
}

function base() {
  return process.env.PAWAPAY_ENV === "production" ? "https://api.pawapay.io" : "https://api.sandbox.pawapay.io";
}

async function call(path: string, init?: RequestInit) {
  const res = await fetch(`${base()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.PAWAPAY_API_TOKEN}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const text = await res.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text.slice(0, 500) }; }
  return { ok: res.ok, status: res.status, body: body as Record<string, unknown> | null };
}

// Numéro congolais au format attendu (242 + 9 chiffres, sans +). Renvoie null s'il n'est pas valide.
export function normalizeCongoPhone(input: string) {
  let d = input.replace(/[^\d]/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 9 && d.startsWith("0")) d = `242${d}`;
  return /^2420[4-6]\d{7}$/.test(d) ? d : null;
}

export async function initiateDeposit(args: { depositId: string; phone: string; operator: Operator; amount: number }) {
  return call("/v2/deposits", {
    method: "POST",
    body: JSON.stringify({
      depositId: args.depositId,
      payer: { type: "MMO", accountDetails: { phoneNumber: args.phone, provider: args.operator } },
      amount: String(args.amount),
      currency: "XAF",
      customerMessage: "Vocaly",
    }),
  });
}

export type DepositStatus = { found: boolean; status?: string; amount?: string; currency?: string; failureReason?: string; raw: unknown };

// Statut d'un dépôt, lu directement chez PawaPay (seule source fiable avant d'activer un abonnement).
export async function getDeposit(depositId: string): Promise<DepositStatus> {
  const r = await call(`/v2/deposits/${encodeURIComponent(depositId)}`);
  const b = r.body ?? {};
  const data = (b.data ?? (Array.isArray(b) ? b[0] : null)) as Record<string, unknown> | null;
  if (!r.ok || !data || b.status === "NOT_FOUND") return { found: false, raw: b };
  const fr = data.failureReason as { failureCode?: string; failureMessage?: string } | undefined;
  return {
    found: true,
    status: data.status as string,
    amount: data.amount as string,
    currency: data.currency as string,
    failureReason: fr?.failureMessage ?? fr?.failureCode,
    raw: data,
  };
}
