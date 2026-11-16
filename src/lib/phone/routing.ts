import "server-only";
import { el, elevenLabsConfigured } from "@/lib/voice/elevenlabs";

// Numéro unique fourni par Airtel : toutes les entreprises y renvoient leurs appels (**21*).
// Le routeur SIP Vocaly lit le numéro d'origine et transmet l'appel à ElevenLabs, où chaque numéro d'entreprise est relié à son agent.
export const routingNumber = () => process.env.VOCALY_ROUTING_NUMBER || null;

export const routingConfigured = () =>
  elevenLabsConfigured() &&
  Boolean(process.env.VOCALY_ROUTING_NUMBER && process.env.SIP_ROUTER_IP && process.env.SIP_ROUTER_USER && process.env.SIP_ROUTER_PASSWORD);

// Enregistre le numéro de l'entreprise dans ElevenLabs et le relie à son agent publié.
// Entrant : seuls les appels venant du routeur sont acceptés. Sortant (transferts) : via le routeur, avec identifiants.
export async function importBusinessNumber(number: string, label: string, providerAgentId: string) {
  const ip = process.env.SIP_ROUTER_IP!;
  const res = await el().conversationalAi.phoneNumbers.create({
    provider: "sip_trunk",
    phoneNumber: number,
    label: label.slice(0, 100),
    agentId: providerAgentId,
    inboundTrunkConfig: { allowedAddresses: [ip] },
    outboundTrunkConfig: {
      address: ip,
      transport: "tcp",
      credentials: { username: process.env.SIP_ROUTER_USER!, password: process.env.SIP_ROUTER_PASSWORD! },
    },
  });
  return res.phoneNumberId;
}

export async function removeBusinessNumber(phoneNumberId: string) {
  await el().conversationalAi.phoneNumbers.delete(phoneNumberId);
}
