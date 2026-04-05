const express = require("express");
const db = require("../database/db");
const path = require("path");

const app = express.Router();

/* =========================================================
   🔐 MIDDLEWARE: CHECK LOGIN
========================================================= */
function checkLogin(req, res, next) {
    const isAPI = req.path.startsWith('/api') || req.path.includes('profile-data') || req.path.includes('update-privacy');

    if (!req.session.user) {
        if (isAPI) {
            return res.status(401).json({ error: "Not logged in" }); // ✅
        }
        return res.redirect("/login"); // chỉ cho page
    }

    if (!req.session.user.profile_completed && req.path !== "/setup-profile") {
        if (isAPI) {
            return res.status(403).json({ error: "Profile not completed" });
        }
        return res.redirect("/setup-profile");
    }

    next();
}

/* =========================================================
   📄 APPLY MIDDLEWARE CHO TOÀN BỘ ROUTE
========================================================= */
app.use(checkLogin);

/* =========================================================
   📄 PAGE ROUTES (LOAD HTML)
========================================================= */

// Trang chính
app.get("/index", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/pages/index.html"));
});

// Trang đi bộ
app.get("/walk", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/pages/walk.html"));
});

// Trang tập trung
app.get("/focus", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/pages/focus.html"));
});

// Trang hồ sơ
app.get("/profile", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/pages/profile.html"));
});

// Trang nhóm
app.get("/group", (req, res) => {
    res.sendFile(path.join(__dirname, "../views/pages/friend.html"));
});


/* =========================================================
   🏆 LEADERBOARD API
========================================================= */
app.get("/leaderboardList", (req, res) => {
    const sql = `
        SELECT 
            id,
            name,
            xp,
            level,
            avatar,
            is_me,
            streak,
            RANK() OVER (ORDER BY xp DESC) AS rank
        FROM users
        ORDER BY xp DESC
        LIMIT 5
    `;

    db.query(sql, (err, results) => {
        if (err) {
            console.error("[leaderboardList]", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});


/* =========================================================
   🚪 LOGOUT
========================================================= */
app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
            return res.redirect("/index");
        }

        res.redirect("/login.html");
    });
});


/* =========================================================
   ⚡ XP SYSTEM
========================================================= */

// ➕ Cộng XP (demo)
app.post("/api/add-xp", (req, res) => {
    const { xp } = req.body;

    db.query(
        "UPDATE users SET xp = xp + ? WHERE id = 1",
        [xp],
        (err) => {
            if (err) return res.status(500).json(err);
            res.json({ success: true });
        }
    );
});


/* =========================================================
   📌 TASK SYSTEM
========================================================= */

// ✅ Hoàn thành task
app.post("/complete-task", (req, res) => {
    const { id, type } = req.body;
    const XP_GAIN = 20;

    // Update task
    db.query(
        `UPDATE tasks SET ${type}=1 WHERE id=?`,
        [id],
        (err) => {
            if (err) return res.status(500).json(err);

            // Cộng XP
            db.query(
                "UPDATE users SET xp = xp + ? WHERE id=1",
                [XP_GAIN],
                (err2) => {
                    if (err2) return res.status(500).json(err2);

                    checkAllTasks(res);
                }
            );
        }
    );
});


/* =========================================================
   🔁 CHECK ALL TASK → UPDATE STREAK
========================================================= */
function checkAllTasks(res) {
    db.query(
        "SELECT * FROM tasks ORDER BY id DESC LIMIT 1",
        (err, rows) => {
            if (err) return res.status(500).json(err);

            const t = rows[0];

            const done =
                t.walk_completed &&
                t.sleep_completed &&
                t.screen_completed &&
                t.focus_completed;

            if (!done) return res.json({ ok: true });

            // 👉 Nếu hoàn thành hết → update streak
            db.query(
                "SELECT streak,last_completed FROM users WHERE id=1",
                (err2, u) => {
                    const today = new Date().toISOString().slice(0, 10);
                    const last = u[0].last_completed;

                    let streak = u[0].streak;

                    if (last === today) {
                        return res.json({ ok: true });
                    }

                    if (last) {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);

                        const y = yesterday.toISOString().slice(0, 10);

                        if (last === y) {
                            streak++;
                        } else {
                            streak = 1;
                        }
                    } else {
                        streak = 1;
                    }

                    db.query(
                        "UPDATE users SET streak=?, last_completed=? WHERE id=1",
                        [streak, today],
                        () => res.json({ ok: true })
                    );
                }
            );
        }
    );
}


/* =========================================================
   👤 PROFILE API
========================================================= */

// Lấy dữ liệu profile
app.get("/profile-data", (req, res) => {
    const userId = req.session.user?.id;

    if (!userId) return res.status(401).json({ error: "Not logged in" });

    const sql = `
        SELECT 
            u.*,
            (SELECT COUNT(*) FROM friends WHERE user_id = u.id) AS friends,
            (SELECT COUNT(*) FROM tasks WHERE user_id = u.id) AS tasks
        FROM users u
        WHERE u.id = ?
    `;

    db.query(sql, [userId], (err, rows) => {
        if (err) return res.status(500).json(err);

        if (!rows.length) return res.json({});

        let user = rows[0];

        try {
            user.privacy_settings = user.privacy_settings
                ? JSON.parse(user.privacy_settings)
                : {};
        } catch {
            user.privacy_settings = {};
        }

        res.json(user);
    });
});

// Check level
app.post("/check-level", (req, res) => {
    db.query(
        "SELECT xp,level FROM users WHERE id=1",
        (err, rows) => {
            let xp = rows[0].xp;
            let level = rows[0].level;

            while (xp >= 500) {
                xp -= 500;
                level++;
            }

            db.query(
                "UPDATE users SET xp=?, level=? WHERE id=1",
                [xp, level],
                () => res.json({ level })
            );
        }
    );
});

/* =========================================================
   🔒 UPDATE PRIVACY SETTINGS
========================================================= */
app.post("/update-privacy", (req, res) => {
    const userId = req.session.user?.id;
    const { field, value } = req.body;

    if (!userId) return res.status(401).json({ error: "Not logged in" });

    db.query(
        "SELECT privacy_settings FROM users WHERE id=?",
        [userId],
        (err, rows) => {

            let settings = {};

            try {
                settings = rows[0]?.privacy_settings
                    ? JSON.parse(rows[0].privacy_settings)
                    : {};
            } catch {
                settings = {};
            }

            settings[field] = value;

            db.query(
                "UPDATE users SET privacy_settings=? WHERE id=?",
                [JSON.stringify(settings), userId],
                () => res.json({ success: true })
            );
        }
    );
});


/* =========================================================
   🚶 STEP API (DEBUG)
========================================================= */
app.post("/api/steps", (req, res) => {
    const steps = req.body.steps;
    console.log("Steps:", steps);
    res.send("OK");
});



module.exports = app;