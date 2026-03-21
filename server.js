const express = require("express");
const cors = require("cors");
const db = require("./database/db");
const bodyParser = require("body-parser");
const session = require("express-session");
const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

/* ════════════════════════════════════════
   MIDDLEWARE
════════════════════════════════════════ */
app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/static", express.static("public"));

app.use(session({
    secret: "healthquest-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 ngày
}));

app.get("/sleep", (req, res) => {
    res.sendFile(path.join(__dirname, "public/sleep.html"));
});
app.get("/walk", (req, res) => {
    res.sendFile(path.join(__dirname, "public/walk.html"));
});
app.get("/screen", (req, res) => {
    res.sendFile(path.join(__dirname, "public/screen.html"));
});
app.get("/focus", (req, res) => {
    res.sendFile(path.join(__dirname, "public/focus.html"));
});
app.get("/friends", (req, res) => {
    res.sendFile(path.join(__dirname, "public/friends.html"));
});
app.get("/profile", (req, res) => {
    res.sendFile(path.join(__dirname, "public/profile.html"));
});

/* ════════════════════════════════════════
   MIDDLEWARE KIỂM TRA ĐĂNG NHẬP
════════════════════════════════════════ */
function requireLogin(req, res, next) {
    if (req.session && req.session.user) {
        next();
    } else {

        res.redirect("/login");
    }
}

/* ════════════════════════════════════════
   PAGE ROUTES
════════════════════════════════════════ */

app.get("/", (req, res) => {
    if (req.session && req.session.user) {
        res.redirect("/index");
    } else {
        res.redirect("/login.html");
    }
});

app.get("/login", (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect("/index");
    }
    res.sendFile(path.join(__dirname, "public/login.html"));
});

app.get("/login.html", (req, res) => {
    res.redirect("/login");
});

app.get("/index", requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "public/index.html"));
});

app.get("/profile", requireLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "public/profile.html"));
});

app.get("/register", (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect("/index");
    }
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
                if (err) {
                    console.error("[register]", err.message);
                    return res.status(409).send("Tên hoặc email đã tồn tại");
                }
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

    db.query(
        "SELECT * FROM users WHERE email = ?",
        [email],
        async (err, results) => {
            if (err) {
                console.error("[login]", err.message);
                return res.status(500).send("Lỗi hệ thống");
            }

            let html = fs.readFileSync(
                path.join(__dirname, "public/login.html"), "utf8"
            );

            if (!results.length) {
                html = html.replace(
                    "{{error}}",
                    `<div class="error-message">Email chưa tồn tại.</div>`
                );
                return res.send(html);
            }

            const user = results[0];
            const match = await bcrypt.compare(password, user.password);

            if (!match) {
                html = html.replace(
                    "{{error}}",
                    `<div class="error-message">Sai mật khẩu. Vui lòng thử lại.</div>`
                );
                return res.send(html);
            }

            // Lưu session theo id — không dùng is_me nữa
            req.session.user = {
                id: user.id,
                name: user.name,
                email: user.email,
                avatar: user.avatar || "NG"
            };

            res.redirect("/index");
        }
    );
});

/* ════════════════════════════════════════
   LOGOUT
════════════════════════════════════════ */
app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error("[logout]", err);
        res.redirect("/login");
    });
});

/* ════════════════════════════════════════
   LEADERBOARD
   - Dùng session.user.id để biết ai là "me"
   - Dùng level từ DB (đã đúng)
   - Alias user_rank tránh reserved word
════════════════════════════════════════ */
app.get("/leaderboardList", requireLogin, (req, res) => {

    const sql = `
        SELECT 
            id,
            name,
            xp,
            level,
            avatar,
            streak,
            RANK() OVER (ORDER BY xp DESC) AS user_rank
        FROM users
        ORDER BY xp DESC
        LIMIT 5
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("[leaderboardList]", err.message);
            return res.status(500).json({ error: err.message });
        }

        // Đánh dấu is_me theo session — không hardcode trong DB
        const currentUserId = req.session.user.id;
        const data = results.map(p => ({
            ...p,
            is_me: p.id === currentUserId ? 1 : 0
        }));

        res.json(data);
    });
});

/* ════════════════════════════════════════
   API PLAYER/ME
════════════════════════════════════════ */
app.get("/api/player/me", requireLogin, (req, res) => {

    const sql = `
        SELECT 
            id, name, xp, level, avatar, streak,
            (SELECT COUNT(*) + 1 FROM users u2 WHERE u2.xp > users.xp) AS user_rank
        FROM users
        WHERE id = ?
        LIMIT 1
    `;

    db.query(sql, [req.session.user.id], (err, results) => {
        if (err) {
            console.error("[api/player/me]", err.message);
            return res.status(500).json({ error: err.message });
        }
        if (!results.length)
            return res.status(404).json({ error: "Không tìm thấy" });

        res.json(results[0]);
    });
});

/* ════════════════════════════════════════
   CỘNG XP + CẬP NHẬT LEVEL
════════════════════════════════════════ */
app.post("/api/player/me/xp", requireLogin, (req, res) => {

    const { amount } = req.body;
    if (!amount || isNaN(amount))
        return res.status(400).json({ error: "Thiếu amount" });

    const userId = req.session.user.id;

    // Hàm tính level từ tổng XP (bắt đầu từ level 0)
    function calcLevel(xp) {
        let level = 0;
        while ((level + 1) * (level + 2) / 2 * 100 <= xp) {
            level++;
        }
        return level;
    }

    db.query(
        "UPDATE users SET xp = xp + ? WHERE id = ?",
        [Number(amount), userId],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });

            db.query(
                "SELECT xp FROM users WHERE id = ?",
                [userId],
                (err2, rows) => {
                    if (err2) return res.status(500).json({ error: err2.message });

                    const newXp = rows[0].xp;
                    const newLevel = calcLevel(newXp);

                    db.query(
                        "UPDATE users SET level = ? WHERE id = ?",
                        [newLevel, userId],
                        (err3) => {
                            if (err3) return res.status(500).json({ error: err3.message });
                            res.json({ success: true, xp: newXp, level: newLevel });
                        }
                    );
                }
            );
        }
    );
});
/* ════════════════════════════════════════
   PROFILE DATA
════════════════════════════════════════ */
app.get("/profile-data", requireLogin, (req, res) => {

    const sql = `
        SELECT
            u.id, u.name, u.email, u.xp, u.level,
            u.avatar, u.streak, u.nickname,
            u.birthday, u.city, u.phone,
            u.created_at,
            u.friends_count                          AS friends,
            COALESCE(t.completed_count, 0)           AS tasks
        FROM users u
        LEFT JOIN (
            SELECT user_id, COUNT(*) AS completed_count
            FROM tasks
            WHERE is_completed = 1
        ) t ON t.user_id = u.id
        WHERE u.id = ?
        LIMIT 1
    `;

    db.query(sql, [req.session.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!rows.length) return res.status(404).json({ error: "Không tìm thấy" });
        res.json(rows[0]);
    });
});

/* ── PUT /profile-data ──────────────────────────────
   Cập nhật thông tin cá nhân
──────────────────────────────────────────────────── */
app.put("/profile-data", requireLogin, (req, res) => {
    const { nickname, birthday, city, phone } = req.body;
    const userId = req.session.user.id;

    db.query(
        `UPDATE users
         SET nickname = ?, birthday = ?, city = ?, phone = ?
         WHERE id = ?`,
        [nickname || null, birthday || null, city || null, phone || null, userId],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

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
    const XP_GAIN = 20;
    const userId = req.session.user.id;

    const allowed = ["walk_completed", "sleep_completed", "screen_completed", "focus_completed"];
    if (!allowed.includes(type))
        return res.status(400).json({ error: "Loại task không hợp lệ" });

    db.query(
        `UPDATE tasks SET ${type} = 1 WHERE id = ?`,
        [id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });

            db.query(
                "UPDATE users SET xp = xp + ? WHERE id = ?",
                [XP_GAIN, userId],
                (err2) => {
                    if (err2) return res.status(500).json({ error: err2.message });
                    checkAllTasks(res, userId);
                }
            );
        }
    );
});

function checkAllTasks(res, userId) {

    db.query(
        "SELECT * FROM tasks ORDER BY id DESC LIMIT 1",
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });

            const t = rows[0];
            const done = t.walk_completed && t.sleep_completed &&
                t.screen_completed && t.focus_completed;

            if (!done) return res.json({ ok: true });

            db.query(
                "SELECT streak, last_completed FROM users WHERE id = ?",
                [userId],
                (err2, u) => {
                    if (err2) return res.status(500).json({ error: err2.message });

                    const today = new Date().toISOString().slice(0, 10);
                    const last = u[0].last_completed;
                    let streak = u[0].streak;

                    if (last === today) return res.json({ ok: true });

                    if (last) {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        streak = last === yesterday.toISOString().slice(0, 10)
                            ? streak + 1 : 1;
                    } else {
                        streak = 1;
                    }

                    db.query(
                        "UPDATE users SET streak = ?, last_completed = ? WHERE id = ?",
                        [streak, today, userId],
                        () => res.json({ ok: true })
                    );
                }
            );
        }
    );
}

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