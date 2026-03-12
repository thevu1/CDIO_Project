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

// Cấu hình user hiện tại (cố định để demo)
const CURRENT_USER_ID = 1;

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

// API thông tin user hiện tại
app.get('/api/me', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT id, name, email, phone, streak FROM users WHERE id = ?',
            [CURRENT_USER_ID]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'User hiện tại không tồn tại trong DB' });
        }
        console.log('📌 API /api/me trả về:', rows[0]);
        res.json(rows[0]);
    } catch (err) {
        console.error('Lỗi /api/me:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// API lấy danh sách bạn bè (kèm streak)
app.get('/api/friends', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT u.id, u.name, u.email, u.phone, u.streak
            FROM users u
            WHERE u.id IN (
                SELECT friend_id FROM friends WHERE user_id = ?
                UNION
                SELECT user_id FROM friends WHERE friend_id = ?
            )
        `, [CURRENT_USER_ID, CURRENT_USER_ID]);
        res.json(rows);
    } catch (err) {
        console.error('Lỗi /api/friends:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Tìm kiếm người dùng
app.get('/api/users/search', async (req, res) => {
    const { keyword } = req.query;
    if (!keyword) return res.json([]);
    try {
        let query = 'SELECT id, name, email, phone FROM users WHERE';
        let params = [];
        if (!isNaN(keyword)) {
            query += ' id = ? OR phone LIKE ?';
            params.push(parseInt(keyword), `%${keyword}%`);
        } else {
            query += ' name LIKE ?';
            params.push(`%${keyword}%`);
        }
        // Không trả về chính mình
        query += ' AND id != ?';
        params.push(CURRENT_USER_ID);
        const [rows] = await pool.execute(query, params);
        res.json(rows);
    } catch (err) {
        console.error('Lỗi /api/users/search:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Kết bạn
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

        const [existing] = await pool.execute(
            'SELECT * FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)',
            [CURRENT_USER_ID, friendIdNum, friendIdNum, CURRENT_USER_ID]
        );
        if (existing.length > 0) {
            return res.status(400).json({ error: 'Đã là bạn bè' });
        }

        const u1 = Math.min(CURRENT_USER_ID, friendIdNum);
        const u2 = Math.max(CURRENT_USER_ID, friendIdNum);
        await pool.execute(
            'INSERT INTO friends (user_id, friend_id) VALUES (?, ?)',
            [u1, u2]
        );
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
        await pool.execute(
            'DELETE FROM friends WHERE user_id = ? AND friend_id = ?',
            [u1, u2]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Lỗi /api/friends/remove:', err);
        res.status(500).json({ error: 'Lỗi server' });
    }
});

// Hàm chuyển đổi một đối tượng Date thành chuỗi ngày (YYYY-MM-DD) theo múi giờ Việt Nam
// Hàm chuyển đổi ngày từ database thành chuỗi YYYY-MM-DD theo múi giờ Việt Nam
function formatDateToLocal(date) {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
}

// Cập nhật streak
async function updateStreak(userId) {
    try {
        const [rows] = await pool.execute('SELECT last_active, streak FROM users WHERE id = ?', [userId]);
        if (rows.length === 0) return;
        const user = rows[0];
        const today = getLocalDate();

        // Format last_active từ database
        const lastDate = formatDateToLocal(user.last_active);
        console.log(`📅 last_active DB: ${user.last_active}, lastDate: ${lastDate}, today: ${today}`);

        // Nếu đã điểm danh hôm nay thì không làm gì
        if (lastDate === today) {
            console.log('✅ Đã điểm danh hôm nay, giữ nguyên streak =', user.streak);
            return;
        }

        // Tính ngày hôm qua
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

        let newStreak = 1;
        if (lastDate === yesterdayStr) {
            newStreak = user.streak + 1;
        }

        console.log(`🔄 Cập nhật streak: ${user.streak} → ${newStreak}`);
        await pool.execute('UPDATE users SET streak = ?, last_active = ? WHERE id = ?', [newStreak, today, userId]);
    } catch (err) {
        console.error('Lỗi cập nhật streak:', err);
    }
}

// API cập nhật streak
app.post('/api/update-streak', async (req, res) => {
    try {
        await updateStreak(CURRENT_USER_ID);
        // Lấy lại streak mới để trả về
        const [rows] = await pool.execute('SELECT streak FROM users WHERE id = ?', [CURRENT_USER_ID]);
        res.json({ success: true, streak: rows[0].streak });
    } catch (err) {
        console.error('Lỗi /api/update-streak:', err);
        res.status(500).json({ error: 'Lỗi cập nhật streak' });
    }
});

// Khởi động server
app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
    // KHÔNG tự động gọi updateStreak ở đây
});