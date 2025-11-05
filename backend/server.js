// server.js
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const database = require('./database');
const wireguard = require('./wireguard');
const config = require('./config');
const { ALLOWED_PLANS, DEFAULT_PLAN } = require('./config');
const Mailjet = require('node-mailjet');
// === CONFIG MAILJET API HTTP ===
const mailjet = new Mailjet({
  apiKey: 'cb528304f83e50156b5b04d933d8ad20',
  apiSecret: '55b3d9372b4d99008b28cc0061bb8f87',
});

const app = express();
const PORT = process.env.PORT || 5000;

// ⚠️ ADMIN
const ADMIN_USERNAME = 'Auguste';
const ADMIN_PASSWORD = 'adminstarlink2025';

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use(session({
    secret: 'starlink-vpn-secret-2025',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Messages flash
app.use((req, res, next) => {
    res.locals.messages = req.session.messages || [];
    req.session.messages = [];
    res.locals.isAuthenticated = req.session.isAuthenticated;
    next();
});

// View engine
app.set('view engine', 'html');
app.set('views', path.join(__dirname, '../frontend/views'));
app.engine('html', require('ejs').__express);

// Middleware auth
function isAuthenticated(req, res, next) {
    if (req.session.isAuthenticated) return next();
    req.session.messages.push('Accès non autorisé. Veuillez vous connecter.');
    res.redirect('/admin-login');
}

// === FONCTION ENVOI EMAIL MAILJET API HTTP ===
async function sendMail(toEmail, subject, text, attachments = []) {
    const messages = [{
        From: { Email: "zanajaona2404@gmail.com", Name: "Auguste Starlink VPN" },
        To: [{ Email: toEmail }],
        Subject: subject,
        TextPart: text,
        Attachments: attachments.map(att => ({
            ContentType: 'text/plain',
            Filename: att.filename,
            Base64Content: Buffer.from(att.content || fs.readFileSync(att.path)).toString('base64')
        }))
    }];

    try {
        await mailjet.post('send', { version: 'v3.1' }).request({ Messages: messages });
        console.log(`✅ Email envoyé à ${toEmail}`);
    } catch (err) {
        console.error(`❌ Erreur envoi email à ${toEmail}:`, err);
    }
}

// -----------------------
// Routes publiques
// -----------------------
app.get('/', (req, res) => res.render('home'));
app.get('/tarifs', (req, res) => res.render('tarifs'));
app.get('/register', (req, res) => {
    const selectedPlan = req.query.plan || DEFAULT_PLAN;
    res.render('register', { selectedPlan });
});

app.post('/register', (req, res) => {
    let { username, email, plan } = req.body;
    plan = plan?.toLowerCase() || DEFAULT_PLAN;

    if (!ALLOWED_PLANS[plan]) plan = DEFAULT_PLAN;

    if (!username || !email) {
        req.session.messages.push('Tous les champs sont requis.');
        return res.redirect(`/register?plan=${plan}`);
    }

    const users = database.getAllUsers();
    const lastUser = users.length > 0 ? users[users.length - 1] : null;
    let nextIP = '10.8.0.2';
    if (lastUser) {
        const lastNum = parseInt(lastUser.ip_address.split('.').pop());
        if (!isNaN(lastNum)) nextIP = `10.8.0.${lastNum + 1}`;
    }

    database.createUser(username, email, nextIP, plan);
    req.session.messages.push('Inscription réussie. En attente de validation.');
    res.redirect(`/register?plan=${plan}`);
});

// -----------------------
// Auth Admin
// -----------------------
app.get('/admin-login', (req, res) => res.render('admin-login'));
app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        req.session.isAuthenticated = true;
        req.session.messages.push('Connexion Administrateur réussie.');
        return res.redirect('/admin');
    }
    req.session.messages.push('Nom d\'utilisateur ou mot de passe incorrect.');
    res.redirect('/admin-login');
});
app.get('/admin/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) console.error(err);
        res.redirect('/');
    });
});

// -----------------------
// Dashboard Admin avec recherche
// -----------------------
app.get('/admin', isAuthenticated, (req, res) => {
    let users = database.getAllUsers();

    const search = req.query.search ? req.query.search.toLowerCase() : '';
    if (search) users = users.filter(u => u.email.toLowerCase().includes(search));

    res.render('admin', { users, search, ALLOWED_PLANS });
});

// -----------------------
// Actions Admin : activer, modifier, supprimer
// -----------------------
app.post('/admin/activate', isAuthenticated, async (req, res) => {
    const { userId } = req.body;
    const user = database.activateUser(userId);
    if (!user) {
        req.session.messages.push('Utilisateur non trouvé.');
        return res.redirect('/admin');
    }

    wireguard.activateUser(user.username, user.ip_address);

    const readmeContent = `Bonjour ${user.username} !
Merci d'avoir choisi Auguste Starlink VPN. Voici les étapes pour configurer votre connexion :
1️⃣ Téléchargez WireGuard : https://www.wireguard.com/install/
2️⃣ Importez le fichier .conf : ${user.username}.conf
3️⃣ Activez le tunnel
Support: zanajaona2404@gmail.com`;

    await sendMail(user.email, '✅ Confirmation de votre demande !', readmeContent, [
        { filename: `${user.username}.conf`, path: path.join(config.CLIENTS_DIR, `${user.username}.conf`) },
        { filename: 'readme.txt', content: readmeContent }
    ]);

    req.session.messages.push(`✅ ${user.username} activé et email envoyé !`);
    res.redirect('/admin');
});

app.post('/admin/update-plan', isAuthenticated, (req, res) => {
    const { userId, plan } = req.body;
    if (!ALLOWED_PLANS[plan]) {
        req.session.messages.push('Plan invalide.');
        return res.redirect('/admin');
    }
    database.updateUser(userId, { plan });
    req.session.messages.push('Plan mis à jour avec succès.');
    res.redirect('/admin');
});

app.post('/admin/delete', isAuthenticated, (req, res) => {
    const { userId } = req.body;
    database.deleteUser(userId);
    req.session.messages.push('Utilisateur supprimé avec succès.');
    res.redirect('/admin');
});

// -----------------------
// Téléchargement .conf
// -----------------------
app.get('/download/:username', (req, res) => {
    const safeUsername = req.params.username.replace(/[^\w.-]/g, '_');
    const filePath = path.join(config.CLIENTS_DIR, `${safeUsername}.conf`);
    if (fs.existsSync(filePath)) res.download(filePath);
    else res.status(404).send('Fichier non trouvé.');
});

// -----------------------
// Surveillance consommation et alertes
// -----------------------
function monitorUsage() {
    const users = database.getAllUsers();
    users.forEach(async user => {
        if (!user.is_active) return;
        const planMB = ALLOWED_PLANS[user.plan];
        const usedMB = user.dataUsed || 0;
        const percent = Math.round((usedMB / planMB) * 100);

        if (!user.lastAlert || percent - user.lastAlert >= 1) {
            let alertType = null;
            if (percent >= 100) alertType = 'forfait épuisé';
            else if (percent >= 90) alertType = 'forfait presque épuisé';
            else if (percent >= 50) alertType = '50% utilisé';

            if (alertType) {
                await sendMail(user.email, `⚠️ Alerte consommation VPN : ${alertType}`,
                    `Bonjour ${user.username}, votre consommation VPN est à ${percent}% de votre forfait (${user.plan}).`);
                database.updateUser(user.id, { lastAlert: percent });
                console.log(`Alerte envoyée à ${user.username} : ${percent}%`);
            }
        }
    });
}
setInterval(monitorUsage, 5 * 60 * 1000);

// -----------------------
// Serveur
// -----------------------
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`));

module.exports = app;
