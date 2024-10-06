const express = require('express');
const pool = require('../utils/db');

const router = express.Router();

router.get('/role', async (req, res) => {
  try {
    const userId = req.user.id; 
    const [results] = await pool.query('SELECT role FROM account_data WHERE userid = ?', [userId]);

    if (results.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userRole = results[0].role;
    res.status(200).json({ role: userRole });
  } catch (error) {
    console.error('Error fetching user role:', error);
    res.status(500).json({ message: 'Failed to fetch user role.' });
  }
});

module.exports = router;
