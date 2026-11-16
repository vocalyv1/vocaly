// Numéros congolais (+242) : 9 chiffres, mobiles 04/05/06…, fixes 22…. Même règle que le routeur SIP (infra/sip-router).
export function toCongoE164(input: string): string | null {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("242") && d.length >= 11) d = d.slice(3);
  if (/^[1-9]\d{7}$/.test(d)) d = "0" + d;
  return /^[02]\d{8}$/.test(d) ? "+242" + d : null;
}

// +242061234567 → +242 06 123 45 67
export function formatCongo(e164: string | null | undefined) {
  const m = /^\+242([02]\d)(\d{3})(\d{2})(\d{2})$/.exec(e164 ?? "");
  return m ? `+242 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : (e164 ?? "");
}
