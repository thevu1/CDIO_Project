const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');
const router = express.Router();

// Đăng ký
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const hashed = await bcrypt.hash(password, 10);
        const [result] = await db.execute(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, hashed]
        );
        req.session.userId = result.insertId;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Đăng nhập
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) return res.status(401).json({ error: 'Sai email hoặc mật khẩu' });
        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(401).json({ error: 'Sai email hoặc mật khẩu' });
        req.session.userId = user.id;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Đăng xuất
router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Kiểm tra trạng thái đăng nhập
router.get('/me', (req, res) => {
    if (req.session.userId) res.json({ userId: req.session.userId });
    else res.status(401).json({ error: 'Chưa đăng nhập' });
});

module.exports = router;