// backend/config.js
const path = require('path');
const fs = require('fs');

const BASE_DIR = path.join(__dirname, '..');
const WIREGUARD_DIR = path.join(BASE_DIR, 'wireguard');
const CLIENTS_DIR = path.join(WIREGUARD_DIR, 'clients');
const SERVER_DIR = path.join(WIREGUARD_DIR, 'server'); // dossier pour les clés
const WG_CONF = path.join(WIREGUARD_DIR, 'wg0.conf');
const DB_PATH = path.join(__dirname, 'users.json');

// Créer automatiquement les dossiers si ils n'existent pas
[WIREGUARD_DIR, CLIENTS_DIR, SERVER_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

module.exports = {
    WIREGUARD_DIR,
    CLIENTS_DIR,
    SERVER_DIR,
    WG_CONF,
    SERVER_IP: '10.8.0.1',
    SERVER_PORT: 51820,
    ENDPOINT: '192.168.8.100:51820', // Remplace par ton IP publique ou DDNS
    DNS: '8.8.8.8',
    DB_PATH,
    ALLOWED_PLANS: {
        '30gb': 30 * 1024,
        '50gb': 50 * 1024,
        '100gb': 100 * 1024
    },
    DEFAULT_PLAN: '30gb'
};
