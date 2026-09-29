const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} = require('@simplewebauthn/server');
const config = require('../config/config');
const { pool } = require('../config/database');
const { successResponse, errorResponse } = require('../utils/response');

const generateToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: '1h',
  });
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return errorResponse(res, 'Email and password are required', null, 400);
    }

    if (email.length > 254 || Buffer.byteLength(password, 'utf8') > 72) {
      return errorResponse(res, 'Invalid credentials', null, 401);
    }

    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email.trim().toLowerCase()]);

    if (!rows.length) {
      return errorResponse(res, 'Invalid credentials', null, 401);
    }

    const user = rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return errorResponse(res, 'Invalid credentials', null, 401);
    }

    if (user.status !== 'active') {
      return errorResponse(res, 'User account is inactive', null, 403);
    }

    const token = generateToken(user);
    return successResponse(res, 'Login successful', {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    return errorResponse(res, 'Failed to login', err, 500);
  }
};

const getMe = async (req, res) => {
  return successResponse(res, 'Current user profile', req.user);
};

const logout = async (req, res) => {
  return successResponse(res, 'Logged out successfully', null);
};

const getWebAuthnContext = (req) => {
  const origin = req.get('origin');
  if (!origin || !config.frontendUrls.includes(origin)) {
    throw new Error('Passkey request origin is not allowed');
  }

  const parsedOrigin = new URL(origin);
  if (config.isProduction && parsedOrigin.protocol !== 'https:') {
    throw new Error('Passkeys require HTTPS');
  }

  return {
    origin,
    rpID: parsedOrigin.hostname,
    rpName: process.env.WEBAUTHN_RP_NAME || 'School Admin',
  };
};

const getChallengeFromResponse = (response) => {
  try {
    const clientDataJSON = Buffer.from(response?.response?.clientDataJSON || '', 'base64url').toString('utf8');
    return JSON.parse(clientDataJSON).challenge || null;
  } catch (error) {
    return null;
  }
};

const parseTransports = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const saveChallenge = async ({ challenge, userId = null, purpose, origin, rpID }) => {
  await pool.query('DELETE FROM webauthn_challenges WHERE expires_at <= UTC_TIMESTAMP()');
  await pool.query(
    `INSERT INTO webauthn_challenges (challenge, user_id, purpose, origin, rp_id, expires_at)
     VALUES (?, ?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 5 MINUTE))`,
    [challenge, userId, purpose, origin, rpID]
  );
};

const getRegistrationOptions = async (req, res) => {
  try {
    const { origin, rpID, rpName } = getWebAuthnContext(req);
    const [credentials] = await pool.query(
      'SELECT credential_id, transports FROM webauthn_credentials WHERE user_id = ?',
      [req.user.id]
    );
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: req.user.email,
      userDisplayName: req.user.name,
      userID: new Uint8Array(Buffer.from(String(req.user.id))),
      attestationType: 'none',
      excludeCredentials: credentials.map((credential) => ({
        id: credential.credential_id,
        transports: parseTransports(credential.transports),
      })),
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'required',
        userVerification: 'required',
      },
    });

    await saveChallenge({ challenge: options.challenge, userId: req.user.id, purpose: 'registration', origin, rpID });
    return successResponse(res, 'Passkey registration started', options);
  } catch (error) {
    return errorResponse(res, 'Unable to start passkey registration', error, 400);
  }
};

const verifyPasskeyRegistration = async (req, res) => {
  const challenge = getChallengeFromResponse(req.body);
  if (!challenge) return errorResponse(res, 'Invalid passkey response', null, 400);

  let connection;
  try {
    const { origin } = getWebAuthnContext(req);
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [challenges] = await connection.query(
      `SELECT challenge, origin, rp_id FROM webauthn_challenges
       WHERE challenge = ? AND user_id = ? AND purpose = 'registration' AND expires_at > UTC_TIMESTAMP()
       FOR UPDATE`,
      [challenge, req.user.id]
    );
    if (!challenges.length || challenges[0].origin !== origin) {
      await connection.rollback();
      return errorResponse(res, 'Passkey registration expired or invalid', null, 400);
    }

    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: challenges[0].challenge,
      expectedOrigin: challenges[0].origin,
      expectedRPID: challenges[0].rp_id,
      requireUserVerification: true,
    });
    if (!verification.verified || !verification.registrationInfo) {
      await connection.query('DELETE FROM webauthn_challenges WHERE challenge = ?', [challenge]);
      await connection.commit();
      return errorResponse(res, 'Passkey registration could not be verified', null, 400);
    }

    const credential = verification.registrationInfo.credential;
    await connection.query(
      `INSERT INTO webauthn_credentials (credential_id, user_id, public_key, counter, transports)
       VALUES (?, ?, ?, ?, ?)`,
      [
        credential.id,
        req.user.id,
        Buffer.from(credential.publicKey).toString('base64url'),
        credential.counter,
        credential.transports?.length ? JSON.stringify(credential.transports) : null,
      ]
    );
    await connection.query('DELETE FROM webauthn_challenges WHERE challenge = ?', [challenge]);
    await connection.commit();
    return successResponse(res, 'Passkey added', { id: credential.id }, 201);
  } catch (error) {
    if (connection) await connection.rollback();
    return errorResponse(res, 'Unable to verify passkey registration', error, 400);
  } finally {
    connection?.release();
  }
};

const getPasskeys = async (req, res) => {
  try {
    const [credentials] = await pool.query(
      'SELECT credential_id AS id, created_at FROM webauthn_credentials WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    return successResponse(res, 'Passkeys loaded', credentials);
  } catch (error) {
    return errorResponse(res, 'Unable to load passkeys', error, 500);
  }
};

const deletePasskey = async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM webauthn_credentials WHERE credential_id = ? AND user_id = ?',
      [req.params.credentialId, req.user.id]
    );
    if (!result.affectedRows) return errorResponse(res, 'Passkey not found', null, 404);
    return successResponse(res, 'Passkey removed');
  } catch (error) {
    return errorResponse(res, 'Unable to remove passkey', error, 500);
  }
};

const getAuthenticationOptions = async (req, res) => {
  try {
    const { origin, rpID } = getWebAuthnContext(req);
    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: [],
      userVerification: 'required',
    });
    await saveChallenge({ challenge: options.challenge, purpose: 'authentication', origin, rpID });
    return successResponse(res, 'Passkey sign-in started', options);
  } catch (error) {
    return errorResponse(res, 'Unable to start passkey sign-in', error, 400);
  }
};

const verifyPasskeyAuthentication = async (req, res) => {
  const challenge = getChallengeFromResponse(req.body);
  const credentialId = req.body?.id;
  if (!challenge || typeof credentialId !== 'string') {
    return errorResponse(res, 'Invalid passkey response', null, 400);
  }

  let connection;
  try {
    const { origin } = getWebAuthnContext(req);
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const [challenges] = await connection.query(
      `SELECT challenge, origin, rp_id FROM webauthn_challenges
       WHERE challenge = ? AND user_id IS NULL AND purpose = 'authentication' AND expires_at > UTC_TIMESTAMP()
       FOR UPDATE`,
      [challenge]
    );
    if (!challenges.length || challenges[0].origin !== origin) {
      await connection.rollback();
      return errorResponse(res, 'Passkey sign-in expired or invalid', null, 401);
    }

    const [credentials] = await connection.query(
      `SELECT c.credential_id, c.public_key, c.counter, c.transports, u.id, u.name, u.email, u.role
       FROM webauthn_credentials c JOIN users u ON u.id = c.user_id
       WHERE c.credential_id = ? AND u.status = 'active' LIMIT 1`,
      [credentialId]
    );
    if (!credentials.length) {
      await connection.query('DELETE FROM webauthn_challenges WHERE challenge = ?', [challenge]);
      await connection.commit();
      return errorResponse(res, 'Passkey sign-in failed', null, 401);
    }

    const credential = credentials[0];
    const verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge: challenges[0].challenge,
      expectedOrigin: challenges[0].origin,
      expectedRPID: challenges[0].rp_id,
      credential: {
        id: credential.credential_id,
        publicKey: new Uint8Array(Buffer.from(credential.public_key, 'base64url')),
        counter: Number(credential.counter),
        transports: parseTransports(credential.transports),
      },
      requireUserVerification: true,
    });
    if (!verification.verified || !verification.authenticationInfo.userVerified) {
      await connection.query('DELETE FROM webauthn_challenges WHERE challenge = ?', [challenge]);
      await connection.commit();
      return errorResponse(res, 'Passkey sign-in failed', null, 401);
    }

    await connection.query(
      'UPDATE webauthn_credentials SET counter = ? WHERE credential_id = ?',
      [verification.authenticationInfo.newCounter, credential.credential_id]
    );
    await connection.query('DELETE FROM webauthn_challenges WHERE challenge = ?', [challenge]);
    await connection.commit();

    const user = { id: credential.id, name: credential.name, email: credential.email, role: credential.role };
    return successResponse(res, 'Login successful', { token: generateToken(user), user });
  } catch (error) {
    if (connection) await connection.rollback();
    return errorResponse(res, 'Passkey sign-in failed', error, 401);
  } finally {
    connection?.release();
  }
};

module.exports = {
  login,
  getMe,
  logout,
  getRegistrationOptions,
  verifyPasskeyRegistration,
  getPasskeys,
  deletePasskey,
  getAuthenticationOptions,
  verifyPasskeyAuthentication,
};
