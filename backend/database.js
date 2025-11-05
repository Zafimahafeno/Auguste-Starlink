// backend/database.js
const fs = require('fs');
const path = require('path');
const config = require('./config');

function readDB() {
    if (!fs.existsSync(config.DB_PATH)) return [];
    const data = fs.readFileSync(config.DB_PATH, 'utf8');
    return JSON.parse(data);
}

function writeDB(users) {
    fs.writeFileSync(config.DB_PATH, JSON.stringify(users, null, 2));
}

function getAllUsers() {
    return readDB();
}

function createUser(username, email, ip_address, plan) {
    const users = readDB();
    const id = users.length > 0 ? users[users.length - 1].id + 1 : 1;
    users.push({
        id,
        username,
        email,
        ip_address,
        plan,
        dataUsed: 0,
        is_active: false
    });
    writeDB(users);
    return id;
}

function activateUser(id) {
    const users = readDB();
    const user = users.find(u => u.id == id);
    if (user) {
        user.is_active = true;
        writeDB(users);
    }
    return user;
}

// ✅ Nouvelle fonction pour mettre à jour un utilisateur
function updateUser(id, updates = {}) {
    const users = readDB();
    const user = users.find(u => u.id == id);
    if (!user) return null;

    // Met à jour seulement les champs existants
    Object.keys(updates).forEach(key => {
        user[key] = updates[key];
    });

    writeDB(users);
    return user;
}

// ✅ Supprimer un utilisateur
function deleteUser(id) {
    let users = readDB();
    users = users.filter(u => u.id != id);
    writeDB(users);
}

module.exports = {
    getAllUsers,
    createUser,
    activateUser,
    updateUser,
    deleteUser
};
