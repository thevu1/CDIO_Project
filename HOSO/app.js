const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db');
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // nếu dùng HTTPS thì đặt true
}));

// Phục vụ file tĩnh từ thư mục templates
app.use(express.static(path.join(__dirname, 'templates')));

// Routes
app.use('/auth', authRoutes);
app.use('/api/profile', profileRoutes);

// Trang chủ (profile.html)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'profile.html'));
});

app.listen(PORT, () => {
    console.log(`Server chạy tại http://localhost:${PORT}`);
});