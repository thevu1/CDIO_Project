const express = require("express");
const cors = require("cors");
const db = require("./database/db");
const bodyParser = require("body-parser");
const session = require("express-session");
const path = require("path");

const app = express();
const PORT = 3000;

/* ======================
   MIDDLEWARE
====================== */

app.use(cors());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: "healthquest-secret",
    resave: false,
    saveUninitialized: false
}));

/* ======================
   PAGES
====================== */
app.use(express.static("public"));

app.get("/", (req, res) => {
    res.redirect("/index.html");
});
app.get("/login", (req, res) => {
    const projectPath = path.join(__dirname, "CDIO_Project");
    res.sendFile(path.join(projectPath, "public/login.html"));
});
app.get("/index", (req, res) => {
    res.sendFile(path.join(__dirname, "public/index.html"));
});

app.get("/walk", (req, res) => {
    res.sendFile(path.join(__dirname, "public/walk.html"));
});

app.get("/sleep", (req, res) => {
    res.sendFile(path.join(__dirname, "public/sleep.html"));
});

app.get("/screen", (req, res) => {
    res.sendFile(path.join(__dirname, "public/screen.html"));
});

app.get("/focus", (req, res) => {
    res.sendFile(path.join(__dirname, "public/focus.html"));
});
app.get("/profile", (req, res) => {
    res.sendFile(path.join(__dirname, "public/profile.html"));
});


/* ======================
   LEADERBOARD API
====================== */
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
/* ======================
   LOGOUT
====================== */

app.get("/logout", (req, res) => {

    req.session.destroy((err) => {

        if (err) {
            console.log(err);
            return res.redirect("/index");
        }

        res.redirect("/login.html");

    });

});
/* ======================
   API EXAMPLE
====================== */

app.post("/api/add-xp", (req, res) => {

    const { xp } = req.body;

    db.query(
        "UPDATE users SET xp = xp + ? WHERE id = 1", [xp],
        (err) => {

            if (err) return res.status(500).json(err);

            res.json({ success: true });

        }
    );

});

/* ======================
   PROFILE 
====================== */

app.get("/profile", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/index");
    }
    res.redirect("/profile.html");
});

app.post("/complete-task", (req, res) => {

    const { id, type } = req.body;

    const XP_GAIN = 20;

    // update task
    db.query(
        `UPDATE tasks SET ${type}=1 WHERE id=?`, [id],
        (err) => {

            if (err) return res.status(500).json(err);

            // add XP
            db.query(
                "UPDATE users SET xp = xp + ? WHERE id=1", [XP_GAIN],
                (err2) => {

                    if (err2) return res.status(500).json(err2);

                    checkAllTasks(res);

                }
            );

        }
    );

});

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

            // all done → update streak

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

                        const y =
                            yesterday.toISOString().slice(0, 10);

                        if (last === y) {

                            streak++;

                        } else {

                            streak = 1;

                        }

                    } else {

                        streak = 1;

                    }

                    db.query(
                        "UPDATE users SET streak=?, last_completed=? WHERE id=1", [streak, today],
                        () => res.json({ ok: true })
                    );

                }
            );

        }
    );

}

app.get("/profile-data", (req, res) => {

    db.query(
        "SELECT xp,level,streak FROM users WHERE id=1",
        (err, rows) => {

            if (err) return res.status(500).json(err);

            res.json(rows[0]);

        }
    );

});

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
                "UPDATE users SET xp=?, level=? WHERE id=1", [xp, level],
                () => res.json({ level })
            );

        }
    );

});



/* ======================
   START SERVER
====================== */

app.listen(PORT, () => {
    console.log("Server running: http://localhost:" + PORT);
});