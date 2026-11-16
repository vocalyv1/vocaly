# Routeur SIP Vocaly

Un seul numéro Airtel reçoit tous les appels renvoyés (`**21*`) par les entreprises clientes.
Ce routeur lit le **numéro d'origine** (en-tête `Diversion`, sinon `History-Info`) et transmet l'appel à ElevenLabs
en l'adressant à ce numéro. Le site Vocaly a relié chaque numéro d'entreprise à son agent dans ElevenLabs (`phone_routes`).

```
Appelant → numéro de l'entreprise → renvoi **21* → numéro Vocaly (Airtel) → trunk SIP → ce routeur → ElevenLabs → agent de l'entreprise
```

Sens inverse : quand un agent transfère un appel vers un humain, ElevenLabs passe par ce routeur (identifiants digest), qui sort par Airtel.
Le son (RTP) passe par `rtpengine` sur ce serveur : Airtel ne voit qu'une seule adresse IP.

## Serveur

- Ubuntu 24.04, 1 vCPU / 2 Go suffisent pour démarrer, **adresse IP publique fixe**.
- Ports ouverts : 22/tcp, 5060/udp+tcp (SIP), 30000-40000/udp (son).

## Installation

```bash
git clone https://github.com/vocalyv1/vocaly.git && cd vocaly/infra/sip-router
cp vocaly-sip.env.example vocaly-sip.env && nano vocaly-sip.env   # remplir avec les infos Airtel
sudo bash install.sh
journalctl -u kamailio -f                                       # suivre les appels
```

## Vercel (site)

| Variable | Valeur |
| --- | --- |
| `VOCALY_ROUTING_NUMBER` | le numéro Airtel, format `+242…` |
| `SIP_ROUTER_IP` | l'IP publique du serveur |
| `SIP_ROUTER_USER` / `SIP_ROUTER_PASSWORD` | identiques à `EL_USER` / `EL_PASSWORD` du fichier `.env` du routeur |

Avec ces variables et `ELEVENLABS_API_KEY`, la page **Téléphone** relie automatiquement le numéro saisi par l'entreprise à son agent.
Le statut passe à « Connecté » au premier appel réel reçu par l'agent.

## Tester sans Airtel

`kamailio -c -f kamailio.cfg` vérifie la syntaxe. Les règles de numéro sont les mêmes que `src/lib/phone/number.ts`
(+242 suivi de 9 chiffres : mobiles 0x…, fixes 22… ; un 0 manquant est ajouté).

## Limites connues

- Si Airtel ne transmet pas le numéro d'origine (renvoi depuis un autre opérateur notamment), l'appel est refusé (404) et journalisé.
- Signalisation vers ElevenLabs en TCP ; passer en TLS (`EL_PORT=5061`, `EL_TRANSPORT=tls`) nécessite d'ajouter le module `tls` à Kamailio.
