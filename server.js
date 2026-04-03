const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Pool kết nối MySQL
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ========== KIỂM TRA & TẠO CỘT last_active NẾU CHƯA CÓ ==========
async function ensureLastActiveColumn() {
    try {
        const [columns] = await pool.execute(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'users' 
            AND COLUMN_NAME = 'last_active'
        `);
        if (columns.length === 0) {
            console.log('⚠️ Đang thêm cột last_active vào bảng users...');
            await pool.execute(`
                ALTER TABLE users 
                ADD COLUMN last_active DATE NULL DEFAULT NULL
            `);
            console.log('✅ Đã thêm cột last_active thành công!');
        }
    } catch (err) {
        console.error('Lỗi khi kiểm tra/ tạo cột last_active:', err);
    }
}

// ========== CẬP NHẬT LEVEL & XP TỪ STREAK ==========
async function syncLevelAndXp(userId) {
    try {
        const [rows] = await pool.execute('SELECT streak FROM users WHERE id = ?', [userId]);
        if (rows.length === 0) return;
        const streak = rows[0].streak;
        const newLevel = Math.floor(streak / 10) + 1;
        const newXp = (streak % 10) * 10;
        await pool.execute('UPDATE users SET level = ?, xp = ? WHERE id = ?', [newLevel, newXp, userId]);
    } catch (err) {
        console.error('Lỗi đồng bộ level/xp:', err);
    }
}

// Cấu hình user hiện tại (demo - lấy user có id = 35 theo database mẫu)
const CURRENT_USER_ID = 35;

// Helper: Kiểm tra user tồn tại
async function userExists(userId) {
    const [rows] = await pool.execute('SELECT id FROM users WHERE id = ?', [userId]);
    return rows.length > 0;
}

// Lấy ngày theo múi giờ Việt Nam (Asia/Ho_Chi_Minh)
function getLocalDate() {
    const today = new Date();
    return today.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}

// Hàm chuyển đổi ngày từ database thành chuỗi YYYY-MM-DD (theo giờ VN)
function formatDateToLocal(date) {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}

// Cập nhật streak (dựa trên last_active)
async function updateStreak(userId) {
    try {
        const [rows] = await pool.execute('SELECT last_active, streak FROM users WHERE id = ?', [userId]);
        if (rows.length === 0) return;
        const user = rows[0];
        const today = getLocalDate();

        const lastDate = formatDateToLocal(user.last_active);
        if (lastDate === today) return; // đã active hôm nay

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

        let newStreak = 1;
        if (lastDate === yesterdayStr) {
            newStreak = user.streak + 1;
        }

        await pool.execute('UPDATE users SET streak = ?, last_active = ? WHERE id = ?', [newStreak, today, userId]);
        await syncLevelAndXp(userId);
    } catch (err) {
        console.error('Lỗi cập nhật streak:', err);
    }
}

// ========== API ==========

// API thông tin user hiện tại
app.get('/api/me', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT id, name, email, phone_number AS phone, streak 
            FROM users 
            WHERE id = ?
        `, [CURRENT_USER_ID]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'User hiện tại không tồn tại trong DB' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error('Lỗi /api/me:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// API lấy danh sách bạn bè (kèm streak, phone)
app.get('/api/friends', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT u.id, u.name, u.email, u.phone_number AS phone, u.streak
            FROM users u
            WHERE u.id IN (
                SELECT friend_id FROM friendships WHERE user_id = ? AND status = 'accepted'
                UNION
                SELECT user_id FROM friendships WHERE friend_id = ? AND status = 'accepted'
            )
        `, [CURRENT_USER_ID, CURRENT_USER_ID]);
        res.json(rows);
    } catch (err) {
        console.error('Lỗi /api/friends:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Tìm kiếm người dùng (chưa là bạn bè)
app.get('/api/users/search', async (req, res) => {
    const { keyword } = req.query;
    if (!keyword) return res.json([]);
    try {
        let query = 'SELECT id, name, email, phone_number AS phone FROM users WHERE';
        let params = [];
        if (!isNaN(keyword)) {
            query += ' id = ? OR phone_number LIKE ?';
            params.push(parseInt(keyword), `%${keyword}%`);
        } else {
            query += ' name LIKE ?';
            params.push(`%${keyword}%`);
        }
        query += ' AND id != ?';
        params.push(CURRENT_USER_ID);
        const [rows] = await pool.execute(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Lỗi /api/users/search:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Kết bạn (thêm vào bảng friendships với status = 'accepted')
app.post('/api/friends/add', async (req, res) => {
    const { friendId } = req.body;
    if (!friendId) return res.status(400).json({ error: 'Thiếu friendId' });
    if (isNaN(friendId)) return res.status(400).json({ error: 'friendId phải là số' });
    
    const friendIdNum = parseInt(friendId);
    if (CURRENT_USER_ID === friendIdNum) {
        return res.status(400).json({ error: 'Không thể tự kết bạn với chính mình' });
    }

    try {
        if (!(await userExists(friendIdNum))) {
            return res.status(404).json({ error: 'Người dùng không tồn tại' });
        }

        // Kiểm tra đã là bạn bè (accepted) chưa
        const [existing] = await pool.execute(`
            SELECT * FROM friendships 
            WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
        `, [CURRENT_USER_ID, friendIdNum, friendIdNum, CURRENT_USER_ID]);
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Đã là bạn bè hoặc đã gửi lời mời' });
        }

        // Lưu theo thứ tự (min, max) để tránh trùng lặp
        const u1 = Math.min(CURRENT_USER_ID, friendIdNum);
        const u2 = Math.max(CURRENT_USER_ID, friendIdNum);
        await pool.execute(`
            INSERT INTO friendships (user_id, friend_id, status) 
            VALUES (?, ?, 'accepted')
        `, [u1, u2]);
        res.json({ success: true });
    } catch (err) {
        console.error('Lỗi /api/friends/add:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Xoá bạn
app.post('/api/friends/remove', async (req, res) => {
    const { friendId } = req.body;
    if (!friendId) return res.status(400).json({ error: 'Thiếu friendId' });
    if (isNaN(friendId)) return res.status(400).json({ error: 'friendId phải là số' });

    const friendIdNum = parseInt(friendId);
    try {
        const u1 = Math.min(CURRENT_USER_ID, friendIdNum);
        const u2 = Math.max(CURRENT_USER_ID, friendIdNum);
        await pool.execute(`
            DELETE FROM friendships 
            WHERE user_id = ? AND friend_id = ?
        `, [u1, u2]);
        res.json({ success: true });
    } catch (err) {
        console.error('Lỗi /api/friends/remove:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// API cập nhật streak cho user hiện tại
app.post('/api/update-streak', async (req, res) => {
    try {
        await updateStreak(CURRENT_USER_ID);
        const [rows] = await pool.execute('SELECT streak FROM users WHERE id = ?', [CURRENT_USER_ID]);
        res.json({ success: true, streak: rows[0].streak });
    } catch (err) {
        console.error('Lỗi /api/update-streak:', err);
        res.status(500).json({ error: 'Lỗi cập nhật streak' });
    }
});

// Khởi động server (kèm kiểm tra cột last_active)
async function startServer() {
    await ensureLastActiveColumn();
    app.listen(port, () => {
        console.log(`🚀 Server running at http://localhost:${port}`);
        console.log(`📌 Đang dùng user ID = ${CURRENT_USER_ID} (có thể thay đổi trong code)`);
    });
}

startServer();