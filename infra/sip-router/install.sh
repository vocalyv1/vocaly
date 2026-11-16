#!/usr/bin/env bash
# Vocaly : installation du routeur SIP sur un serveur Ubuntu 24.04 neuf (à lancer en root).
# Usage : bash install.sh   (le fichier vocaly-sip.env doit être rempli à côté de ce script)
set -euo pipefail
cd "$(dirname "$0")"
[ -f vocaly-sip.env ] || { echo "Créez d'abord vocaly-sip.env à partir de vocaly-sip.env.example"; exit 1; }
set -a; . ./vocaly-sip.env; set +a

apt-get update -q
DEBIAN_FRONTEND=noninteractive apt-get install -y -q kamailio kamailio-extra-modules rtpengine-daemon ufw

# Son (RTP) : rtpengine sur l'IP publique, ports 30000-40000.
cat > /etc/rtpengine/rtpengine.conf <<CONF
[rtpengine]
interface = ${PUBLIC_IP}
listen-ng = 127.0.0.1:2223
port-min = 30000
port-max = 40000
log-level = 5
log-facility = daemon
CONF
systemctl enable --now rtpengine-daemon || systemctl enable --now rtpengine

# Signalisation (SIP) : Kamailio avec les variables du fichier .env.
install -m 640 -o root -g kamailio kamailio.cfg /etc/kamailio/kamailio.cfg
install -m 640 -o root -g kamailio vocaly-sip.env /etc/kamailio/vocaly-sip.env
mkdir -p /etc/systemd/system/kamailio.service.d
cat > /etc/systemd/system/kamailio.service.d/vocaly.conf <<CONF
[Service]
EnvironmentFile=/etc/kamailio/vocaly-sip.env
CONF
systemctl daemon-reload
kamailio -c -f /etc/kamailio/kamailio.cfg
systemctl enable kamailio && systemctl restart kamailio

# Pare-feu : SSH, SIP, RTP.
ufw allow OpenSSH
ufw allow 5060/udp
ufw allow 5060/tcp
ufw allow 30000:40000/udp
ufw --force enable

echo "Routeur Vocaly installé. Journal : journalctl -u kamailio -f"
