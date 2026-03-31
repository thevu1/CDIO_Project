const express = require("express");
const cors = require("cors");
const db = require("./database/db");
const bodyParser = require("body-parser");
const session = require("express-session");
const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs");
const cron = require("node-cron");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/static", express.static("public"));
app.use(session({
    secret: "healthquest-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

app.get("/walk", (req, res) => res.sendFile(path.join(__dirname, "public/walk.html")));
app.get("/focus", (req, res) => res.sendFile(path.join(__dirname, "public/focus.html")));
app.get("/group", (req, res) => res.sendFile(path.join(__dirname, "public/group.html")));
app.get("/tasks", (req, res) => res.sendFile(path.join(__dirname, "public/tasks.html")));

function requireLogin(req, res, next) {
    if (req.session && req.session.user) return next();
    res.redirect("/login");
}

app.get("/", (req, res) => {
    res.redirect(req.session && req.session.user ? "/index" : "/login");
});

app.get("/login", (req, res) => {
    if (req.session && req.session.user) return res.redirect("/index");
    res.sendFile(path.join(__dirname, "public/login.html"));
});

app.get("/login.html", (req, res) => res.redirect("/login"));

app.get("/index", requireLogin, (req, res) => res.sendFile(path.join(__dirname, "public/index.html")));
app.get("/profile", requireLogin, (req, res) => res.sendFile(path.join(__dirname, "public/profile.html")));

app.get("/register", (req, res) => {
    if (req.session && req.session.user) return res.redirect("/index");
    res.sendFile(path.join(__dirname, "public/register.html"));
});

/* ════════════════════════════════════════
   REGISTER
════════════════════════════════════════ */
app.post("/register", async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
        return res.status(400).send("Vui lòng nhập đầy đủ thông tin");
    try {
        const hash = await bcrypt.hash(password, 10);
        db.query(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            [name, email, hash],
            (err) => {
                if (err) { console.error("[register]", err.message); return res.status(409).send("Tên hoặc email đã tồn tại"); }
                res.redirect("/login");
            }
        );
    } catch (err) {
        console.error("[register bcrypt]", err.message);
        res.status(500).send("Lỗi hệ thống");
    }
});

/* ════════════════════════════════════════
   LOGIN
════════════════════════════════════════ */
app.post("/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).send("Vui lòng nhập đầy đủ thông tin");

    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
        if (err) { console.error("[login]", err.message); return res.status(500).send("Lỗi hệ thống"); }

        let html = fs.readFileSync(path.join(__dirname, "public/login.html"), "utf8");

        if (!results.length) {
            html = html.replace("{{error}}", `<div class="error-message">Email chưa tồn tại.</div>`);
            return res.send(html);
        }

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            html = html.replace("{{error}}", `<div class="error-message">Sai mật khẩu. Vui lòng thử lại.</div>`);
            return res.send(html);
        }

        // ✅ FIX: Lưu user_id nhất quán vào session (dùng user.user_id từ DB)
        req.session.user = {
            id: user.user_id,          // ← dùng user_id từ DB làm id session
            name: user.name,
            email: user.email,
            avatar: user.avatar || "NG",
            nickname: user.nickname || null
        };
        res.redirect("/index");
    });
});

/* ════════════════════════════════════════
   LOGOUT
════════════════════════════════════════ */
app.get("/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) console.error("[logout]", err);
        res.redirect("/login");
    });
});

/* ════════════════════════════════════════
   NICKNAME
════════════════════════════════════════ */
app.post("/api/nickname", requireLogin, (req, res) => {
    const { nickname } = req.body;

    if (!nickname || nickname.trim().length < 2)
        return res.status(400).json({ error: "Nickname phải có ít nhất 2 ký tự" });
    if (nickname.trim().length > 20)
        return res.status(400).json({ error: "Nickname tối đa 20 ký tự" });

    // ✅ FIX: dùng req.session.user.id (nhất quán)
    db.query(
        "UPDATE users SET nickname = ? WHERE user_id = ?",
        [nickname.trim(), req.session.user.id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            req.session.user.nickname = nickname.trim();
            console.log("[api/nickname] đã lưu:", nickname.trim(), "| userId:", req.session.user.id);
            res.json({ success: true, nickname: nickname.trim() });
        }
    );
});

/* ════════════════════════════════════════
   LEADERBOARD
════════════════════════════════════════ */
app.get("/leaderboardList", requireLogin, (req, res) => {
    const currentUserId = req.session.user.id;

    const sql = `
        SELECT 
            user_id,
            nickname,
            name,
            avatar,
            level,
            xp,
            RANK() OVER (ORDER BY xp DESC) AS user_rank,
            (user_id = ?) AS is_me
        FROM users
        ORDER BY xp DESC
        LIMIT 20
    `;

    db.query(sql, [currentUserId], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(result);
    });
});

/* ════════════════════════════════════════
   API PLAYER/ME
════════════════════════════════════════ */
app.get("/api/player/me", requireLogin, (req, res) => {
    const sql = `
        SELECT user_id, name, nickname, xp, level, avatar,
               (SELECT COUNT(*) + 1 FROM users u2 WHERE u2.xp > users.xp) AS user_rank
        FROM users
        WHERE user_id = ?
        LIMIT 1
    `;

    // ✅ FIX: dùng req.session.user.id
    db.query(sql, [req.session.user.id], (err, results) => {
        if (err) {
            console.error("[api/player/me]", err.message);
            return res.status(500).json({ error: err.message });
        }

        if (!results.length)
            return res.status(404).json({ error: "Không tìm thấy user" });

        res.json(results[0]);
    });
});

/* ════════════════════════════════════════
   ADD XP
════════════════════════════════════════ */
app.post("/api/player/me/xp", requireLogin, (req, res) => {
    const { amount } = req.body;
    if (!amount || isNaN(amount)) return res.status(400).json({ error: "Thiếu amount" });

    const userId = req.session.user.id;

    function calcLevel(xp) {
        let level = 0;
        while ((level + 1) * (level + 2) / 2 * 100 <= xp) level++;
        return level;
    }

    // ✅ FIX: dùng user_id thay vì id trong WHERE
    db.query("UPDATE users SET xp = xp + ? WHERE user_id = ?", [Number(amount), userId], err => {
        if (err) return res.status(500).json({ error: err.message });
        db.query("SELECT xp FROM users WHERE user_id = ?", [userId], (err2, rows) => {
            if (err2) return res.status(500).json({ error: err2.message });
            const newXp = rows[0].xp;
            const newLevel = calcLevel(newXp);
            const xpFloor = newLevel * (newLevel + 1) / 2 * 100;
            const xpToNext = (newLevel + 1) * 100;
            const xpIn = Math.max(0, newXp - xpFloor);
            db.query("UPDATE users SET level = ? WHERE user_id = ?", [newLevel, userId], err3 => {
                if (err3) return res.status(500).json({ error: err3.message });
                res.json({ success: true, xp: newXp, level: newLevel, xpIn, xpToNext, pct: Math.min(Math.round(xpIn / xpToNext * 100), 100) });
            });
        });
    });
});

/* ════════════════════════════════════════
   STREAK CHECK MIDDLEWARE
════════════════════════════════════════ */
async function checkMissedDay(userId) {
    db.query(
        "SELECT streak, last_completed, streak_freeze FROM users WHERE user_id = ?",
        [userId],
        (err, rows) => {
            if (err || !rows.length) return;
            const user = rows[0];
            if (!user.last_completed) return;
            const last = new Date(user.last_completed);
            const today = new Date();
            const diff = Math.floor((today - last) / (1000 * 60 * 60 * 24));
            if (diff <= 1) return;
            if (user.streak_freeze > 0) {
                db.query("UPDATE users SET streak_freeze = streak_freeze - 1 WHERE user_id = ?", [userId]);
            } else {
                db.query("UPDATE users SET streak = 0 WHERE user_id = ?", [userId]);
            }
        }
    );
}

/* ════════════════════════════════════════
   PROFILE DATA (GET)
   ✅ FIX: dùng user_id nhất quán, sửa JOIN condition
════════════════════════════════════════ */
app.get("/profile-data", requireLogin, (req, res) => {
    const sql = `
        SELECT
            u.user_id, u.name, u.email, u.xp, u.level,
            u.avatar, u.nickname,
            u.xp_to_next,
            u.streak,
            COALESCE(t.completed_count, 0) AS tasks
        FROM users u
        LEFT JOIN (
            SELECT
                user_id,
                SUM(
                    COALESCE(walk_completed, 0) +
                    COALESCE(sleep_completed, 0) +
                    COALESCE(screen_completed, 0) +
                    COALESCE(focus_completed, 0)
                ) AS completed_count
            FROM daily_tasks
            GROUP BY user_id
        ) t ON t.user_id = u.user_id
        WHERE u.user_id = ?
        LIMIT 1
    `;
    // ✅ FIX: dùng req.session.user.id (đã được set đúng lúc login)
    db.query(sql, [req.session.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!rows.length) return res.status(404).json({ error: "Không tìm thấy" });
        console.log("[profile-data] userId:", req.session.user.id, "| nickname:", rows[0].nickname, "| xp:", rows[0].xp);
        res.json(rows[0]);
    });
});

/* ════════════════════════════════════════
   PROFILE DATA (PUT)
════════════════════════════════════════ */
app.put("/profile-data", requireLogin, (req, res) => {
    const { nickname, birthday, city, phone } = req.body;
    const userId = req.session.user.id;
    db.query(
        "UPDATE users SET nickname = ?, birthday = ?, city = ?, phone = ? WHERE user_id = ?",
        [nickname || null, birthday || null, city || null, phone || null, userId],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            if (nickname) req.session.user.nickname = nickname;
            res.json({ success: true });
        }
    );
});

/* ════════════════════════════════════════
   USER COUNT
════════════════════════════════════════ */
app.get("/api/users/count", requireLogin, (req, res) => {
    db.query("SELECT COUNT(*) AS total FROM users", (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ total: rows[0].total });
    });
});

/* ════════════════════════════════════════
   COMPLETE TASK
════════════════════════════════════════ */
app.post("/complete-task", requireLogin, (req, res) => {
    const { id, type } = req.body;
    const userId = req.session.user.id;
    const XP_GAIN = 20;

    const allowed = ["walk_completed", "sleep_completed", "screen_completed", "focus_completed"];
    if (!allowed.includes(type))
        return res.status(400).json({ error: "Task không hợp lệ" });

    db.query(
        `UPDATE daily_tasks SET ${type} = 1 WHERE id = ?`,
        [id],
        err => {
            if (err) return res.status(500).json({ error: err.message });
            db.query(
                "UPDATE users SET xp = xp + ? WHERE user_id = ?",
                [XP_GAIN, userId],
                () => { checkAllTasks(res, userId); }
            );
        }
    );
});

function checkAllTasks(res, userId) {
    db.query(
        "SELECT * FROM daily_tasks ORDER BY id DESC LIMIT 1",
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            const t = rows[0];
            const done = t.walk_completed && t.sleep_completed && t.screen_completed && t.focus_completed;
            if (!done) return res.json({ ok: true });

            const today = new Date().toISOString().slice(0, 10);
            db.query(
                "SELECT streak, last_completed FROM users WHERE user_id = ?",
                [userId],
                (err2, rows2) => {
                    const user = rows2[0];
                    let streak = user.streak;
                    if (user.last_completed === today) return res.json({ ok: true });
                    if (user.last_completed) {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        const y = yesterday.toISOString().slice(0, 10);
                        streak = (user.last_completed === y) ? streak + 1 : 1;
                    } else {
                        streak = 1;
                    }
                    db.query(
                        "UPDATE users SET streak = ?, last_completed = ? WHERE user_id = ?",
                        [streak, today, userId],
                        () => res.json({ ok: true })
                    );
                }
            );
        }
    );
}

/* ════════════════════════════════════════
   REMINDER API
════════════════════════════════════════ */
app.get("/api/reminder", requireLogin, (req, res) => {
    db.query(
        "SELECT * FROM daily_tasks ORDER BY id DESC LIMIT 1",
        (err, rows) => {
            if (!rows || !rows.length) return res.json({ remind: false });
            const t = rows[0];
            const done = t.walk_completed && t.sleep_completed && t.screen_completed && t.focus_completed;
            const hour = new Date().getHours();
            if (!done && hour >= 20) return res.json({ remind: true });
            res.json({ remind: false });
        }
    );
});

/* ════════════════════════════════════════
   FOCUS SESSIONS
════════════════════════════════════════ */
app.post("/api/focus/save", requireLogin, (req, res) => {
    const { focus_mode, focus_duration_seconds, time_remaining_seconds, status } = req.body;
    const user_id = req.session.user.id;

    const sql = `
        INSERT INTO focus_sessions 
        (user_id, focus_mode, focus_duration_seconds, time_remaining_seconds, status) 
        VALUES (?, ?, ?, ?, ?)
    `;

    db.query(sql, [user_id, focus_mode, focus_duration_seconds, time_remaining_seconds, status], (err, result) => {
        if (err) {
            console.error("Lỗi SQL:", err);
            return res.status(500).json({ success: false, message: "Không thể lưu vào database", error: err.message });
        }
        res.json({ success: true, message: "Lưu phiên tập trung thành công!", id: result.insertId });
    });
});

app.get("/api/focus/history", requireLogin, (req, res) => {
    const userId = req.session.user.id;
    const sql = `SELECT *, duration_formatted FROM focus_sessions WHERE user_id = ? ORDER BY created_at DESC`;
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error("Lỗi lấy lịch sử:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

/* ════════════════════════════════════════
   CRON - RESET STREAK FREEZE MONTHLY
════════════════════════════════════════ */
cron.schedule("0 0 1 * *", () => {
    console.log("Reset streak freeze");
    db.query("UPDATE users SET streak_freeze = 3", err => {
        if (err) console.error(err);
    });
});

/* ════════════════════════════════════════
   START SERVER
════════════════════════════════════════ */
app.listen(PORT, () => {
    console.log(`\n🚀 Server: http://localhost:${PORT}`);
    console.log("   GET  /leaderboardList");
    console.log("   GET  /api/player/me");
    console.log("   POST /api/player/me/xp");
    console.log("   GET  /profile-data\n");
});