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

app.use(express.static("public"));
/* ======================
   PAGES
====================== */

app.get("/", (req, res) => {
    res.redirect("/index.html");
});
app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public/login.html"));
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

/* ======================
   LEADERBOARD API
====================== */
app.get("/leaderboard", (req, res) => {

    db.query(
        "SELECT name, xp FROM users ORDER BY xp DESC LIMIT 5",
        (err, results) => {

            if (err) {
                console.log(err);
                return res.status(500).json(err);
            }

            res.json(results);

        }
    );

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
        "UPDATE users SET xp = xp + ? WHERE id = 1",
        [xp],
        (err) => {

            if (err) return res.status(500).json(err);

            res.json({ success: true });

        }
    );

});

/* ======================
   START SERVER
====================== */

app.listen(PORT, () => {
    console.log("Server running: http://localhost:" + PORT);
});