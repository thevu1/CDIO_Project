// home.js
const express = require("express");
const db      = require("../database/db");
const path    = require("path");
const app     = express.Router();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// ========== CẤU HÌNH PASSPORT GOOGLE FIT ==========
passport.use('google-fit', new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/auth/google-fit/callback",
    scope: [
        'profile',
        'https://www.googleapis.com/auth/fitness.activity.read'
    ]
  },
  async (accessToken, refreshToken, profile, done) => {
   
    return done(null, profile);
  }
));


/* =========================================================
   MODULE: MIDDLEWARE – KIỂM TRA ĐĂNG NHẬP
========================================================= */
function checkLogin(req, res, next) {
    const isAPI =
        req.path.startsWith("/api")             ||
        req.path.includes("profile-data")       ||
        req.path.includes("update-privacy")     ||
        req.path.includes("leaderboardList")    ||
        req.path.includes("tasks");

    if (!req.session.user) {
        return isAPI
            ? res.status(401).json({ error: "Not logged in" })
            : res.redirect("/login");
    }

    if (!req.session.user.profile_completed && req.path !== "/setup-profile") {
        return isAPI
            ? res.status(403).json({ error: "Profile not completed" })
            : res.redirect("/setup-profile");
    }

    next();
}

app.use(checkLogin);


/* =========================================================
   MODULE: PAGE ROUTES – TRẢ FILE HTML
========================================================= */
app.get("/index",   (req, res) => res.sendFile(path.join(__dirname, "../views/pages/index.html")));
app.get("/walk",    (req, res) => res.sendFile(path.join(__dirname, "../views/pages/walk.html")));
app.get("/focus",   (req, res) => res.sendFile(path.join(__dirname, "../views/pages/focus.html")));
app.get("/profile", (req, res) => res.sendFile(path.join(__dirname, "../views/pages/profile.html")));
app.get("/group",   (req, res) => res.sendFile(path.join(__dirname, "../views/pages/friend.html")));


/* =========================================================
   MODULE: LOGOUT
========================================================= */
app.get("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/login"));
});


/* =========================================================
   MODULE: API ME
========================================================= */
app.get("/api/me", (req, res) => {
    const userId = req.session.user?.id;
    db.query(
        `SELECT 
            u.id,
            u.name,
            u.name AS nickname,          -- alias
            a.email,
            u.phone_number AS phone,
            u.streak,
            u.total_streak,
            u.xp,
            u.level,
            u.xp_to_next,
            (SELECT COUNT(*) + 1 FROM users WHERE xp > u.xp) AS rank
         FROM users u
         JOIN accounts a ON a.id = u.account_id
         WHERE u.id = ?`,
        [userId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!rows.length) return res.status(404).json({ error: "User not found" });
            res.json(rows[0]);
        }
    );
});


/* =========================================================
   👤 MODULE: PROFILE DATA – DỮ LIỆU ĐẦY ĐỦ CỦA USER
   - Dùng bởi: app.js, profile.js → fetch("/profile-data")
   - JOIN cities → trả city_name
   - Đếm friends và tasks từ sub-query
   - Bảng: users, cities, friends, tasks
   ─ Thêm trường mới: thêm vào SELECT bên dưới
========================================================= */
app.get("/profile-data", (req, res) => {
    const userId = req.session.user?.id;
    if (!userId) return res.status(401).json({ error: "Not logged in" });

    db.query(
        `SELECT
            u.id,
            u.name,
            u.name AS nickname,
            a.email,
            u.avatar,
            u.xp,
            u.level,
            u.xp_to_next,
            u.streak,
            u.total_streak,
            u.last_completed,
            u.birthdate,
            u.phone_number,
            u.privacy_settings,
            u.created_at,
            c.name AS city_name,
            (SELECT COUNT(*) FROM friends WHERE user_id = u.id) AS friends,
            (SELECT COUNT(*) FROM tasks WHERE user_id = u.id) AS tasks
         FROM users u
         JOIN accounts a ON a.id = u.account_id
         LEFT JOIN cities c ON c.id = u.city_id
         WHERE u.id = ?`,
        [userId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!rows.length) return res.status(404).json({ error: "User not found" });

            const user = rows[0];

            // Parse privacy_settings
            try {
                user.privacy_settings = user.privacy_settings
                    ? JSON.parse(user.privacy_settings)
                    : {};
            } catch {
                user.privacy_settings = {};
            }

            res.json(user);
        }
    );
});



/* =========================================================
   MODULE: PRIVACY SETTINGS – CẬP NHẬT CÀI ĐẶT RIÊNG TƯ
========================================================= */
app.post("/update-privacy", (req, res) => {
    const userId = req.session.user?.id;
    const { field, value } = req.body;

    // Mở rộng danh sách cho phép tất cả trường có badge
    const allowedFields = [
        'email', 'phone_number', 'birthdate',
        'name', 'nickname', 'created_at',
        'friends_count', 'tasks_count', 'city_name'
    ];
    if (!allowedFields.includes(field)) {
        return res.status(400).json({ error: "Trường không hợp lệ" });
    }

    const allowedValues = ['public', 'friends', 'private'];
    if (!allowedValues.includes(value)) {
        return res.status(400).json({ error: "Giá trị không hợp lệ" });
    }

    db.query(
        "SELECT privacy_settings FROM users WHERE id = ?",
        [userId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            let settings = {};
            try {
                settings = rows[0]?.privacy_settings ? JSON.parse(rows[0].privacy_settings) : {};
            } catch { settings = {}; }

            settings[field] = value;

            db.query(
                "UPDATE users SET privacy_settings = ? WHERE id = ?",
                [JSON.stringify(settings), userId],
                (err2) => {
                    if (err2) return res.status(500).json({ error: err2.message });
                    res.json({ success: true });
                }
            );
        }
    );
});


/* =========================================================
   🏆 MODULE: LEADERBOARD – BẢNG XẾP HẠNG
========================================================= */
app.get("/leaderboardList", (req, res) => {
    const userId = req.session.user?.id;

    db.query(
        `SELECT
            id,
            name,
            name AS nickname,              -- alias
            xp,
            level,
            avatar,
            streak,
            CASE WHEN id = ? THEN 1 ELSE 0 END   AS is_me,
            RANK() OVER (ORDER BY xp DESC)        AS user_rank
         FROM users
         ORDER BY xp DESC
         LIMIT 10`,
        [userId],
        (err, results) => {
            if (err) {
                console.error("[leaderboardList]", err);
                return res.status(500).json({ error: err.message });
            }
            res.json(results);
        }
    );
});


/* =========================================================
   📅 MODULE: TASKS – NHIỆM VỤ NGÀY HÔM NAY
========================================================= */
app.get("/tasks", (req, res) => {
    const userId = req.session.user?.id;
    const today  = new Date().toISOString().slice(0, 10);

    // Đảm bảo có bản ghi hôm nay
    db.query(
        "INSERT IGNORE INTO tasks (user_id, task_date) VALUES (?, ?)",
        [userId, today],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });

            db.query(
                "SELECT * FROM tasks WHERE user_id = ? AND task_date = ?",
                [userId, today],
                (err2, rows) => {
                    if (err2) return res.status(500).json({ error: err2.message });
                    res.json(rows);
                }
            );
        }
    );
});


/* =========================================================
   MODULE: COMPLETE TASK – ĐÁNH DẤU HOÀN THÀNH TASK (Chưa nhận xp)
========================================================= */
app.post("/complete-task", (req, res) => {

    const userId = req.session.user?.id;
    const { type } = req.body;

    if (!userId) {
        return res.status(401).json({ error: "Chưa đăng nhập" });
    }

    const today = new Date().toISOString().slice(0, 10);

    // Map tên task từ frontend -> cột database
    const TASK_MAP = {
        walk_completed: "walk_completed",
        focus_completed: "focus_completed",
        meditate_10min: "meditate_10min",
        exercise_20min: "exercise_20min",
        reading_10min: "reading_10min"
    };

    const column = TASK_MAP[type];

    if (!column) {
        console.log("❌ TASK KHÔNG HỢP LỆ:", type);
        return res.status(400).json({ error: "Task type không hợp lệ" });
    }

    db.query(
        `UPDATE tasks 
         SET \`${column}\` = 1 
         WHERE user_id = ? AND task_date = ?`,
        [userId, today],
        (err) => {

            if (err) {
                console.error("DB ERROR:", err);
                return res.status(500).json({ error: err.message });
            }

            console.log("✅ TASK COMPLETED:", column);

            res.json({
                success: true,
                task: column
            });
        }
    );

});


/* =========================================================
   🎁 MODULE: CLAIM XP – NHẬN XP SAU KHI HOÀN THÀNH TASK
========================================================= */
app.post("/api/tasks/claim-xp", (req, res) => {
    const userId = req.session.user?.id;
    const { task_name } = req.body;
    const XP_GAIN = 30;

    const ALLOWED_TASKS = ["walk_completed", "focus_completed", "meditate_10min", "exercise_20min", "reading_10min"];
    if (!ALLOWED_TASKS.includes(task_name)) {
        return res.status(400).json({ error: "Task không hợp lệ" });
    }

    const claimedField = task_name + "_xp_claimed";

    db.query(
        `SELECT \`${task_name}\`, \`${claimedField}\`, users.xp, users.level 
         FROM tasks 
         JOIN users ON users.id = tasks.user_id 
         WHERE tasks.user_id = ? AND task_date = ?`,
        [userId, new Date().toISOString().slice(0, 10)],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!rows.length) return res.status(404).json({ error: "Không tìm thấy task" });

            const row = rows[0];
            if (!row[task_name]) return res.json({ error: "Task chưa hoàn thành" });
            if (row[claimedField]) return res.json({ error: "Đã nhận XP rồi" });

            // ==================== LOGIC XP TỔNG TÍCH LŨY ====================
            let totalXp = row.xp || 0;
            let currentLevel = row.level || 1;
            let leveledUp = false;
            let newLevel = currentLevel;
            let xpToNext = (newLevel + 1) * 100;

            totalXp += XP_GAIN;

            // Tính toán cấp mới dựa trên tổng XP
            let xpFloor = 0;
            while (totalXp >= xpFloor + xpToNext) {
                xpFloor += xpToNext;
                newLevel++;
                xpToNext = (newLevel + 1) * 100;
                leveledUp = true;
            }
            // XP còn lại trong cấp hiện tại
            const xpInLevel = totalXp - xpFloor;

            db.query(
                `UPDATE tasks SET \`${claimedField}\` = 1 WHERE user_id = ? AND task_date = ?`,
                [userId, new Date().toISOString().slice(0, 10)],
                (err2) => {
                    if (err2) return res.status(500).json({ error: err2.message });

                    db.query(
                        "UPDATE users SET xp = ?, level = ?, xp_to_next = ? WHERE id = ?",
                        [totalXp, newLevel, xpToNext, userId],
                        (err3) => {
                            if (err3) return res.status(500).json({ error: err3.message });

                            res.json({
                                success: true,
                                xp_gain: XP_GAIN,
                                leveledUp,
                                level: newLevel,
                                xp: xpInLevel,
                                xp_to_next: xpToNext,
                                total_xp: totalXp
                            });
                        }
                    );
                }
            );
        }
    );
});

/* =========================================================
   🔥 MODULE: STREAK HISTORY – LỊCH SỬ 7 NGÀY ĐỐT LỬNG
   - Dùng bởi: app.js → lightTodayFire() → fetch("/api/streak-history")
   - Trả các ngày is_streak_day = 1 trong vòng 7 ngày gần nhất
   - Frontend map ngày → chỉ số pill để tô màu
   - Bảng: streak_history
========================================================= */
app.get("/api/streak-history", (req, res) => {
    const userId = req.session.user?.id;

    db.query(
        `SELECT streak_date, is_streak_day
         FROM streak_history
         WHERE user_id = ?
           AND streak_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
         ORDER BY streak_date ASC`,
        [userId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});


/* =========================================================
   MODULE: CHECK ALL TASKS – KIỂM TRA & CẬP NHẬT STREAK
========================================================= */
function checkAllTasks(userId, today, res) {

    db.query(
        "SELECT * FROM tasks WHERE user_id=? AND task_date=?",
        [userId, today],
        (err, rows) => {

            if (err) return res.status(500).json(err);
            if (!rows.length) return res.json({ ok: true });

            const t = rows[0];

            const completedTasks = [
                t.walk_completed,
                t.focus_completed,
                t.meditate_10min,
                t.exercise_20min,
                t.reading_10min
            ].filter(Boolean).length;

            if (completedTasks < 4)
                return res.json({ ok: true });

            updateStreak(userId, today, res);
        }
    );
}
function updateStreak(userId, today, res) {

    db.query(
        "SELECT streak,total_streak,last_completed FROM users WHERE id=?",
        [userId],
        (err, rows) => {

            const user = rows[0];

            const last = user.last_completed
                ? user.last_completed.toISOString().slice(0, 10)
                : null;

            if (last === today)
                return res.json({ ok: true });

            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const y = yesterday.toISOString().slice(0, 10);

            const streak =
                last === y ? user.streak + 1 : 1;

            const total =
                Math.max(user.total_streak || 0, streak);

            db.query(
                `UPDATE users
                 SET streak=?,total_streak=?,last_completed=?
                 WHERE id=?`,
                [streak, total, today, userId],
                () => res.json({ ok: true })
            );

        }
    );
}

/* =========================================================
   MODULE: XP SYSTEM – CỘNG XP THỦ CÔNG
========================================================= */
app.post("/api/add-xp", (req, res) => {
    const userId = req.session.user?.id;
    const { xp } = req.body;

    db.query(
        "UPDATE users SET xp = xp + ? WHERE id = ?",
        [xp, userId],
        (err) => {
            if (err) return res.status(500).json(err);
            res.json({ success: true });
        }
    );
});


/* =========================================================
   MODULE: CHECK LEVEL (đồng bộ với claim-xp formula)
========================================================= */
app.post("/check-level", (req, res) => {
    const userId = req.session.user?.id;

    db.query("SELECT xp, level FROM users WHERE id = ?", [userId], (err, rows) => {
        if (err) return res.status(500).json(err);

        let { xp, level } = rows[0];
        let xpToNext = (level + 1) * 100;
        let leveledUp = false;

        while (xp >= xpToNext) {
            xp -= xpToNext;
            level += 1;
            xpToNext = (level + 1) * 100;
            leveledUp = true;
        }

        db.query(
            "UPDATE users SET xp = ?, level = ?, xp_to_next = ? WHERE id = ?",
            [xp, level, xpToNext, userId],
            (err2) => {
                if (err2) return res.status(500).json(err2);
                res.json({
                    level,
                    xp,
                    xp_to_next: xpToNext,
                    progress_percent: Math.floor((xp / xpToNext) * 100),
                    leveledUp
                });
            }
        );
    });
});

/* =========================================================
   👥 MODULE: FRIENDS – QUẢN LÝ BẠN BÈ
========================================================= */

// Danh sách bạn bè của user đang đăng nhập
app.get("/api/friends", (req, res) => {
    const userId = req.session.user?.id;

    db.query(
        `SELECT
            u.id,
            u.name,
            u.phone_number AS phone,
            u.streak,
            u.avatar,
            u.level,
            u.xp
         FROM friends f
         JOIN users u ON u.id = f.friend_id
         WHERE f.user_id = ?
         ORDER BY u.streak DESC`,
        [userId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// Thêm bạn (cả A→B và B→A)
app.post("/api/friends/add", (req, res) => {
    const userId = req.session.user?.id;
    const { friendId } = req.body;

    if (String(friendId) === String(userId)) {
        return res.status(400).json({ error: "Không thể tự kết bạn với mình" });
    }

    // Kiểm tra friend có tồn tại và đã xác minh
    db.query(
        `SELECT u.id 
         FROM users u 
         JOIN accounts a ON a.id = u.account_id 
         WHERE u.id = ? AND a.is_verified = 1`,
        [friendId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!rows.length) return res.status(404).json({ error: "Người dùng không tồn tại hoặc chưa xác minh" });

            // Thêm bạn 2 chiều
            db.query(
                `INSERT IGNORE INTO friends (user_id, friend_id) VALUES (?, ?), (?, ?)`,
                [userId, friendId, friendId, userId],
                (err2) => {
                    if (err2) return res.status(500).json({ error: err2.message });
                    res.json({ success: true });
                }
            );
        }
    );
});

// Xoá bạn (cả A→B và B→A)
app.post("/api/friends/remove", (req, res) => {
    const userId       = req.session.user?.id;
    const { friendId } = req.body;

    db.query(
        `DELETE FROM friends
         WHERE (user_id = ? AND friend_id = ?)
            OR (user_id = ? AND friend_id = ?)`,
        [userId, friendId, friendId, userId],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});


/* =========================================================
   🔍 MODULE: SEARCH USERS – TÌM KIẾM NGƯỜI DÙNG
   - Dùng bởi: friends.js → searchBtn → fetch("/api/users/search?keyword=")
   - LIKE trên name và phone_number
   - Chỉ trả user đã verify, loại trừ bản thân
   - Bảng: users
========================================================= */
app.get("/api/users/search", (req, res) => {
    const userId = req.session.user?.id;
    let { keyword } = req.query;

    if (!keyword || !keyword.trim()) return res.json([]);

    const normalized = keyword.replace(/\D/g, '');
    const likeName  = `%${keyword.trim()}%`;
    const likePhone = `%${normalized}%`;

    db.query(
        `SELECT 
            u.id,
            u.name,
            u.phone_number AS phone,
            u.streak
         FROM users u
         JOIN accounts a ON a.id = u.account_id
         WHERE (u.name LIKE ? OR REPLACE(REPLACE(u.phone_number, ' ', ''), '.', '') LIKE ?)
           AND u.id != ?
           AND a.is_verified = 1
         LIMIT 20`,
        [likeName, likePhone, userId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});


/* =========================================================
   MODULE: FOCUS SESSIONS – LƯU & XEM LỊCH SỬ TẬP TRUNG

========================================================= */

// Lưu phiên focus
app.post("/api/focus/save", (req, res) => {
    const userId = req.session.user?.id;
    const {
        focus_mode             = "unknown",
        focus_duration_seconds = 0,
        time_remaining_seconds = 0,
        status                 = "unfinished"
    } = req.body;

    db.query(
        `INSERT INTO focus_sessions
            (user_id, focus_mode, focus_duration_seconds, time_remaining_seconds, status)
         VALUES (?, ?, ?, ?, ?)`,
        [userId, focus_mode, focus_duration_seconds, time_remaining_seconds, status],
        (err) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true });
        }
    );
});

// Lấy lịch sử focus
app.get("/api/focus/history", (req, res) => {
    const userId = req.session.user?.id;

    db.query(
        `SELECT
            id,
            focus_mode,
            focus_duration_seconds,
            duration_formatted,
            status,
            created_at
         FROM focus_sessions
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 50`,
        [userId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});


/* =========================================================
   MODULE: WALK – NHẬN DỮ LIỆU BƯỚC CHÂN (GG FIT)
========================================================= */
app.post("/api/steps", (req, res) => {
    const userId = req.session.user?.id;
    const { steps } = req.body;

    if (!userId) {
        return res.status(401).json({ error: "Not logged in" });
    }

    console.log(`User ${userId} steps:`, steps);

    // 👉 OPTION 1: chỉ log (giống server cũ)
    return res.json({ success: true });

    // 👉 OPTION 2 (khuyến nghị): lưu DB
    /*
    db.query(
        "UPDATE tasks SET steps = ? WHERE user_id = ? AND task_date = CURDATE()",
        [steps, userId],
        (err) => {
            if (err) return res.status(500).json(err);
            res.json({ success: true });
        }
    );
    */
});
app.post("/api/walk/save", (req, res) => {
    const userId = req.session.user?.id;
    if (!userId) return res.status(401).json({ error: "Not logged in" });
    let { steps, distance_km, duration_seconds } = req.body;
    steps = parseInt(steps) || 0;
    if (steps <= 0) return res.status(400).json({ error: "Số bước không hợp lệ" });
    db.query(`INSERT INTO walk_sessions (user_id, steps, distance_km, duration_seconds) VALUES (?, ?, ?, ?)`, [userId, steps, distance_km || null, duration_seconds || null], (err) => {
        if (err) { console.error("[Walk] Lỗi lưu phiên:", err); return res.status(500).json({ error: "Không thể lưu phiên đi bộ" }); }
        const today = new Date().toISOString().slice(0, 10);
        db.query(`SELECT SUM(steps) AS total_steps FROM walk_sessions WHERE user_id = ? AND DATE(created_at) = ?`, [userId, today], (err2, rows) => {
            if (err2) { console.error("[Walk] Lỗi tổng steps:", err2); return res.status(500).json({ error: "Lỗi thống kê bước" }); }
            const totalSteps = rows[0]?.total_steps || 0;
            const GOAL_STEPS = 5000;
            if (totalSteps >= GOAL_STEPS) {
                completeWalkTask(userId, today, res, { steps, totalSteps });
            } else {
                res.json({ success: true, steps, totalSteps, goal_reached: false });
            }
        });
    });
});

function completeWalkTask(userId, today, res, walkInfo) {
    db.query(`SELECT id, walk_completed, walk_xp_claimed FROM tasks WHERE user_id = ? AND task_date = ?`, [userId, today], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!rows.length) {
            db.query(`INSERT IGNORE INTO tasks (user_id, task_date) VALUES (?, ?)`, [userId, today], (err2) => {
                if (err2) return res.status(500).json({ error: err2.message });
                completeWalkTask(userId, today, res, walkInfo);
            });
            return;
        }
        const task = rows[0];
        if (task.walk_completed) {
            return res.json({ success: true, steps: walkInfo.steps, totalSteps: walkInfo.totalSteps, goal_reached: true, already_completed: true });
        }
        db.query(`UPDATE tasks SET walk_completed = 1 WHERE id = ? AND user_id = ?`, [task.id, userId], (err3) => {
            if (err3) return res.status(500).json({ error: err3.message });
            db.query(`UPDATE users SET xp = xp + 20 WHERE id = ?`, [userId], (err4) => {
                if (err4) return res.status(500).json({ error: err4.message });
                checkAllTasks(userId, today, null);
                res.json({ success: true, steps: walkInfo.steps, totalSteps: walkInfo.totalSteps, goal_reached: true, xp_gained: 20 });
            });
        });
    });
}
app.get("/api/walk/today", (req, res) => {
    const userId = req.session.user?.id;
    if (!userId) return res.status(401).json({ error: "Not logged in" });
    const today = new Date().toISOString().slice(0, 10);
    db.query(`SELECT SUM(steps) AS total_steps FROM walk_sessions WHERE user_id = ? AND DATE(created_at) = ?`, [userId, today], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const totalSteps = rows[0]?.total_steps || 0;
        const distanceKm = (totalSteps / 1300).toFixed(1);
        res.json({ totalSteps, distanceKm, goal: 5000 });
    });
});
app.get("/api/walk/weekly", (req, res) => {
    const userId = req.session.user?.id;
    if (!userId) return res.status(401).json({ error: "Not logged in" });
    db.query(`SELECT DATE(created_at) as date, SUM(steps) as total_steps FROM walk_sessions WHERE user_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(created_at) ORDER BY date ASC`, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const stepMap = {};
        rows.forEach(row => { stepMap[row.date] = row.total_steps; });
        const weeklySteps = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().slice(0, 10);
            weeklySteps.push(stepMap[dateStr] || 0);
        }
        const weeklyKm = weeklySteps.map(s => (s / 1300).toFixed(1));
        res.json({ weeklySteps, weeklyKm });
    });
});

/* =========================================================
   MODULE: GOOGLE FIT OAUTH & TRẠNG THÁI KẾT NỐI
========================================================= */
// Kiểm tra trạng thái kết nối Google Fit
app.get("/api/google-fit/status", (req, res) => {
    const userId = req.session.user?.id;
    if (!userId) return res.status(401).json({ error: "Not logged in" });
    db.query("SELECT google_fit_connected FROM users WHERE id = ?", [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ connected: rows[0]?.google_fit_connected === 1 });
    });
});

// Route bắt đầu OAuth Google Fit (tự động gợi ý email đã đăng nhập)
app.get("/auth/google-fit", (req, res, next) => {
    const email = req.session.user?.email;
    if (!email) return res.redirect("/login");
    const authenticator = passport.authenticate('google-fit', {
        accessType: 'offline',
        prompt: 'consent',
        loginHint: email
    });
    authenticator(req, res, next);
});

// Callback sau khi Google cho phép
app.get("/auth/google-fit/callback", passport.authenticate('google-fit', { failureRedirect: '/group' }), (req, res) => {
    
    const token = req.user?.token || req.user?.accessToken; 
    res.redirect('/group?fit_connected=true');
});

// API lưu token Google Fit từ frontend (sau khi người dùng cấp quyền qua popup)
app.post("/api/google-fit/save-token", (req, res) => {
    const userId = req.session.user?.id;
    const { access_token, refresh_token } = req.body;
    if (!userId) return res.status(401).json({ error: "Not logged in" });
    if (!access_token) return res.status(400).json({ error: "Missing token" });
    db.query("UPDATE users SET google_fit_connected = 1, google_fit_token = ?, google_fit_refresh_token = ? WHERE id = ?", [access_token, refresh_token || null, userId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});


/* =========================================================
   👁️ MODULE: VIEW PROFILE WITH PRIVACY
========================================================= */
app.get("/api/profile/:id", (req, res) => {
    const viewerId = req.session.user?.id;
    const targetId = req.params.id;

    db.query(
        `SELECT 
            u.*,
            a.email,
            (SELECT COUNT(*) FROM friends WHERE user_id = ? AND friend_id = u.id) AS is_friend
         FROM users u
         JOIN accounts a ON a.id = u.account_id
         WHERE u.id = ?`,
        [viewerId, targetId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!rows.length) return res.status(404).json({ error: "User not found" });

            const user = rows[0];
            let privacy = {};
            try {
                privacy = user.privacy_settings ? JSON.parse(user.privacy_settings) : {};
            } catch { privacy = {}; }

            const isOwner  = viewerId == targetId;
            const isFriend = user.is_friend > 0;

            function canView(field) {
                if (isOwner) return true;
                const rule = privacy[field] || 'public';
                if (rule === 'public') return true;
                if (rule === 'friends' && isFriend) return true;
                return false;
            }

            const result = {
                id: user.id,
                name: user.name,
                nickname: user.nickname,
                avatar: user.avatar,
                level: user.level,
                streak: user.streak,
                total_streak: user.total_streak,
                xp: user.xp,
                created_at: user.created_at,
                city_name: user.city_name
            };

            if (canView('email'))        result.email = user.email;
            if (canView('phone_number')) result.phone_number = user.phone_number;
            if (canView('birthdate'))    result.birthdate = user.birthdate;

            res.json(result);
        }
    );
});
/* =========================================================
   📊 MODULE: DASHBOARD FRIEND – THÔNG TIN TỔNG HỢP
   - Dùng cho friend.html
========================================================= */
// 📊 DASHBOARD FRIEND – THÔNG TIN TỔNG HỢP (đã sửa lỗi 500)
app.get("/api/friends/dashboard", (req, res) => {
    const userId = req.session.user?.id;
    if (!userId) {
        return res.status(401).json({ error: "Not logged in" });
    }

    // Lấy thông tin user (bỏ subquery rank)
    db.query(
        `SELECT id, name, level, xp, xp_to_next, streak, total_streak
         FROM users
         WHERE id = ?`,
        [userId],
        (err, userRows) => {
            if (err) {
                console.error("[Dashboard] Lỗi query user:", err);
                return res.status(500).json({ error: "Lỗi truy vấn user" });
            }
            if (!userRows.length) {
                return res.status(404).json({ error: "Không tìm thấy user" });
            }

            const user = userRows[0];

            // Tính rank riêng (tránh subquery phức tạp)
            db.query(
                `SELECT COUNT(*) + 1 AS rank FROM users WHERE xp > ?`,
                [user.xp],
                (rankErr, rankRows) => {
                    if (rankErr) {
                        console.error("[Dashboard] Lỗi tính rank:", rankErr);
                        user.rank = 1; // fallback
                    } else {
                        user.rank = rankRows[0]?.rank || 1;
                    }

                    // Lấy danh sách bạn bè
                    db.query(
                        `SELECT u.id, u.name, u.streak, u.level, u.xp
                         FROM friends f
                         JOIN users u ON u.id = f.friend_id
                         WHERE f.user_id = ?
                         ORDER BY u.streak DESC`,
                        [userId],
                        (err2, friends) => {
                            if (err2) {
                                console.error("[Dashboard] Lỗi query friends:", err2);
                                return res.status(500).json({ error: "Lỗi truy vấn bạn bè" });
                            }

                            // Tính thống kê an toàn
                            const totalStreak = friends.reduce((sum, f) => sum + (f.streak || 0), 0);
                            const avgStreak = friends.length ? (totalStreak / friends.length).toFixed(1) : 0;
                            const maxStreak = friends.length ? Math.max(...friends.map(f => f.streak || 0)) : 0;

                            res.json({
                                user,
                                friends,
                                stats: {
                                    total: totalStreak,
                                    avg: avgStreak,
                                    max: maxStreak,
                                    count: friends.length
                                }
                            });
                        }
                    );
                }
            );
        }
    );
});
// xếp hạng bạn bè theo xp
app.get("/api/friends/leaderboard", (req, res) => {
    const userId = req.session.user?.id;
    if (!userId) return res.status(401).json({ error: "Not logged in" });

    db.query(
        `SELECT 
            u.id,
            u.name,
            u.level,
            u.xp,
            u.streak,
            u.avatar,
            RANK() OVER (ORDER BY u.xp DESC) AS rank
         FROM friends f
         JOIN users u ON u.id = f.friend_id
         WHERE f.user_id = ?
         ORDER BY u.xp DESC
         LIMIT 20`,
        [userId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});


module.exports = app;