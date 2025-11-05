const fs = require('fs');
const path = require('path');
const USERS_FILE = path.join(__dirname, 'users.json');

function readUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

function getAllUsers() {
  return readUsers();
}

function createUser(username, email, ip_address, plan = '30gb') {
  const users = readUsers();
  const newUser = {
    id: users.length ? users[users.length - 1].id + 1 : 1,
    username,
    email,
    ip_address,
    plan,
    is_active: false,
    usage_mb: 0
  };
  users.push(newUser);
  writeUsers(users);
  return newUser;
}

function activateUser(userId) {
  const users = readUsers();
  const user = users.find(u => u.id == userId);
  if (user) {
    user.is_active = true;
    writeUsers(users);
    return user;
  }
  return null;
}

function updateUserPlan(userId, plan) {
  const users = readUsers();
  const user = users.find(u => u.id == userId);
  if (user) {
    user.plan = plan;
    writeUsers(users);
    return user;
  }
  return null;
}

module.exports = {
  getAllUsers,
  createUser,
  activateUser,
  updateUserPlan
};
