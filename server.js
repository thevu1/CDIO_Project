const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");

const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs");
const db = require("./database/db");
const app = express();
const PORT = 3000;

app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: "healthquest-secret",
    resave: false,
    saveUninitialized: true
}));

app.use(express.static("static"));

app.get("/", (req, res) => {
    res.redirect("/login");
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "templates/login.html"));
});

app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "templates/register.html"));
});

app.post("/register", async (req, res) => {
    const { name, email, password } = req.body;

    const hash = await bcrypt.hash(password, 10);

    db.query(
        "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
        [name, email, hash],
        (err, result) => {
            if (err) {
                console.log(err);
                return res.send("Email đã tồn tại hoặc lỗi database");
            }
            res.redirect("/login");
        }
    );
});

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

            let html = fs.readFileSync(path.join(__dirname, "templates/login.html"), "utf8");
            const user = results[0];

            if (!user) {
                html = html.replace(
                    "{{error}}",
                    `<div class="error-message">Email chưa tồn tại.</div>`
                );
                return res.send(html);
            }

            const match = await bcrypt.compare(password, user.password);

            if (!match) {
                html = html.replace(
                    "{{error}}",
                    `<div class="error-message">Sai mật khẩu. Vui lòng thử lại.</div>`
                );
                return res.send(html);
            }

            req.session.user = user;
            res.redirect("/home");
        }
    );
});

app.get("/home", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login");
    }

    res.sendFile(path.join(__dirname, "templates/home.html"));
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login");
});

app.listen(PORT, () => {
    console.log("Server running on http://localhost:3000");
});