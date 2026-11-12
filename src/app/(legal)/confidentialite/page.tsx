export const metadata = { title: "Confidentialité · Vocaly" };

export default function Page() {
  return (
    <>
      <h1>Politique de confidentialité</h1>
      <p>Cette politique explique quelles données Vocaly traite, pourquoi, et quels sont vos droits. Référence : loi n° 29-2019 du 10 octobre 2019 portant protection des données à caractère personnel en République du Congo [références à valider].</p>
      <h2>Données traitées</h2>
      <ul>
        <li>Compte client : nom, e-mail, mot de passe (chiffré), informations sur l&apos;entreprise.</li>
        <li>Appels reçus par l&apos;agent : numéro de l&apos;appelant, transcription de la conversation, résumé, durée, date.</li>
        <li>Documents et informations ajoutés à la base de connaissances de l&apos;agent.</li>
      </ul>
      <h2>Finalités</h2>
      <p>Faire fonctionner l&apos;agent téléphonique, produire le résumé de chaque appel, l&apos;envoyer au client Vocaly, et assurer le support. Les données ne sont ni vendues ni utilisées pour de la publicité.</p>
      <h2>Rôles</h2>
      <p>Pour les appels, l&apos;entreprise cliente de Vocaly est responsable du traitement ; Vocaly agit comme sous-traitant. L&apos;agent annonce qu&apos;il est un assistant virtuel. [Préciser l&apos;information des appelants sur l&apos;enregistrement.]</p>
      <h2>Sous-traitants techniques</h2>
      <ul>
        <li>ElevenLabs (voix et conversation), Anthropic (analyse et résumé des appels), Supabase (base de données), Vercel (hébergement), Resend (e-mails).</li>
        <li>Ces prestataires sont situés hors du Congo, principalement aux États-Unis et en Europe. [Encadrement des transferts à valider.]</li>
      </ul>
      <h2>Durée de conservation</h2>
      <p>Transcriptions et résumés : [durée à définir, par exemple 12 mois], puis suppression. Compte : jusqu&apos;à sa fermeture.</p>
      <h2>Vos droits</h2>
      <p>Accès, rectification, suppression et opposition : écrivez-nous sur WhatsApp au +242 05 794 93 93 ou à [e-mail à compléter].</p>
    </>
  );
}
