import Link from "next/link";
import { EARLY_BIRD, PLANS, TOPUP, formatFcfa, planPrice } from "@/lib/billing/plans";
import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { LandingThemeButton } from "@/components/LandingThemeButton";
import "./landing.css";

// Site vitrine (page d'accueil). Règle Leo Grindarss : un titre qui dit le bénéfice,
// un seul bouton (vers l'inscription) et le produit au centre du hero.
export const metadata: Metadata = {
  title: "Vocaly — votre agent téléphonique IA",
  description:
    "Un agent téléphonique IA qui décroche à votre place, 24 h/24, en français. Il répond avec vos prix et vos horaires, note les demandes de rendez-vous et vous envoie le résumé de chaque appel.",
};

export default function Home() {
  return (
    <div className="lp" id="top">
<header className="top">
  <div className="wrap">
    <a href="#top" aria-label="Vocaly, accueil"><Logo className="logo" /></a>
    <nav aria-label="Navigation principale">
      <a href="#comment">Comment ça marche</a>
      <a href="#fonctions">Ce qu’il fait</a>
      <a href="#demo">Démo</a>
      <a href="#tarifs">Tarifs</a>
      <a href="#faq">Questions</a>
    </nav>
    <div className="top-actions">
      <LandingThemeButton />
      <Link className="btn btn-primary" href="/onboarding"><span className="long">Créer mon agent</span><span className="short">Commencer</span></Link>
    </div>
  </div>
</header>

<main>
  {/* HERO : ce que fait le produit + le bénéfice + un seul CTA */}
  <section className="hero">
    <div className="wrap">
      <div>
        <span className="badge"><span className="dot"></span>Avant-première ouverte · places limitées</span>
        <h1>Plus aucun appel client perdu. <span className="soft">Même à 21 h.</span></h1>
        <p className="lead">Vocaly vous donne un agent téléphonique IA qui décroche à votre place, 24 h/24, en français. Il répond avec vos prix et vos horaires, note les demandes de rendez-vous et vous envoie le résumé de chaque appel.</p>
        <div className="hero-ctas">
          <Link className="btn btn-primary" href="/onboarding">Créer mon agent en 5 minutes<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></Link>
          <a className="btn btn-ghost" href="#demo">Voir la démo (1 min)</a>
        </div>
        <p className="hero-note"><span>Prêt en 5 minutes</span><span>Sans site web</span><span>Votre agent, votre prénom</span></p>
      </div>

      {/* Le produit au centre : un appel réel, puis le résumé */}
      <div>
        <article className="call" aria-label="Exemple d’appel traité par un agent Vocaly">
          <div className="call-head">
            <div className="avatar" aria-hidden="true">D</div>
            <div className="who">
              <div className="name">Daniel · Clinique Les Palmiers</div>
              <div className="meta">Appel entrant · 21:07 · +242 06 ••• •• 41</div>
            </div>
            <div className="live" aria-hidden="true"><i /><i /><i /><i /><i /></div>
          </div>
          <div className="transcript">
            <div className="msg agent"><small>Daniel</small>Bonsoir, Clinique Les Palmiers, Daniel à votre écoute. Je suis un assistant virtuel. Comment puis-je vous aider&nbsp;?</div>
            <div className="msg client"><small>Client</small>Bonsoir, je voudrais voir le pédiatre demain matin, c’est possible&nbsp;?</div>
            <div className="msg agent"><small>Daniel</small>Le Dr Mabiala consulte demain matin. Je note votre demande et la clinique vous rappelle pour confirmer l’heure. À quel nom&nbsp;?</div>
            <div className="msg client"><small>Client</small>Grâce Okemba, au 06 512 34 56.</div>
          </div>
          <div className="summary">
            <div className="summary-top">
              <span className="status">Appel traité</span>
              <span className="when">Résumé envoyé à 21:09</span>
            </div>
            <p><strong>Demande de rendez-vous :</strong> Grâce Okemba, pédiatrie, demain matin. À rappeler au 06 512 34 56 pour confirmer l’heure.</p>
            <div className="tags"><span className="tag">Rendez-vous</span><span className="tag">Nouveau patient</span></div>
          </div>
        </article>
        <p className="example">Exemple d’appel. Daniel est notre agent de démonstration : vous donnez le prénom de votre choix au vôtre.</p>
      </div>
    </div>
  </section>

  {/* PROBLÈME */}
  <section className="pain">
    <div className="wrap">
      <div className="section-head">
        <span className="eyebrow">Le vrai coût d’un appel manqué</span>
        <h2 className="h2">Un client qui tombe sur votre répondeur appelle quelqu’un d’autre.</h2>
      </div>
      <div className="pain-grid">
        <div className="pain-item">
          <span className="time">10:15</span>
          <h3>Vous êtes occupé</h3>
          <p>En rendez-vous, en caisse, au volant. Le téléphone sonne, vous ne pouvez pas décrocher.</p>
        </div>
        <div className="pain-item">
          <span className="time">21:07</span>
          <h3>Vous êtes fermé</h3>
          <p>Vos clients appellent quand ils ont le temps, souvent le soir et le week-end.</p>
        </div>
        <div className="pain-item">
          <span className="time">×3</span>
          <h3>Tout le monde appelle en même temps</h3>
          <p>Une ligne occupée, c’est un appel perdu. Votre agent répond à plusieurs appels à la fois.</p>
        </div>
      </div>
    </div>
  </section>

  {/* COMMENT ÇA MARCHE */}
  <section id="comment">
    <div className="wrap">
      <div className="section-head">
        <span className="eyebrow">Comment ça marche</span>
        <h2 className="h2">Votre agent est prêt avant la fin de votre café.</h2>
      </div>
      <div className="steps">
        <div className="step">
          <span className="num">1</span>
          <h3>Répondez à quelques questions</h3>
          <p>Votre métier, vos horaires, ce que vos clients demandent le plus. Vocaly crée votre agent à partir de vos réponses.</p>
          <span className="dur">≈ 3 minutes</span>
        </div>
        <div className="step">
          <span className="num">2</span>
          <h3>Donnez-lui votre mémoire</h3>
          <p>Le lien de votre site, ou simplement vos documents : liste de prix, menu, catalogue, photos de vos tarifs.</p>
          <span className="dur">≈ 2 minutes</span>
        </div>
        <div className="step">
          <span className="num">3</span>
          <h3>Il décroche pour vous</h3>
          <p>Vos appels arrivent chez votre agent. Vous recevez un résumé après chaque appel et vous gardez la main à tout moment.</p>
          <span className="dur">24 h/24, 7 j/7</span>
        </div>
      </div>
    </div>
  </section>

  {/* FONCTIONNALITÉS */}
  <section id="fonctions" style={{paddingTop: "0"}}>
    <div className="wrap">
      <div className="section-head">
        <span className="eyebrow">Ce que fait votre agent</span>
        <h2 className="h2">Un standardiste qui ne dort jamais.</h2>
      </div>
      <div className="features">
        <div className="feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
          <h3>Il décroche jour et nuit</h3>
          <p>Week-ends et jours fériés compris. Aucun appel ne sonne dans le vide.</p>
        </div>
        <div className="feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/></svg>
          <h3>Il répond avec vos informations</h3>
          <p>Prix, horaires, adresse, services. S’il ne sait pas, il le dit et prend un message. Il n’invente jamais.</p>
        </div>
        <div className="feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/></svg>
          <h3>Il note les demandes de rendez-vous</h3>
          <p>Nom, numéro, date souhaitée : tout est noté. Vous confirmez, il ne promet jamais un créneau à votre place.</p>
        </div>
        <div className="feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.5 6.5 8.5 6 8.5-6"/></svg>
          <h3>Il vous résume chaque appel</h3>
          <p>Qui a appelé, pourquoi, ce qui a été décidé. Le résumé arrive par e-mail juste après l’appel.</p>
        </div>
        <div className="feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
          <h3>Il porte le nom que vous choisissez</h3>
          <p>Choisissez son prénom et sa voix parmi six voix naturelles, chaleureuses ou plus formelles.</p>
        </div>
        <div className="feature">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 7v5h5"/><path d="M17 3h4v4"/></svg>
          <h3>Il apprend en continu</h3>
          <p>Une question revient souvent ? Ajoutez la réponse en une ligne, publiez, il la connaît à l’appel suivant.</p>
        </div>
      </div>
    </div>
  </section>

  {/* MÉTIERS */}
  <section style={{paddingTop: "0"}}>
    <div className="wrap">
      <div className="section-head">
        <span className="eyebrow">Pour qui</span>
        <h2 className="h2">Pour toutes les entreprises dont le téléphone sonne.</h2>
      </div>
      <div className="trades">
        <div className="trade">Cliniques et cabinets<span>Rendez-vous, urgences, spécialistes</span></div>
        <div className="trade">Écoles privées<span>Inscriptions, frais, horaires</span></div>
        <div className="trade">Hôtels et résidences<span>Disponibilités, tarifs, transferts</span></div>
        <div className="trade">Commerces et boutiques<span>Stock, prix, livraison</span></div>
        <div className="trade">Agences immobilières<span>Biens disponibles, visites</span></div>
        <div className="trade">Restaurants<span>Réservations, menu, livraison</span></div>
        <div className="trade">Artisans et services<span>Devis, interventions</span></div>
      </div>
    </div>
  </section>

  {/* DÉMO VIDÉO */}
  <section className="demo" id="demo">
    <div className="wrap">
      <div>
        <span className="eyebrow">Démo · 1 min 10</span>
        <h2 className="h2" style={{marginTop: "16px"}}>Voyez Daniel décrocher à la place d’un chef d’entreprise.</h2>
        <ul>
          <li><b>0:00</b><span>Un client appelle, personne ne décroche.</span></li>
          <li><b>0:20</b><span>Vous configurez votre agent en quelques questions.</span></li>
          <li><b>0:30</b><span>Daniel répond avec vos horaires, vos prix, vos services.</span></li>
          <li><b>0:40</b><span>Le résumé de l’appel arrive : qui, pourquoi, quoi faire.</span></li>
        </ul>
        <div className="hero-ctas">
          <Link className="btn btn-primary" href="/onboarding">Créer mon agent</Link>
        </div>
      </div>
      <video src="/vocaly-presentation.mp4" poster="/video-poster.jpg" controls playsInline preload="none" aria-label="Vidéo de présentation de Vocaly"></video>
    </div>
  </section>

  {/* TARIFS */}
  <section id="tarifs" style={{paddingTop: "0"}}>
    <div className="wrap">
      <div className="section-head">
        <span className="eyebrow">Tarifs</span>
        <h2 className="h2">Moins cher qu’une standardiste, sans engagement.</h2>
        <p className="lead">Vous essayez votre agent gratuitement dans le navigateur. Vous payez par MTN Mobile Money ou Airtel Money quand vous activez votre numéro. Avant-première : −{EARLY_BIRD.discount * 100} % la première année pour les {EARLY_BIRD.slots} premières entreprises.</p>
      </div>
      <div className="plans">
        {(Object.keys(PLANS) as (keyof typeof PLANS)[]).map((id) => (
          <div className="plan" key={id}>
            <span className="plan-name">{PLANS[id].name}</span>
            <p className="plan-price">{formatFcfa(PLANS[id].monthly)}<span> / mois</span></p>
            <p className="plan-sub">ou {formatFcfa(PLANS[id].yearly)} / an (−17 %, 2 mois offerts)</p>
            <p className="plan-early">Avant-première : {formatFcfa(planPrice(id, "monthly", true))} / mois</p>
            <ul className="offer-list">{PLANS[id].features.map((f) => <li key={f}>{f}</li>)}</ul>
            <Link className="btn btn-primary" href="/onboarding">Créer mon agent</Link>
          </div>
        ))}
        <div className="plan">
          <span className="plan-name">Business+</span>
          <p className="plan-price">Sur devis</p>
          <p className="plan-sub">Plusieurs agents, plusieurs numéros, gros volumes d’appels.</p>
          <ul className="offer-list"><li>Minutes adaptées à votre volume</li><li>Plusieurs agents et numéros +242</li><li>Mise en place complète avec notre équipe</li><li>Suivi dédié</li></ul>
          <a className="btn btn-ghost" href="https://wa.me/242057949393?text=Bonjour%2C%20je%20souhaite%20un%20devis%20Vocaly%20Business%2B" target="_blank" rel="noopener">Demander un devis</a>
        </div>
      </div>
      <p className="plan-note">Minutes supplémentaires : {formatFcfa(TOPUP.amount)} les {TOPUP.minutes} minutes, sans date d’expiration. Les minutes de l’offre se renouvellent chaque mois.</p>
    </div>
  </section>

  {/* OFFRE AVANT-PREMIÈRE */}
  <section id="offre">
    <div className="wrap">
      <div className="offer-card">
        <div>
          <span className="eyebrow">Avant-première</span>
          <h2 className="h2">Les premières places sont ouvertes, à prix réduit.</h2>
          <p className="lead">Nous lançons Vocaly avec un petit nombre d’entreprises pour bien les accompagner. Une fois les places prises, l’offre ferme.</p>
        </div>
        <div>
          <ul className="offer-list">
            <li>Prix de lancement réduit</li>
            <li>Mise en place de votre agent avec nous</li>
            <li>Paiement par MTN Mobile Money ou Airtel Money</li>
            <li>Vos remarques changent directement le produit</li>
          </ul>
          <Link className="btn btn-primary" href="/onboarding">Réserver ma place</Link>
          <p className="seats">Une question ? WhatsApp au <a className="phone" href="https://wa.me/242057949393" target="_blank" rel="noopener">+242 05 794 93 93</a></p>
        </div>
      </div>
    </div>
  </section>

  {/* FAQ */}
  <section id="faq" style={{paddingTop: "0"}}>
    <div className="wrap">
      <div className="section-head">
        <span className="eyebrow">Questions fréquentes</span>
        <h2 className="h2">Ce qu’on nous demande le plus.</h2>
      </div>
      <div className="faq">
        <details>
          <summary>Mes clients vont-ils comprendre l’agent ?</summary>
          <p>Oui. Il parle un français naturel, avec une voix posée, et il s’adapte à la façon dont vos clients posent leurs questions.</p>
        </details>
        <details>
          <summary>Que se passe-t-il s’il ne connaît pas la réponse ?</summary>
          <p>Il le dit simplement et prend un message avec le nom et le numéro de la personne. Vous le retrouvez dans le résumé de l’appel. Il n’invente jamais un prix, un horaire ou un service.</p>
        </details>
        <details>
          <summary>Mes clients sauront-ils qu’ils parlent à une IA ?</summary>
          <p>Oui, il se présente comme un assistant virtuel dès le début de l’appel. C’est plus honnête, et vos clients apprécient d’avoir une réponse immédiate.</p>
        </details>
        <details>
          <summary>Je n’ai pas de site web, est-ce que ça marche ?</summary>
          <p>Oui. Envoyez vos documents ou des photos de votre liste de prix, de votre menu ou de votre catalogue : votre agent apprend à partir de ça.</p>
        </details>
        <details>
          <summary>Combien ça coûte ?</summary>
          <p>Vous créez votre agent et vous l’essayez gratuitement avant de payer. L’offre Essentiel coûte {formatFcfa(PLANS.essentiel.monthly)} par mois et l’offre Pro {formatFcfa(PLANS.pro.monthly)}, avec −{EARLY_BIRD.discount * 100} % la première année pour les premières entreprises. Paiement par MTN Mobile Money ou Airtel Money.</p>
        </details>
        <details>
          <summary>Puis-je reprendre la main sur un appel ?</summary>
          <p>Oui. Vous décidez quand l’agent répond (toujours, seulement hors horaires, ou quand vous ne décrochez pas) et vous pouvez modifier ses réponses à tout moment.</p>
        </details>
      </div>
    </div>
  </section>

  {/* CTA FINAL */}
  <section className="final pain">
    <div className="wrap">
      <span className="eyebrow">Ce soir, quelqu’un va vous appeler</span>
      <h2>Faites en sorte que quelqu’un décroche.</h2>
      <Link className="btn btn-primary btn-invert" href="/onboarding">Créer mon agent en 5 minutes</Link>
      <p className="lead">Une question avant de commencer ? WhatsApp au <a className="phone" href="https://wa.me/242057949393" target="_blank" rel="noopener">+242 05 794 93 93</a></p>
    </div>
  </section>
</main>

<footer>
  <div className="wrap">
    <Logo className="logo" />
    <span>Votre agent téléphonique IA</span>
    <span className="right"><a href="/mentions-legales">Mentions légales</a> · <a href="/confidentialite">Confidentialité</a> · <a href="/cgu">CGU</a> · © 2026 Vocaly · Brazzaville, Congo</span>
  </div>
</footer>
    </div>
  );
}
