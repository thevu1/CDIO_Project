/* =========================================================
   IMPORT LIBRARIES
========================================================= */
const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");

const bcrypt = require("bcrypt");
const path = require("path");
const fs = require("fs");
const db = require("../database/db");

const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");

const { google } = require("googleapis");

const app = express.Router();


/* =========================================================
   GOOGLE OAUTH2 (Google Fit)
========================================================= */
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "http://localhost:3000/auth/google-fit/callback"
);


/* =========================================================
   AUTO CLEAN UNVERIFIED USERS (5 phút)
========================================================= */
setInterval(() => {
    db.query(
        "DELETE FROM users WHERE is_verified = 0 AND verify_expires < NOW()",
        (err) => {
            if (!err) console.log("Cleaned expired users");
        }
    );
}, 5 * 60 * 1000);


/* =========================================================
   MAIL CONFIG (GMAIL)
========================================================= */
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: String(process.env.EMAIL_USER),
        pass: String(process.env.EMAIL_PASS)
    }
});

// Debug env
console.log("USER:", process.env.EMAIL_USER);
console.log("PASS:", process.env.EMAIL_PASS);


/* =========================================================
   BASIC ROUTES (PAGE NAVIGATION)
========================================================= */

// Root → check login
app.get("/", (req, res) => {
    if (!req.session.user) return res.redirect("/login");
    res.redirect("/index");
});

// Auth pages
app.get("/login", (req, res) =>
    res.sendFile(path.join(__dirname, "../views/auth/login.html"))
);

app.get("/register", (req, res) =>
    res.sendFile(path.join(__dirname, "../views/auth/register.html"))
);

// Forgot password
app.get("/forgot-password", (req, res) =>
    res.sendFile(path.join(__dirname, "../views/auth/forgot-password.html"))
);

app.get("/reset-password", (req, res) =>
    res.sendFile(path.join(__dirname, "../views/auth/reset-password.html"))
);

// Setup profile page
app.get("/setup-profile", (req, res) => {
    if (!req.session.user) return res.redirect("/login");
    res.sendFile(path.join(__dirname, "../views/auth/setup.html"));
});


/* =========================================================
   API: GET CITIES
========================================================= */
app.get("/api/cities", (req, res) => {
    db.query("SELECT * FROM cities", (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});


/* =========================================================
   SETUP PROFILE
========================================================= */
app.post("/setup-profile", (req, res) => {
    const { birthdate, city_id, phone_number } = req.body;

    // Validate
    if (!phone_number) {
        return res.send("Số điện thoại là bắt buộc");
    }

    // Update DB
    db.query(
        `UPDATE users 
         SET birthdate=?, city_id=?, phone_number=?, profile_completed=TRUE
         WHERE id=?`,
        [
            birthdate || null,
            city_id || null,
            phone_number,
            req.session.user.id
        ],
        () => {
            // Update session
            req.session.user.profile_completed = true;

            // Redirect + trigger popup Google Fit
            res.redirect("/index?askGoogleFit=1");
        }
    );
});


/* =========================================================
   REGISTER
========================================================= */
app.post("/register", async (req, res) => {
    const { name, email, password, username } = req.body;

    // Check existing email
    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {

        if (results.length > 0) {
            const user = results[0];

            // Nếu chưa verify
            if (!user.is_verified) {
                const now = new Date();

                // Token còn hạn
                if (new Date(user.verify_expires) > now) {
                    return res.json({
                        status: "exists_unverified",
                        message: "Token cũ vẫn còn hiệu lực"
                    });
                }

                // Token hết hạn → tạo mới
                const newToken = uuidv4();
                const newExpires = new Date(Date.now() + 15 * 60 * 1000);

                db.query(
                    "UPDATE users SET verify_token=?, verify_expires=? WHERE id=?",
                    [newToken, newExpires, user.id]
                );

                return res.json({
                    status: "reset_token",
                    message: "Token mới đã được tạo"
                });
            }

            return res.json({ status: "exists" });
        }

        // User mới
        const hash = await bcrypt.hash(password, 10);
        const token = uuidv4();
        const expires = new Date(Date.now() + 15 * 60 * 1000);

        db.query(
            `INSERT INTO users (name, email, password, nickname, is_verified, verify_token, verify_expires)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [username, email, hash, name, false, token, expires],
            async (err) => {

                if (err) return res.json({ status: "error" });

                const link = `http://localhost:3000/verify/${token}`;

                try {
                    await transporter.sendMail({
                        to: email,
                        subject: "Xác minh",
                        html: getVerifyEmailHTML(link, name)
                    });

                    res.json({ status: "success" });
                } catch {
                    res.json({ status: "error" });
                }
            }
        );
    });
});


/* =========================================================
   FORGOT PASSWORD
========================================================= */

// Check email tồn tại
app.post("/api/auth/check-email", (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: "Email không được để trống." });
    }

    db.query("SELECT * FROM users WHERE email = ?", [email], (err, result) => {
        if (err) return res.status(500).json({ message: "Lỗi server." });

        if (result.length === 0) {
            return res.status(404).json({ message: "Email chưa được đăng ký." });
        }

        res.status(200).json({ message: "Email hợp lệ." });
    });
});

// Reset password
app.post("/api/auth/reset-password", async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        if (!email || !newPassword) {
            return res.status(400).json({ message: "Thiếu thông tin." });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Mật khẩu >= 6 ký tự." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        db.query(
            "UPDATE users SET password = ? WHERE email = ?",
            [hashedPassword, email],
            (err, result) => {
                if (err) return res.status(500).json({ message: "Lỗi server." });

                if (result.affectedRows === 0) {
                    return res.status(404).json({ message: "Không tìm thấy tài khoản." });
                }

                res.status(200).json({ message: "Đặt lại mật khẩu thành công." });
            }
        );

    } catch {
        res.status(500).json({ message: "Có lỗi xảy ra." });
    }
});


/* =========================================================
   RESEND VERIFY EMAIL
========================================================= */
app.post("/resend", (req, res) => {
    const { email } = req.body;

    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {

        if (!results[0]) return res.json({ status: "notfound" });

        const user = results[0];
        const now = new Date();

        let token = user.verify_token;
        let expires = user.verify_expires;

        // Nếu hết hạn → tạo mới
        if (new Date(expires) < now) {
            token = uuidv4();
            expires = new Date(Date.now() + 15 * 60 * 1000);

            db.query(
                "UPDATE users SET verify_token=?, verify_expires=? WHERE id=?",
                [token, expires, user.id]
            );
        }

        const link = `http://localhost:3000/verify/${token}`;

        try {
            await transporter.sendMail({
                to: email,
                subject: "Gửi lại xác minh",
                html: getVerifyEmailHTML(link, user.name)
            });

            res.json({ status: "resent" });
        } catch {
            res.json({ status: "error" });
        }
    });
});


/* =========================================================
   VERIFY ACCOUNT
========================================================= */
app.get("/verify/:token", (req, res) => {
    const token = req.params.token;

    db.query(
        "SELECT * FROM users WHERE verify_token = ?",
        [token],
        (err, results) => {

            if (!results[0]) {
                return res.send(`<script>alert("Link không hợp lệ");location="/login"</script>`);
            }

            const user = results[0];

            if (new Date() > new Date(user.verify_expires)) {
                return res.send(`<script>alert("Link hết hạn");location="/login"</script>`);
            }

            db.query(
                `UPDATE users 
                 SET is_verified = TRUE, verify_token = NULL, verify_expires = NULL
                 WHERE id = ?`,
                [user.id],
                () => {
                    res.send(`<script>alert("Xác minh thành công 🎉");location="/login?verified=1"</script>`);
                }
            );
        }
    );
});


/* =========================================================
   LOGIN
========================================================= */
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    db.query(
        "SELECT * FROM users WHERE email = ? OR name = ?",
        [email, email],
        async (err, results) => {

            if (err) return res.send("Lỗi server");

            if (results.length === 0) {
                return res.redirect("/login?error=notfound");
            }

            const user = results[0];

            const match = await bcrypt.compare(password, user.password);

            if (!match) return res.redirect("/login?error=wrongpass");
            if (!user.is_verified) return res.redirect("/login?error=notverified");

            req.session.user = user;

            if (!user.profile_completed) {
                return res.redirect("/setup-profile");
            }

            res.redirect("/index");
        }
    );
});


/* =========================================================
   OTHER ROUTES
========================================================= */

// Home redirect
app.get("/home", (req, res) => {
    if (!req.session.user) return res.redirect("/login");
    res.redirect("/index");
});

// Logout
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login");
});


/* =========================================================
   EMAIL TEMPLATE
========================================================= */
function getVerifyEmailHTML(link, name) {
    return `
    <div style="font-family: Arial; max-width:500px; margin:auto; padding:20px;">
        <h2 style="color:#3b82f6;">HealthQuest</h2>
        <h3>Xin chào ${name} 👋</h3>
        <p>Nhấn nút bên dưới để xác minh tài khoản:</p>

        <a href="${link}" style="
            display:inline-block;
            padding:14px 20px;
            background:linear-gradient(90deg,#19c37d,#3b82f6);
            color:white;
            border-radius:10px;
            text-decoration:none;
            font-weight:bold;">
            Xác minh tài khoản
        </a>

        <p style="margin-top:20px; font-size:13px; color:#777;">
            Link hết hạn sau 15 phút.
        </p>
    </div>
    `;
}


/* =========================================================
   EXPORT ROUTER
========================================================= */
module.exports = app;