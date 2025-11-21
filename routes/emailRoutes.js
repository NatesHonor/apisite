const express = require('express');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const pool = require('../utils/db');
const router = express.Router();
const activeTokens = new Map();
const lastRequestTimes = new Map();

const transporter = nodemailer.createTransport({
  host: 'smtp.zoho.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.ZOHO_USER,
    pass: process.env.ZOHO_PASS
  }
});

router.post('/send-verification', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const now = Date.now();
  const lastRequest = lastRequestTimes.get(email);
  if (lastRequest && now - lastRequest < 60 * 1000) {
    return res.status(429).json({ error: 'You can only request a new email once per minute' });
  }
  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const verificationLink = `${process.env.CLIENT_URL}/verify-email?token=${token}`;

  try {
    activeTokens.set(email, { token, expiresAt: now + 15 * 60 * 1000 });
    lastRequestTimes.set(email, now);

    await transporter.sendMail({
      from: process.env.ZOHO_USER,
      to: email,
      subject: 'Verify your email',
      text: `Click here to verify your account: ${verificationLink}`
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Send verification error:', err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

router.post('/verify', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false, message: 'Token required' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.email;

    const stored = activeTokens.get(email);
    if (!stored || stored.token !== token) {
      return res.status(400).json({ success: false, message: 'Token already used or invalid' });
    }
    if (Date.now() > stored.expiresAt) {
      activeTokens.delete(email);
      return res.status(400).json({ success: false, message: 'Token expired' });
    }

    const [results] = await pool.query('SELECT * FROM account_data WHERE email = ?', [email]);
    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await pool.query('UPDATE account_data SET verified = ? WHERE email = ?', [true, email]);
    activeTokens.delete(email);

    return res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    console.error('Verification error:', err);
    return res.status(400).json({ success: false, message: 'Invalid or expired token' });
  }
});

module.exports = router;
