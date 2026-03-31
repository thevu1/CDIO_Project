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
// ===============================
// FORGOT PASSWORD APIs
// ===============================

// API 1: kiểm tra email
app.post("/api/auth/check-email", (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email không được để trống." });
  }

  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Lỗi server." });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: "Email chưa được đăng ký." });
    }

    return res.status(200).json({ message: "Email hợp lệ." });
  });
});


// API 2: reset password
app.post("/api/auth/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ message: "Thiếu thông tin." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const sql = "UPDATE users SET password = ? WHERE email = ?";
    db.query(sql, [hashedPassword, email], (err, result) => {
      if (err) {
        return res.status(500).json({ message: "Lỗi server." });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: "Không tìm thấy tài khoản." });
      }

      return res.status(200).json({ message: "Đặt lại mật khẩu thành công." });
    });

  } catch (error) {
    return res.status(500).json({ message: "Có lỗi xảy ra." });
  }
});

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

    db.query(
        "SELECT * FROM users WHERE email = ?",
        [email],
        async (err, results) => {
            if (err) {
                console.log(err);
                return res.send("Lỗi hệ thống");
            }

            if (results.length === 0) {
                return res.send("Email chưa tồn tại");
            }

            const user = results[0];
            const match = await bcrypt.compare(password, user.password);

            if (!match) {
                return res.send("Sai mật khẩu");
            }

            req.session.user = {
                id: user.id,
                userid: user.userid,
                name: user.name,
                email: user.email,
                nickname: user.nickname || null
            };

            res.redirect("/index");
        }
    );
});

app.get("/forgot-password", (req, res) => {
  res.sendFile(path.join(__dirname, "public/forgot-password.html"));
});

app.get("/reset-password", (req, res) => {
  res.sendFile(path.join(__dirname, "public/reset-password.html"));
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
app.post("/api/nickname", requireLogin, (req, res) => {
    const { nickname } = req.body;

    if (!nickname || nickname.trim().length < 2)
        return res.status(400).json({ error: "Nickname phải có ít nhất 2 ký tự" });

    if (nickname.trim().length > 20)
        return res.status(400).json({ error: "Nickname tối đa 20 ký tự" });

    db.query(
        "UPDATE users SET nickname = ? WHERE id = ?",
        [nickname.trim(), req.session.user.id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, nickname: nickname.trim() });
        }
    );
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
            nickname,
            xp,
            level,
            avatar,
            streak,
            RANK() OVER (ORDER BY xp DESC) AS user_rank
        FROM users
        ORDER BY xp DESC
        LIMIT 10
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error("[leaderboardList]", err.message);
            return res.status(500).json({ error: err.message });
        }
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

    // Tính level từ tổng XP — KHÔNG trừ XP, giữ nguyên để tính thanh tiến trình
    function calcLevel(xp) {
        let level = 0;
        // level N đạt được khi xp >= N*(N+1)/2 * 100
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

            db.query("SELECT xp FROM users WHERE id = ?", [userId], (err2, rows) => {
                if (err2) return res.status(500).json({ error: err2.message });

                const newXp = rows[0].xp;
                const newLevel = calcLevel(newXp);

                // Tính thông tin trả về cho client
                const xpFloor = newLevel * (newLevel + 1) / 2 * 100;
                const xpToNext = (newLevel + 1) * 100;
                const xpIn = Math.max(0, newXp - xpFloor);

                db.query("UPDATE users SET level = ? WHERE id = ?", [newLevel, userId], (err3) => {
                    if (err3) return res.status(500).json({ error: err3.message });
                    res.json({
                        success: true,
                        xp: newXp,
                        level: newLevel,
                        xpIn: xpIn,      // XP dư trong level hiện tại
                        xpToNext: xpToNext,  // XP cần cho level tiếp theo
                        pct: Math.min(Math.round(xpIn / xpToNext * 100), 100)
                    });
                });
            });
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

function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ message: "Chưa đăng nhập" });
    }
    next();
}

/* =========================
   WALK API
========================= */

function getTodayVN() {
    const now = new Date();
    const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    return vn.toISOString().slice(0, 10);
}

function getDayLabel(dayIndex) {
    const map = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    return map[dayIndex];
}

// Lấy dữ liệu tổng quan trang đi bộ
app.get("/api/walk/summary", requireLogin, (req, res) => {
    const userid = req.session.user.userid;
    const today = getTodayVN();

    const settingsSql = `
        SELECT daily_goal, xp, last_claim_date
        FROM walk_settings
        WHERE userid = ?
        LIMIT 1
    `;

    const todaySql = `
        SELECT COALESCE(SUM(distance), 0) AS today_distance
        FROM walk
        WHERE userid = ? AND walk_date = ?
    `;

    const totalDaysSql = `
        SELECT COUNT(DISTINCT walk_date) AS total_days
        FROM walk
        WHERE userid = ?
    `;

    const weekSql = `
        SELECT walk_date, ROUND(COALESCE(SUM(distance), 0), 2) AS distance
        FROM walk
        WHERE userid = ?
          AND walk_date >= DATE_SUB(?, INTERVAL 6 DAY)
          AND walk_date <= ?
        GROUP BY walk_date
        ORDER BY walk_date ASC
    `;

    db.query(settingsSql, [userid], (err, settingsRows) => {
        if (err) {
            console.log("WALK SETTINGS ERROR:", err);
            return res.status(500).json({ message: "Lỗi lấy cài đặt đi bộ" });
        }

        let settings = {
            daily_goal: 5,
            xp: 0,
            last_claim_date: null
        };

        const continueLoad = () => {
            db.query(todaySql, [userid, today], (err2, todayRows) => {
                if (err2) {
                    console.log("WALK TODAY ERROR:", err2);
                    return res.status(500).json({ message: "Lỗi lấy dữ liệu hôm nay" });
                }

                db.query(totalDaysSql, [userid], (err3, totalRows) => {
                    if (err3) {
                        console.log("WALK TOTAL DAYS ERROR:", err3);
                        return res.status(500).json({ message: "Lỗi lấy tổng số ngày" });
                    }

                    db.query(weekSql, [userid, today, today], (err4, weekRows) => {
                        if (err4) {
                            console.log("WALK WEEK ERROR:", err4);
                            return res.status(500).json({ message: "Lỗi lấy lịch sử 7 ngày" });
                        }

                        const dateMap = {};
                        weekRows.forEach(r => {
                            const key = new Date(r.walk_date).toISOString().slice(0, 10);
                            dateMap[key] = Number(r.distance || 0);
                        });

                        const labels = [];
                        const chart = [];
                        let total7 = 0;

                        for (let i = 6; i >= 0; i--) {
                            const d = new Date(today);
                            d.setDate(d.getDate() - i);

                            const key = d.toISOString().slice(0, 10);
                            const value = dateMap[key] || 0;

                            labels.push(getDayLabel(d.getDay()));
                            chart.push(value);
                            total7 += value;
                        }

                        const todayDistance = Number(todayRows[0]?.today_distance || 0);
                        const goal = Number(settings.daily_goal || 5);
                        const avg7d = Number((total7 / 7).toFixed(1));
                        const totalDays = Number(totalRows[0]?.total_days || 0);
                        const xpClaimed =
                            settings.last_claim_date &&
                            String(settings.last_claim_date).slice(0, 10) === today;

                        return res.json({
                            success: true,
                            data: {
                                todayDistance,
                                goal,
                                avg7d,
                                totalDays,
                                labels,
                                chart,
                                xpClaimed
                            }
                        });
                    });
                });
            });
        };

        if (settingsRows.length > 0) {
            settings = settingsRows[0];
            return continueLoad();
        }

        const insertSettingsSql = `
            INSERT INTO walk_settings (userid, daily_goal, xp)
            VALUES (?, 5, 0)
        `;

        db.query(insertSettingsSql, [userid], (errInsert) => {
            if (errInsert) {
                console.log("INSERT WALK SETTINGS ERROR:", errInsert);
                return res.status(500).json({ message: "Lỗi khởi tạo cài đặt đi bộ" });
            }
            continueLoad();
        });
    });
});

// Ghi nhận hoạt động hôm nay
app.post("/api/walk/log", requireLogin, (req, res) => {
    const userid = req.session.user.userid;
    const walkDate = getTodayVN();
    const { distance, steps, duration, calories, note } = req.body;

    const parsedDistance = parseFloat(distance) || 0;
    const parsedSteps = parseInt(steps) || 0;
    const parsedDuration = parseInt(duration) || 0;
    const parsedCalories = parseInt(calories) || 0;
    const parsedNote = note || null;

    if (parsedDistance <= 0) {
        return res.status(400).json({ message: "Khoảng cách phải lớn hơn 0" });
    }

    const sql = `
        INSERT INTO walk (userid, walk_date, distance, steps, duration, calories, note)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [userid, walkDate, parsedDistance, parsedSteps, parsedDuration, parsedCalories, parsedNote],
        (err, result) => {
            if (err) {
                console.log("WALK LOG ERROR:", err);
                return res.status(500).json({ message: "Lỗi lưu hoạt động đi bộ" });
            }

            return res.json({
                success: true,
                message: "Đã lưu hoạt động đi bộ",
                result
            });
        }
    );
});

// Cập nhật mục tiêu đi bộ
app.post("/api/walk/goal", requireLogin, (req, res) => {
    const userid = req.session.user.userid;
    const { dailyGoal } = req.body;
    const goal = parseFloat(dailyGoal);

    if (!goal || goal <= 0) {
        return res.status(400).json({ message: "Mục tiêu không hợp lệ" });
    }

    const sql = `
        INSERT INTO walk_settings (userid, daily_goal, xp)
        VALUES (?, ?, 0)
        ON DUPLICATE KEY UPDATE daily_goal = VALUES(daily_goal)
    `;

    db.query(sql, [userid, goal], (err) => {
        if (err) {
            console.log("WALK GOAL ERROR:", err);
            return res.status(500).json({ message: "Lỗi cập nhật mục tiêu" });
        }

        return res.json({
            success: true,
            message: "Đã cập nhật mục tiêu"
        });
    });
});

// Nhận XP khi hoàn thành mục tiêu
app.post("/api/walk/claim-xp", requireLogin, (req, res) => {
    const userid = req.session.user.userid;
    const today = getTodayVN();

    const settingsSql = `
        SELECT daily_goal, xp, last_claim_date
        FROM walk_settings
        WHERE userid = ?
        LIMIT 1
    `;

    const todaySql = `
        SELECT COALESCE(SUM(distance), 0) AS today_distance
        FROM walk
        WHERE userid = ? AND walk_date = ?
    `;

    db.query(settingsSql, [userid], (err, settingsRows) => {
        if (err) {
            console.log("CLAIM SETTINGS ERROR:", err);
            return res.status(500).json({ message: "Lỗi lấy cài đặt" });
        }

        if (settingsRows.length === 0) {
            return res.status(400).json({ message: "Chưa có mục tiêu đi bộ" });
        }

        const settings = settingsRows[0];

        if (
            settings.last_claim_date &&
            String(settings.last_claim_date).slice(0, 10) === today
        ) {
            return res.status(400).json({ message: "Hôm nay bạn đã nhận XP rồi" });
        }

        db.query(todaySql, [userid, today], (err2, todayRows) => {
            if (err2) {
                console.log("CLAIM TODAY ERROR:", err2);
                return res.status(500).json({ message: "Lỗi lấy dữ liệu hôm nay" });
            }

            const todayDistance = Number(todayRows[0]?.today_distance || 0);
            const goal = Number(settings.daily_goal || 5);

            if (todayDistance < goal) {
                return res.status(400).json({ message: "Bạn chưa đạt mục tiêu hôm nay" });
            }

            const updateWalkSettingsSql = `
                UPDATE walk_settings
                SET xp = xp + 50,
                    last_claim_date = ?
                WHERE userid = ?
            `;

            db.query(updateWalkSettingsSql, [today, userid], (err3) => {
                if (err3) {
                    console.log("CLAIM UPDATE SETTINGS ERROR:", err3);
                    return res.status(500).json({ message: "Lỗi cộng XP" });
                }

                db.query(
                    "UPDATE users SET xp = xp + 50 WHERE userid = ?",
                    [userid],
                    (err4) => {
                        if (err4) {
                            console.log("CLAIM UPDATE USER XP ERROR:", err4);
                            return res.status(500).json({ message: "Lỗi cập nhật XP người dùng" });
                        }

                        return res.json({
                            success: true,
                            message: "Đã nhận 50 XP"
                        });
                    }
                );
            });
        });
    });
});
/* =========================
   SLEEP API
========================= */

// Lấy cài đặt giờ ngủ + lịch sử 7 ngày
app.get("/api/sleep/data", requireLogin, (req, res) => {
    const userid = req.session.user.userid;

    const settingsSql = `
        SELECT target_time, reminder_enabled
        FROM sleep_settings
        WHERE userid = ?
        LIMIT 1
    `;

    const historySql = `
        SELECT id, sleep_date, sleep_time, wake_time, duration, note
        FROM sleep
        WHERE userid = ?
        ORDER BY sleep_date DESC
        LIMIT 7
    `;

    db.query(settingsSql, [userid], (err, settingsRows) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ message: "Lỗi lấy cài đặt giấc ngủ" });
        }

        db.query(historySql, [userid], (err2, historyRows) => {
            if (err2) {
                console.log(err2);
                return res.status(500).json({ message: "Lỗi lấy lịch sử giấc ngủ" });
            }

            let settings = {
                target_time: "22:30:00",
                reminder_enabled: 1
            };

            if (settingsRows.length > 0) {
                settings = settingsRows[0];
            }

            res.json({
                settings,
                history: historyRows
            });
        });
    });
});


// Lưu giờ ngủ mục tiêu
app.post("/api/sleep/settings", (req, res) => {
    const userid = req.session.user.userid;
    const { target_time } = req.body;

    if (!target_time) {
        return res.status(400).json({ message: "Thiếu giờ ngủ mục tiêu" });
    }

    const sql = `
        INSERT INTO sleep_settings (userid, target_time, reminder_enabled)
        VALUES (?, ?, 1)
        ON DUPLICATE KEY UPDATE target_time = VALUES(target_time)
    `;

    db.query(sql, [userid, target_time], (err) => {
        if (err) {
            console.log("SLEEP SETTINGS ERROR:", err);
            return res.status(500).json({ message: "Lỗi lưu giờ ngủ mục tiêu" });
        }

        res.json({ message: "Lưu giờ ngủ thành công" });
    });
});


// Bật/tắt nhắc nhở
app.post("/api/sleep/reminder", (req, res) => {
    const userid = req.session.user.userid;
    const { reminder_enabled } = req.body;

    const sql = `
        INSERT INTO sleep_settings (userid, target_time, reminder_enabled)
        VALUES (?, '22:30:00', ?)
        ON DUPLICATE KEY UPDATE reminder_enabled = VALUES(reminder_enabled)
    `;

    db.query(sql, [userid, reminder_enabled ? 1 : 0], (err) => {
        if (err) {
            console.log("REMINDER ERROR:", err);
            return res.status(500).json({ message: "Lỗi cập nhật nhắc nhở" });
        }

        res.json({ message: "Cập nhật nhắc nhở thành công" });
    });
});


// Ghi nhận giấc ngủ hôm nay
app.post("/api/sleep/checkin", requireLogin, (req, res) => {
    const userid = req.session.user.userid;
    const { sleep_date, sleep_time, wake_time, duration, note } = req.body;

    console.log("=== CHECKIN SLEEP ===");
    console.log("userid:", userid);
    console.log("body:", req.body);

    if (!sleep_date || !sleep_time) {
        return res.status(400).json({ message: "Thiếu dữ liệu giấc ngủ" });
    }

    const checkSql = `
        SELECT id FROM sleep
        WHERE userid = ? AND sleep_date = ?
        LIMIT 1
    `;

    db.query(checkSql, [userid, sleep_date], (err, rows) => {
        if (err) {
            console.log("CHECK ERROR:", err);
            return res.status(500).json({ message: "Lỗi kiểm tra dữ liệu ngủ" });
        }

        if (rows.length > 0) {
            const updateSql = `
                UPDATE sleep
                SET sleep_time = ?, wake_time = ?, duration = ?, note = ?
                WHERE userid = ? AND sleep_date = ?
            `;

            db.query(
                updateSql,
                [sleep_time, wake_time || null, duration || null, note || null, userid, sleep_date],
                (err2, result2) => {
                    if (err2) {
                        console.log("UPDATE ERROR:", err2);
                        return res.status(500).json({ message: "Lỗi cập nhật giấc ngủ" });
                    }

                    console.log("UPDATE RESULT:", result2);

                    if (result2.affectedRows === 0) {
                        return res.status(404).json({ message: "Không tìm thấy dữ liệu để cập nhật" });
                    }

                    return res.json({
                        message: "Cập nhật giấc ngủ thành công",
                        action: "update",
                        result: result2
                    });
                }
            );
        } else {
            const insertSql = `
                INSERT INTO sleep (userid, sleep_date, sleep_time, wake_time, duration, note)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            db.query(
                insertSql,
                [userid, sleep_date, sleep_time, wake_time || null, duration || null, note || null],
                (err3, result3) => {
                    if (err3) {
                        console.log("INSERT ERROR:", err3);
                        return res.status(500).json({ message: "Lỗi lưu giấc ngủ" });
                    }

                    console.log("INSERT RESULT:", result3);

                    return res.json({
                        message: "Lưu giấc ngủ thành công",
                        action: "insert",
                        result: result3
                    });
                }
            );
        }
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