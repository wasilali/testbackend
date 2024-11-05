require('dotenv').config();
const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const userEmail = process.env.NODE_EMAIL_USER || "";
const userPassword = process.env.NODE_EMAIL_PASSWORD || "";

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: userEmail,
    pass: userPassword
  },
});

const sendOtp = async (email, otp) => {
  try {
    await transporter.sendMail({
      from: userEmail,
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP code is ${otp}.`,
    });
  } catch (error) {
    console.error("Error sending OTP email:", error);
  }
};

exports.signup = async (req, res) => {
  const { email, password } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = crypto.randomInt(100000, 999999);
    const user = new User({ email, password: hashedPassword, otp });
    await user.save();

    await sendOtp(email, otp);
    res.status(201).json({ message: 'User created. Please verify your OTP.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.verifyOtp = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'User not found' });
    if (Number(user.otp) !== Number(otp)) return res.status(400).json({ error: 'Invalid OTP' });

    user.verified = true;
    user.otp = null; 
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ 
      message: 'User verified successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        verified: user.verified
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error verifying OTP' });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !user.verified) return res.status(400).json({ error: 'User not verified' });
    if (await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.json({ 
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          email: user.email,
          verified: user.verified
        }
      });
    } else {
      res.status(400).json({ error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error logging in user' });
  }
};
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'User not found' });

    const otp = crypto.randomInt(100000, 999999);
    user.otp = otp;
    await user.save();

    await sendOtp(email, otp);
    res.json({ message: 'OTP sent to your email' });
  } catch (error) {
    res.status(500).json({ error: 'Error sending OTP' });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || user.otp !== Number(otp)) return res.status(400).json({ error: 'Invalid OTP' });

    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = null; 
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error resetting password' });
  }
};

exports.logout = async (req, res) => {
  try {
    res.json({ 
      message: 'Logged out successfully',
      token: null 
    });
  } catch (error) {
    res.status(500).json({ error: 'Error logging out user' });
  }
};
