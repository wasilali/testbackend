const express = require('express');
const { signup, verifyOtp, login, forgotPassword, resetPassword, logout } = require('../controllers/authController');
const router = express.Router();

router.post('/signup', signup);
router.post('/verify-otp', verifyOtp);
router.post('/login', login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;