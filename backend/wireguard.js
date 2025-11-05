// backend/wireguard.js
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { generateKeyPair } = require('@stablelib/x25519'); 
const { encode } = require('@stablelib/base64');

// Base64 WireGuard
function base64Encode(buffer) {
    return encode(buffer).trim();
}

// Créer clés serveur si inexistantes
function ensureServerKeys() {
    const privPath = path.join(config.SERVER_DIR, 'server_private.key');
    const pubPath = path.join(config.SERVER_DIR, 'server_public.key');

    if (!fs.existsSync(privPath)) {
        const keys = generateKeyPair();
        fs.writeFileSync(privPath, keys.secretKey);
        fs.writeFileSync(pubPath, keys.publicKey);
        console.log('✅ Clés du serveur WireGuard générées.');
    }
}

function getServerPublicKey() {
    const pubPath = path.join(config.SERVER_DIR, 'server_public.key');
    const pubBuffer = fs.readFileSync(pubPath); 
    return base64Encode(pubBuffer);
}

// Génère la config client
function generateClientConfig(username, clientIP) {
    ensureServerKeys();
    const serverPub = getServerPublicKey();
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

// Mise à jour config serveur WireGuard
function updateServerConfig(clientPub, clientIP) {
    let content = '';
    if (fs.existsSync(config.WG_CONF)) {
        content = fs.readFileSync(config.WG_CONF, 'utf8');
    } else {
        const privPath = path.join(config.SERVER_DIR, 'server_private.key');
        const serverPriv = base64Encode(fs.readFileSync(privPath));
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
        console.log('✅ Config WireGuard serveur mise à jour.');
    }
}

// Active utilisateur
function activateUser(username, clientIP) {
    const { configPath, clientPub, safeUsername } = generateClientConfig(username, clientIP);
    updateServerConfig(clientPub, clientIP);
    return { configPath, safeUsername };
}

module.exports = { activateUser };
