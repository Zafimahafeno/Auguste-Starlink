const path = require('path');

const BASE_DIR = path.join(__dirname, '..');
const WIREGUARD_DIR = path.join(BASE_DIR, 'wireguard');
const CLIENTS_DIR = path.join(WIREGUARD_DIR, 'clients');
const WG_CONF = path.join(WIREGUARD_DIR, 'wg0.conf');

const fs = require('fs');
if (!fs.existsSync(CLIENTS_DIR)) {
  fs.mkdirSync(CLIENTS_DIR, { recursive: true });
}

module.exports = {
  WIREGUARD_DIR,
  CLIENTS_DIR,
  WG_CONF,
  SERVER_IP: '10.8.0.1',
  SERVER_PORT: 51820,
  // 🔔 REMPLACE ceci par ton IP publique ou DDNS
  ENDPOINT: '192.168.8.100:51820',
  DNS: '8.8.8.8',
  DB_PATH: path.join(__dirname, 'users.json')
};
module.exports = {
  CLIENTS_DIR: path.join(__dirname, '..', 'wireguard', 'clients'), // <-- remonté d'un niveau
  ALLOWED_PLANS: {
    '30gb': 30 * 1024,
    '50gb': 50 * 1024,
    '100gb': 100 * 1024
  },
  DEFAULT_PLAN: '30gb'
};
