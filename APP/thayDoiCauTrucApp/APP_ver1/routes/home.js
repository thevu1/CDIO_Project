// home.js
const express = require("express");
const db      = require("../database/db");
const path    = require("path");
const app     = express.Router();


/* =========================================================
   🔐 MODULE: MIDDLEWARE – KIỂM TRA ĐĂNG NHẬP
   - Chặn mọi route nếu chưa login
   - Nếu chưa hoàn thiện profile → redirect /setup-profile
   - API trả JSON 401/403, page trả redirect
   ─ Thêm module mới: chỉ cần đặt route SAU app.use(checkLogin)
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
   📄 MODULE: PAGE ROUTES – TRẢ FILE HTML
   ─ Thêm trang mới: app.get("/ten-trang", ...) ở đây
========================================================= */
app.get("/index",   (req, res) => res.sendFile(path.join(__dirname, "../views/pages/index.html")));
app.get("/walk",    (req, res) => res.sendFile(path.join(__dirname, "../views/pages/walk.html")));
app.get("/focus",   (req, res) => res.sendFile(path.join(__dirname, "../views/pages/focus.html")));
app.get("/profile", (req, res) => res.sendFile(path.join(__dirname, "../views/pages/profile.html")));
app.get("/group",   (req, res) => res.sendFile(path.join(__dirname, "../views/pages/friend.html")));


/* =========================================================
   🚪 MODULE: LOGOUT
========================================================= */
app.get("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/login"));
});


/* =========================================================
   👤 MODULE: API ME – THÔNG TIN USER HIỆN TẠI
   - Dùng bởi: friends.js → fetchMyInfo()
   - Trả: id, name, nickname, email, phone, streak, total_streak
   - Bảng: users
========================================================= */
app.get("/api/me", (req, res) => {
    const userId = req.session.user?.id;

    db.query(
        `SELECT
            id,
            name,
            nickname,
            email,
            phone_number   AS phone,
            streak,
            total_streak
         FROM users
         WHERE id = ?`,
        [userId],
        (err, rows) => {
            if (err)          return res.status(500).json({ error: err.message });
            if (!rows.length)  return res.status(404).json({ error: "User not found" });
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
            u.nickname,
            u.email,
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
            c.name                                                AS city_name,
            (SELECT COUNT(*) FROM friends WHERE user_id = u.id)  AS friends,
            (SELECT COUNT(*) FROM tasks   WHERE user_id = u.id)  AS tasks
         FROM users u
         LEFT JOIN cities c ON c.id = u.city_id
         WHERE u.id = ?`,
        [userId],
        (err, rows) => {
            if (err)          return res.status(500).json(err);
            if (!rows.length)  return res.json({});

            const user = rows[0];

            // Parse privacy_settings JSON an toàn
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
   ✏️ MODULE: NICKNAME – LƯU NICKNAME NGƯỜI DÙNG
   - Dùng bởi: app.js → saveNickname(), skipNickname()
   - Validate: 2–20 ký tự
   - Bảng: users (cột nickname)
========================================================= */
app.post("/api/nickname", (req, res) => {
    const userId  = req.session.user?.id;
    const trimmed = (req.body.nickname || "").trim();

    if (trimmed.length < 2 || trimmed.length > 20) {
        return res.status(400).json({ error: "Nickname phải từ 2–20 ký tự" });
    }

    db.query(
        "UPDATE users SET nickname = ? WHERE id = ?",
        [trimmed, userId],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, nickname: trimmed });
        }
    );
});


/* =========================================================
   🔒 MODULE: PRIVACY SETTINGS – CẬP NHẬT CÀI ĐẶT RIÊNG TƯ
   - Dùng bởi: profile.js → fetch("/update-privacy")
   - Lưu dạng JSON merge vào cột privacy_settings
   - Bảng: users (cột privacy_settings)
========================================================= */
app.post("/update-privacy", (req, res) => {
    const userId        = req.session.user?.id;
    const { field, value } = req.body;
    if (!userId) return res.status(401).json({ error: "Not logged in" });

    db.query(
        "SELECT privacy_settings FROM users WHERE id = ?",
        [userId],
        (err, rows) => {
            let settings = {};
            try {
                settings = rows[0]?.privacy_settings
                    ? JSON.parse(rows[0].privacy_settings)
                    : {};
            } catch { settings = {}; }

            settings[field] = value;

            db.query(
                "UPDATE users SET privacy_settings = ? WHERE id = ?",
                [JSON.stringify(settings), userId],
                () => res.json({ success: true })
            );
        }
    );
});


/* =========================================================
   🏆 MODULE: LEADERBOARD – BẢNG XẾP HẠNG
   - Dùng bởi: app.js → loadLeaderboard(), profile.js
   - is_me: tính động theo session (không hardcode DB)
   - user_rank: dùng RANK() OVER — tránh alias "rank" (reserved word MySQL 8)
   - Bảng: users
   ─ Muốn top 20: đổi LIMIT 10 → LIMIT 20
========================================================= */
app.get("/leaderboardList", (req, res) => {
    const userId = req.session.user?.id;

    db.query(
        `SELECT
            id,
            name,
            nickname,
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
   - Dùng bởi: app.js → loadTasks() → fetch("/tasks")
   - INSERT IGNORE: tự tạo bản ghi nếu chưa có (1 bản/ngày/user)
   - Trả mảng 1 phần tử → frontend dùng data[0]
   - Bảng: tasks (UNIQUE KEY: user_id + task_date)
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
   ✅ MODULE: COMPLETE TASK – ĐÁNH DẤU HOÀN THÀNH TASK
   - Dùng bởi: frontend → POST /complete-task
   - Whitelist "type" để chặn SQL injection
   - Sau update → cộng XP → gọi checkAllTasks
   - Bảng: tasks, users
========================================================= */
app.post("/complete-task", (req, res) => {
    const userId  = req.session.user?.id;
    const { id, type } = req.body;
    const XP_GAIN = 20;
    const today   = new Date().toISOString().slice(0, 10);

    const ALLOWED = ["walk_completed", "sleep_completed", "screen_completed", "focus_completed"];
    if (!ALLOWED.includes(type)) {
        return res.status(400).json({ error: "Task type không hợp lệ" });
    }

    db.query(
        `UPDATE tasks SET \`${type}\` = 1 WHERE id = ? AND user_id = ?`,
        [id, userId],
        (err) => {
            if (err) return res.status(500).json(err);

            db.query(
                "UPDATE users SET xp = xp + ? WHERE id = ?",
                [XP_GAIN, userId],
                (err2) => {
                    if (err2) return res.status(500).json(err2);
                    checkAllTasks(userId, today, res);
                }
            );
        }
    );
});


/* =========================================================
   🎁 MODULE: CLAIM XP – NHẬN XP SAU KHI HOÀN THÀNH TASK
   - Dùng bởi: app.js → claimXP(task_name)
   - task_name hợp lệ: walk/sleep/screen/focus/meditate/exercise/reading
   - Kiểm tra: task phải done VÀ chưa claim
   - Bảng: tasks (*_xp_claimed), users (xp)
   ─ Thêm task mới: thêm vào ALLOWED_TASKS + thêm cột DB tương ứng
========================================================= */
app.post("/api/tasks/claim-xp", (req, res) => {
    const userId        = req.session.user?.id;
    const { task_name } = req.body;
    const today         = new Date().toISOString().slice(0, 10);
    const XP_GAIN       = 30;

    const ALLOWED_TASKS = [
        "walk_completed", "sleep_completed",
        "screen_completed", "focus_completed",
        "meditate_10min",  "exercise_20min",
        "reading_10min"
    ];
    if (!ALLOWED_TASKS.includes(task_name)) {
        return res.status(400).json({ error: "Task không hợp lệ" });
    }

    const claimedField = task_name + "_xp_claimed";

    db.query(
        `SELECT \`${task_name}\`, \`${claimedField}\`
         FROM tasks
         WHERE user_id = ? AND task_date = ?`,
        [userId, today],
        (err, rows) => {
            if (err)          return res.status(500).json({ error: err.message });
            if (!rows.length)  return res.status(404).json({ error: "Không tìm thấy task hôm nay" });

            const row = rows[0];
            if (!row[task_name])    return res.json({ error: "Task chưa hoàn thành" });
            if (row[claimedField])  return res.json({ error: "Đã nhận XP rồi" });

            // Đánh dấu claimed
            db.query(
                `UPDATE tasks SET \`${claimedField}\` = 1
                 WHERE user_id = ? AND task_date = ?`,
                [userId, today],
                (err2) => {
                    if (err2) return res.status(500).json({ error: err2.message });

                    // Cộng XP
                    db.query(
                        "UPDATE users SET xp = xp + ? WHERE id = ?",
                        [XP_GAIN, userId],
                        (err3) => {
                            if (err3) return res.status(500).json({ error: err3.message });
                            res.json({ success: true, xp_gain: XP_GAIN });
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
   🔁 MODULE: CHECK ALL TASKS – KIỂM TRA & CẬP NHẬT STREAK
   - Gọi nội bộ sau mỗi complete-task
   - Nếu cả 4 task đều done → tăng streak → ghi streak_history
   - Logic: last_completed là hôm qua → streak++, còn lại → reset = 1
   - Bảng: tasks, users, streak_history
========================================================= */
function checkAllTasks(userId, today, res) {
    db.query(
        `SELECT walk_completed, sleep_completed,
                screen_completed, focus_completed
         FROM tasks
         WHERE user_id = ? AND task_date = ?`,
        [userId, today],
        (err, rows) => {
            if (err) return res.status(500).json(err);

            const t = rows[0];
            if (!t) return res.json({ ok: true });

            const allDone =
                t.walk_completed   &&
                t.sleep_completed  &&
                t.screen_completed &&
                t.focus_completed;

            if (!allDone) return res.json({ ok: true });

            db.query(
                "SELECT streak, total_streak, last_completed FROM users WHERE id = ?",
                [userId],
                (err2, u) => {
                    if (err2) return res.status(500).json(err2);

                    const lastRaw = u[0].last_completed;
                    const last    = lastRaw
                        ? (lastRaw instanceof Date
                            ? lastRaw.toISOString().slice(0, 10)
                            : String(lastRaw).slice(0, 10))
                        : null;

                    if (last === today) return res.json({ ok: true }); // đã cập nhật hôm nay

                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const y = yesterday.toISOString().slice(0, 10);

                    const streak      = last === y ? u[0].streak + 1 : 1;
                    const totalStreak = Math.max(u[0].total_streak || 0, streak);

                    db.query(
                        `UPDATE users
                         SET streak         = ?,
                             total_streak   = ?,
                             last_completed = ?
                         WHERE id = ?`,
                        [streak, totalStreak, today, userId],
                        () => {
                            // Ghi vào streak_history (bỏ qua nếu đã có)
                            db.query(
                                `INSERT IGNORE INTO streak_history
                                    (user_id, streak_date, is_streak_day)
                                 VALUES (?, ?, 1)`,
                                [userId, today],
                                () => res.json({ ok: true })
                            );
                        }
                    );
                }
            );
        }
    );
}


/* =========================================================
   ⚡ MODULE: XP SYSTEM – CỘNG XP THỦ CÔNG
   - Dùng cho dev/demo, không cần task hoàn thành
   - Bảng: users (cột xp)
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
   📈 MODULE: CHECK LEVEL – TỰ ĐỘNG LÊN CẤP
   - Gọi thủ công sau khi cộng nhiều XP
   - Mỗi 500 XP → lên 1 level, trừ 500 XP
   - Cập nhật xp_to_next = (level_mới + 1) * 100
   - Bảng: users (xp, level, xp_to_next)
========================================================= */
app.post("/check-level", (req, res) => {
    const userId = req.session.user?.id;

    db.query(
        "SELECT xp, level FROM users WHERE id = ?",
        [userId],
        (err, rows) => {
            if (err) return res.status(500).json(err);

            let { xp, level } = rows[0];

            while (xp >= 500) { xp -= 500; level++; }

            const xpToNext = (level + 1) * 100;

            db.query(
                "UPDATE users SET xp = ?, level = ?, xp_to_next = ? WHERE id = ?",
                [xp, level, xpToNext, userId],
                () => res.json({ level })
            );
        }
    );
});


/* =========================================================
   👥 MODULE: FRIENDS – QUẢN LÝ BẠN BÈ
   Gồm 3 route:
     GET  /api/friends         → danh sách bạn bè
     POST /api/friends/add     → thêm bạn 2 chiều
     POST /api/friends/remove  → xoá bạn 2 chiều
   - INSERT IGNORE tránh lỗi duplicate (UNIQUE uq_friendship)
   - Bảng: friends, users
========================================================= */

// Danh sách bạn bè của user đang đăng nhập
app.get("/api/friends", (req, res) => {
    const userId = req.session.user?.id;

    db.query(
        `SELECT
            u.id,
            u.name,
            u.phone_number   AS phone,
            u.streak,
            u.avatar
         FROM friends f
         JOIN users u ON u.id = f.friend_id
         WHERE f.user_id = ?
         ORDER BY u.name ASC`,
        [userId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// Thêm bạn (cả A→B và B→A)
app.post("/api/friends/add", (req, res) => {
    const userId       = req.session.user?.id;
    const { friendId } = req.body;

    if (String(friendId) === String(userId)) {
        return res.status(400).json({ error: "Không thể tự kết bạn với mình" });
    }

    db.query("SELECT id FROM users WHERE id = ?", [friendId], (err, rows) => {
        if (err)          return res.status(500).json({ error: err.message });
        if (!rows.length)  return res.status(404).json({ error: "Người dùng không tồn tại" });

        db.query(
            `INSERT IGNORE INTO friends (user_id, friend_id) VALUES
             (?, ?), (?, ?)`,
            [userId, friendId, friendId, userId],
            (err2) => {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ success: true });
            }
        );
    });
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
    const userId      = req.session.user?.id;
    const { keyword } = req.query;

    if (!keyword || !keyword.trim()) return res.json([]);

    const like = `%${keyword.trim()}%`;

    db.query(
        `SELECT
            id,
            name,
            phone_number   AS phone,
            streak
         FROM users
         WHERE (name LIKE ? OR phone_number LIKE ?)
           AND id != ?
           AND is_verified = 1
         LIMIT 20`,
        [like, like, userId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});


/* =========================================================
   ⏱️ MODULE: FOCUS SESSIONS – LƯU & XEM LỊCH SỬ TẬP TRUNG
   Gồm 2 route:
     POST /api/focus/save    → lưu phiên sau khi dừng/hoàn thành
     GET  /api/focus/history → 50 phiên gần nhất
   - duration_formatted: GENERATED COLUMN, không cần ghi tay
   - Bảng: focus_sessions
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
   🚶 MODULE: STEPS – DEBUG / PLACEHOLDER
   - Chưa lưu DB, chỉ log ra console
   - Muốn lưu thật: thêm bảng walk_sessions hoặc cột vào tasks
========================================================= */
app.post("/api/steps", (req, res) => {
    console.log("Steps:", req.body.steps);
    res.send("OK");
});


module.exports = app;