#!/usr/bin/env node

// Fix Ayla's password to a known value
const { promisify } = require('util');
const { scrypt, randomBytes } = require('crypto');

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function fixAylaPassword() {
  console.log('🔧 Fixing Ayla password to a known value...');
  
  const newPassword = 'ayla123';
  const hashedPassword = await hashPassword(newPassword);
  
  console.log(`New password hash: ${hashedPassword}`);
  console.log(`Setting Ayla's password to: ${newPassword}`);
  
  // We'll use this hash to update the database
  return hashedPassword;
}

fixAylaPassword().then(hash => {
  console.log(`\nTo fix Ayla's login, run this SQL:\nUPDATE users SET password = '${hash}' WHERE email = 'ayla@thetreasury1929.com';`);
});