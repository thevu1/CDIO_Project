    const express = require("express");
    const session = require("express-session");
    const bodyParser = require("body-parser");

    const bcrypt = require("bcrypt");
    const path = require("path");
    const fs = require("fs");
    const db = require("../database/db");

    const nodemailer = require("nodemailer"); // ✅ FIX
    const { v4: uuidv4 } = require("uuid");

    const app = express.Router();


    /* =========================
    CONFIG MAIL (GMAIL)
    ========================= */
    setInterval(() => {
        db.query(
            "DELETE FROM users WHERE is_verified = 0 AND verify_expires < NOW()",
            (err) => {
                if (!err) console.log("Cleaned expired users");
            }
        );
    }, 5 * 60 * 1000);

    /* =========================
    CONFIG MAIL (GMAIL)
    ========================= */
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
        user: String(process.env.EMAIL_USER),
        pass: String(process.env.EMAIL_PASS)
        }
    });
    console.log("USER:", process.env.EMAIL_USER);
    console.log("PASS:", process.env.EMAIL_PASS);

    /* =========================
    ROUTES
    ========================= */

    app.get("/", (req, res) => {
        if (!req.session.user) {
            return res.redirect("/login");
        }
        res.redirect("/index");
    });

    app.get("/login", (req, res) => {
        res.sendFile(path.join(__dirname, "../templates/login.html"));
    });
    app.get("/register", (req, res) => {
        res.sendFile(path.join(__dirname, "../templates/register.html"));
    });

    // /* =========================
    //    forgot password and reset password
    // ========================= */
    app.get("/forgot-password", (req, res) => {
    res.sendFile(path.join(__dirname, "../templates/forgot-password.html"));
    });
    app.get("/reset-password", (req, res) => {
      res.sendFile(path.join(__dirname, "../templates/reset-password.html"));
    });

    // /* =========================
    //    SETUP PROFILE
    // ========================= */

    app.get("/setup-profile", (req, res) => {
        if (!req.session.user) return res.redirect("/login");
        res.sendFile(path.join(__dirname, "../templates/setup.html"));
    });


    // /* =========================
    //    Get cities API
    // ========================= */
    app.get("/api/cities", (req, res) => {
        db.query("SELECT * FROM cities", (err, results) => {
            if (err) return res.status(500).json(err);
            res.json(results);
        });
    });


    // /* =========================
    //    SETUP PROFILE
    // ========================= */
    app.post("/setup-profile", (req, res) => {
        const {  birthdate, city_id, phone_number } = req.body;

        if (!phone_number) {
            return res.send("Số điện thoại là bắt buộc");
        }

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

                // 🔥 update session luôn
                req.session.user.profile_completed = true;

                res.redirect("/index");
            }
        );
    });
    /* =========================
    REGISTER
    ========================= */

    app.post("/register", async (req, res) => {
        const { name, email, password, username } = req.body;

        db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {

            // 🔥 Nếu đã tồn tại
            if (results.length > 0) {
                const user = results[0];

                // 👉 Nếu chưa verify
                if (!user.is_verified) {

                    const now = new Date();

                    // ✅ CHƯA hết hạn → dùng lại token cũ
                    if (new Date(user.verify_expires) > now) {
                        return res.json({ 
                            status: "exists_unverified",
                            message: "Token cũ vẫn còn hiệu lực"
                        });
                    }

                    // ❗ HẾT hạn → tạo token mới
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

            // 👉 User mới
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
    // /* =========================
    //    RESEND MAIL
    // ========================= */

    app.post("/resend", (req, res) => {
        const { email } = req.body;

        db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {

            if (!results[0]) {
                return res.json({ status: "notfound" });
            }

            const user = results[0];
            const now = new Date();

            let token = user.verify_token;
            let expires = user.verify_expires;

            // Nếu đã hết hạn → tạo token mới
            if (new Date(expires) < now) {
                token = uuidv4();
                expires = new Date(Date.now() + 15 * 60 * 1000);

                db.query(
                    "UPDATE users SET verify_token=?, verify_expires=? WHERE id=?",
                    [token, expires, user.id]
                );
            }

            // Nếu chưa hết hạn → dùng lại token cũ

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

    /* =========================
    VERIFY
    ========================= */

    app.get("/verify/:token", (req, res) => {
        const token = req.params.token;

        db.query(
            "SELECT * FROM users WHERE verify_token = ?",
            [token],
            (err, results) => {

                if (!results[0]) {
                    return res.send(`
                        <script>
                            alert("Link không hợp lệ");
                            window.location.href = "/login";
                        </script>
                    `);
                }

                const user = results[0];

                if (new Date() > new Date(user.verify_expires)) {
                    return res.send(`
                        <script>
                            alert("Link đã hết hạn");
                            window.location.href = "/login";
                        </script>
                    `);
                }

                db.query(
                    `UPDATE users 
                    SET is_verified = TRUE, 
                        verify_token = NULL, 
                        verify_expires = NULL
                    WHERE id = ?`,
                    [user.id],
                    () => {
                        res.send(`
                            <script>
                                alert("Xác minh thành công 🎉");
                                window.location.href = "/login?verified=1";
                            </script>
                        `);
                    }
                );
            }
        );
    });
    


    /* =========================
    LOGIN
    ========================= */
    app.post("/login",  async (req, res) => {
        const { email, password } = req.body;

        db.query(
            "SELECT * FROM users WHERE email = ? OR name = ?",
            [email, email],
            async  (err, results) => {

                if (err) return res.send("Lỗi server");

                // ❌ Không tìm thấy user
                if (results.length === 0) {
                    return res.redirect("/login?error=notfound");
                }

                const user = results[0];

                // ❌ Sai mật khẩu
                const match = await bcrypt.compare(password, user.password);

                if (!match) {
                    return res.redirect("/login?error=wrongpass");
                }
                // ❌ Chưa verify
                if (!user.is_verified) {
                    return res.redirect("/login?error=notverified");
                }

                req.session.user = user;

                // nếu chưa setup → bắt đi setup
                if (!user.profile_completed) {
                    return res.redirect("/setup-profile");
                }

                // ✅ Đúng
                res.redirect("/index");
            }
        );
    });


    /* ========================= */

    app.get("/home", (req, res) => {
        if (!req.session.user) return res.redirect("/login");
        res.redirect("/index");
    });

    // /* =========================
    //    Logout
    // ========================= */
    
    app.get("/logout", (req, res) => {
        req.session.destroy();
        res.redirect("/login");
    });



    /* =========================
    EMAIL TEMPLATE
    ========================= */
    function getVerifyEmailHTML(link, name) {
        return `
        <div style="font-family: Arial; max-width:500px; margin:auto; padding:20px;">
            <h2 style="color:#3b82f6;">HealthQuest</h2>
            <h3>Xin chào ${name} 👋</h3>
            <p>Nhấn nút bên dưới để xác minh tài khoản:</p>

            <a href="${link}" 
            style="display:inline-block;
                    padding:14px 20px;
                    background:linear-gradient(90deg,#19c37d,#3b82f6);
                    color:white;
                    border-radius:10px;
                    text-decoration:none;
                    font-weight:bold;">
                Xác minh tài khoản
            </a>

            <p style="margin-top:20px; font-size:13px; color:#777;">
                Link sẽ hết hạn sau 15 phút.
            </p>
        </div>
        `;  
    }
module.exports = app;
