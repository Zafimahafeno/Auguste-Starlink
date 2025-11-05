// backend/database.js
const fs = require("fs");
const path = require("path");
const config = require("./config");

// 🔒 Fonction sûre pour lire la base de données
function readDB() {
  try {
    // Si le fichier n’existe pas, on le crée avec une structure vide
    if (!fs.existsSync(config.DB_PATH)) {
      fs.writeFileSync(config.DB_PATH, JSON.stringify([], null, 2));
      return [];
    }

    // Lire le contenu
    const data = fs.readFileSync(config.DB_PATH, "utf8").trim();

    // Si le fichier est vide
    if (!data) {
      fs.writeFileSync(config.DB_PATH, JSON.stringify([], null, 2));
      return [];
    }

    // Si le JSON est valide
    return JSON.parse(data);
  } catch (err) {
    console.error("⚠️ Erreur de lecture du fichier DB :", err);
    // En cas de corruption, on réinitialise la base pour éviter le crash
    fs.writeFileSync(config.DB_PATH, JSON.stringify([], null, 2));
    return [];
  }
}

// 🔒 Fonction sûre pour écrire dans la base
function writeDB(users) {
  try {
    fs.writeFileSync(config.DB_PATH, JSON.stringify(users, null, 2));
  } catch (err) {
    console.error("⚠️ Erreur d’écriture dans la DB :", err);
  }
}

// 🔹 Récupérer tous les utilisateurs
function getAllUsers() {
  return readDB();
}

// 🔹 Créer un utilisateur
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
    is_active: false,
  });

  writeDB(users);
  return id;
}

// 🔹 Activer un utilisateur
function activateUser(id) {
  const users = readDB();
  const user = users.find((u) => u.id == id);
  if (user) {
    user.is_active = true;
    writeDB(users);
  }
  return user;
}

// 🔹 Mettre à jour un utilisateur
function updateUser(id, updates = {}) {
  const users = readDB();
  const user = users.find((u) => u.id == id);
  if (!user) return null;

  Object.keys(updates).forEach((key) => {
    user[key] = updates[key];
  });

  writeDB(users);
  return user;
}

// 🔹 Supprimer un utilisateur
function deleteUser(id) {
  let users = readDB();
  users = users.filter((u) => u.id != id);
  writeDB(users);
}

module.exports = {
  getAllUsers,
  createUser,
  activateUser,
  updateUser,
  deleteUser,
};
