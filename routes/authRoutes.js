const express = require('express');
const {
	login,
	getMe,
	logout,
	getRegistrationOptions,
	verifyPasskeyRegistration,
	getPasskeys,
	deletePasskey,
	getAuthenticationOptions,
	verifyPasskeyAuthentication,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { loginLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

router.post('/login', loginLimiter, login);
router.post('/passkeys/authentication-options', loginLimiter, getAuthenticationOptions);
router.post('/passkeys/authentication-verify', loginLimiter, verifyPasskeyAuthentication);
router.post('/passkeys/registration-options', protect, getRegistrationOptions);
router.post('/passkeys/registration-verify', protect, verifyPasskeyRegistration);
router.get('/passkeys', protect, getPasskeys);
router.delete('/passkeys/:credentialId', protect, deletePasskey);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
