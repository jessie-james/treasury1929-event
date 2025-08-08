#!/usr/bin/env node

// Test password validation directly
const { promisify } = require('util');
const { scrypt, timingSafeEqual, randomBytes } = require('crypto');

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied, stored) {
  try {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = await scryptAsync(supplied, salt, 64);
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}

async function testPasswords() {
  console.log('Testing password validation...');
  
  // Ayla's stored password hash from database
  const aylaStoredHash = '76ee1a0ec3c9271eb8974838dbf6262cf76443cf0e662acd6601f54afb0182afa67e475b8313dfdfdb174be5dc03a53f3b14c0f27ea992a2d331a2a0c513a472.5b3b334fe1cc3e75058c72aa80ca2f2c';
  
  // Test various passwords
  const testPasswords = [
    'admin123',
    'newpassword123', 
    'ayla123',
    'password',
    'Ayla123!'
  ];
  
  console.log('Testing passwords against Ayla\'s hash...');
  for (const password of testPasswords) {
    const isValid = await comparePasswords(password, aylaStoredHash);
    console.log(`Password "${password}": ${isValid ? '✅ VALID' : '❌ INVALID'}`);
  }
  
  // Create a new hash to verify our function works
  console.log('\nTesting hash creation and validation...');
  const testPassword = 'test123';
  const newHash = await hashPassword(testPassword);
  console.log(`New hash: ${newHash}`);
  
  const isValidNew = await comparePasswords(testPassword, newHash);
  console.log(`New password validation: ${isValidNew ? '✅ WORKS' : '❌ BROKEN'}`);
}

testPasswords();