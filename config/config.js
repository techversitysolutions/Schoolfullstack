require('dotenv').config();
const crypto = require('crypto');

const isProduction = process.env.NODE_ENV === 'production';
const databaseUser = process.env.DB_USER?.trim();
const configuredJwtSecret = process.env.JWT_SECRET?.trim();
const jwtSecretIsValid = configuredJwtSecret
  && configuredJwtSecret.length >= 32
  && !/(replace_with|change_this_secret|school_secret_change_me)/i.test(configuredJwtSecret);

if (isProduction && !jwtSecretIsValid) {
  throw new Error('Set JWT_SECRET to a unique random value of at least 32 characters in production.');
}

if (isProduction && (!process.env.DB_PASSWORD?.trim() || !databaseUser || databaseUser.toLowerCase() === 'root')) {
  throw new Error('Production must use a dedicated MySQL user with a password.');
}

const frontendUrls = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => new URL(url.trim()).origin);
if (isProduction && frontendUrls.some((url) => new URL(url).protocol !== 'https:')) {
  throw new Error('FRONTEND_URL must use HTTPS in production.');
}

const port = Number(process.env.PORT || 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

const config = {
  port,
  isProduction,
  jwtSecret: jwtSecretIsValid ? configuredJwtSecret : crypto.randomBytes(32).toString('hex'),
  frontendUrls,
  db: {
    host: process.env.DB_HOST || 'localhost',
    user: databaseUser || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'school_database',
    port: Number(process.env.DB_PORT || 3306),
  },
};

module.exports = config;
