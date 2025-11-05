// backend/wireguard.js
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// Assurez-vous que le dossier client existe
if (!fs.existsSync(config.CLIENTS_DIR)) {
    fs.mkdirSync(config.CLIENTS_DIR, { recursive: true });
}

// ⚠️ NOUVEAU: Importation de la librairie pour la cryptographie WireGuard
// Note: Pour que ce code fonctionne, vous devez installer cette librairie.
// Exécutez : npm install @stablelib/x25519 @stablelib/base64
const { generateKeyPair } = require('@stablelib/x25519'); 
const { encode } = require('@stablelib/base64');

// Fonction pour encoder en Base64 sans padding (format WireGuard)
function base64Encode(buffer) {
    // utilise la fonction d'encodage de la librairie stablelib/base64
    return encode(buffer).trim();
}

function ensureServerKeys() {
    const privPath = path.join(config.WIREGUARD_DIR, 'server_private.key');
    const pubPath = path.join(config.WIREGUARD_DIR, 'server_public.key');

    if (!fs.existsSync(privPath)) {
        // ✅ CORRECTION MAJEURE: Utilisation de @stablelib/x25519 pour contourner 
        // l'erreur 'format: raw' de l'API crypto de Node.js v24.
        const keys = generateKeyPair();

        // Les clés sont déjà des buffers (Uint8Array)
        fs.writeFileSync(privPath, keys.secretKey);
        fs.writeFileSync(pubPath, keys.publicKey);
        console.log('✅ Clés du serveur WireGuard générées.');
    }
}

function getServerPublicKey() {
    const pubPath = path.join(config.WIREGUARD_DIR, 'server_public.key');
    // Lire le buffer et l'encoder
    const pubBuffer = fs.readFileSync(pubPath); 
    return base64Encode(pubBuffer);
}

// Fonction utilitaire pour générer la config client (utilise la même librairie)
function generateClientConfig(username, clientIP) {
    ensureServerKeys();
    const serverPub = getServerPublicKey();
    // Génère une nouvelle paire de clés pour le client
    const keys = generateKeyPair(); 

    const clientPriv = base64Encode(keys.secretKey);
    const clientPub = base64Encode(keys.publicKey);

    const clientConfig = `[Interface]
PrivateKey = ${clientPriv}
Address = ${clientIP}/24
DNS = ${config.DNS}

[Peer]
PublicKey = ${serverPub}
Endpoint = ${config.ENDPOINT}
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
`;

    const safeUsername = username.replace(/[^\w.-]/g, '_');
    const configPath = path.join(config.CLIENTS_DIR, `${safeUsername}.conf`);
    fs.writeFileSync(configPath, clientConfig);

    return { configPath, clientPub, safeUsername };
}

function updateServerConfig(clientPub, clientIP) {
    let content = '';
    if (fs.existsSync(config.WG_CONF)) {
        content = fs.readFileSync(config.WG_CONF, 'utf8');
    } else {
        const privPath = path.join(config.WIREGUARD_DIR, 'server_private.key');
        const serverPrivBuffer = fs.readFileSync(privPath);
        const serverPriv = base64Encode(serverPrivBuffer);
        
        content = `[Interface]
PrivateKey = ${serverPriv}
Address = ${config.SERVER_IP}/24
ListenPort = ${config.SERVER_PORT}
`;
    }

    if (!content.includes(`PublicKey = ${clientPub}`)) {
        content += `\n[Peer]
PublicKey = ${clientPub}
AllowedIPs = ${clientIP}/32
`;
        fs.writeFileSync(config.WG_CONF, content);
        console.log('✅ Config WireGuard mise à jour.');
    }
}

function activateUser(username, clientIP) {
    const { configPath, clientPub, safeUsername } = generateClientConfig(username, clientIP);
    updateServerConfig(clientPub, clientIP);
    return { configPath, safeUsername };
}

module.exports = { activateUser };