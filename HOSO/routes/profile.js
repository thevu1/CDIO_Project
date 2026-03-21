const express = require('express');
const db = require('../db');
const router = express.Router();

// Middleware kiểm tra đăng nhập
const requireLogin = (req, res, next) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Cần đăng nhập' });
    next();
};

// Lấy thông tin hồ sơ của một user (theo id)
router.get('/:id', async (req, res) => {
    const profileId = req.params.id;
    const currentUserId = req.session.userId || null;

    try {
        // Lấy thông tin cơ bản
        const [users] = await db.execute(
            `SELECT id, name, avatar, nickname, birthdate, join_date, city, phone_number,
                    privacy_settings, xp, level, streak
             FROM users WHERE id = ?`,
            [profileId]
        );
        if (users.length === 0) return res.status(404).json({ error: 'Không tìm thấy user' });
        const user = users[0];

        // Tính số bạn bè
        const [friends] = await db.execute(
            `SELECT COUNT(*) as count FROM friendships 
             WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted'`,
            [profileId, profileId]
        );
        const friendsCount = friends[0].count;

        // Tính số nhiệm vụ hoàn thành
        const [tasks] = await db.execute(
            'SELECT COUNT(*) as count FROM user_tasks WHERE user_id = ?',
            [profileId]
        );
        const tasksCompleted = tasks[0].count;

        // Xác định quan hệ giữa current user và profile user
        let relationship = 'public';
        if (currentUserId) {
            if (currentUserId == profileId) relationship = 'owner';
            else {
                const [rel] = await db.execute(
                    `SELECT * FROM friendships WHERE 
                     (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`,
                    [currentUserId, profileId, profileId, currentUserId]
                );
                if (rel.length > 0 && rel[0].status === 'accepted') relationship = 'friend';
            }
        }

        // Áp dụng quyền riêng tư
        const privacy = user.privacy_settings 
    ? JSON.parse(user.privacy_settings) 
    : {};
        const filteredProfile = {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
            xp: user.xp,
            level: user.level,
            streak: user.streak,
            // Các trường động
            nickname: canView('nickname', privacy, relationship) ? user.nickname : null,
            birthdate: canView('birthdate', privacy, relationship) ? user.birthdate : null,
            join_date: canView('join_date', privacy, relationship) ? user.join_date : null,
            city: canView('city', privacy, relationship) ? user.city : null,
            phone_number: canView('phone_number', privacy, relationship) ? user.phone_number : null,
            friends_count: canView('friends_count', privacy, relationship) ? friendsCount : null,
            tasks_completed: canView('tasks_completed', privacy, relationship) ? tasksCompleted : null,
            // Trả về privacy settings để hiển thị nếu là chủ sở hữu
            privacy_settings: relationship === 'owner' ? privacy : null
        };

        res.json(filteredProfile);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Cập nhật hồ sơ của chính mình
router.put('/me', requireLogin, async (req, res) => {
    const userId = req.session.userId;
    const { nickname, birthdate, city, phone_number, privacy_settings } = req.body;

    try {
        await db.execute(
            `UPDATE users 
             SET nickname = ?, birthdate = ?, city = ?, phone_number = ?, privacy_settings = ?
             WHERE id = ?`,
            [nickname, birthdate, city, phone_number, JSON.stringify(privacy_settings), userId]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Helper kiểm tra quyền xem
function canView(field, privacy, relationship) {
    const level = privacy[field] || 'public';
    if (level === 'public') return true;
    if (level === 'friends' && (relationship === 'friend' || relationship === 'owner')) return true;
    if (level === 'private' && relationship === 'owner') return true;
    return false;
}

module.exports = router;    