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
    // const transporter = nodemailer.createTransport({
    //     service: "gmail",
    //     auth: {
    //         user: "nguyenthevu4@dtu.edu.vn",
    //         pass: "cunmvjdcmrixmpcl" // app password (không có khoảng trắng)
    //     }
    // });


    // /* =========================
    //    CLEAN EXPIRED USERS
    // ========================= */

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

    // app.get("/", (req, res) => {
    //     res.redirect("/login");
    // });
    app.get("/", (req, res) => {
        if (!req.session.user) {
            return res.redirect("/login");
        }
        res.redirect("index");
    });

    app.get("/login", (req, res) => {
        res.sendFile(path.join(__dirname, "../templates/login.html"));
    });
    app.get("/register", (req, res) => {
        res.sendFile(path.join(__dirname, "../templates/register.html"));
    });
    /* =========================
    REGISTER
    ========================= */
    // app.post("/register", async (req, res) => {
    //     const { name, email, password, username } = req.body;

    //     const hash = await bcrypt.hash(password, 10);

    //     db.query(
    //         "SELECT * FROM users WHERE email = ?",
    //         [email],
    //         async (err, results) => {

    //             // 👉 Nếu đã tồn tại
    //             if (results.length > 0) {
    //                 const user = results[0];

    //                 // ❌ Chưa verify → cho resend
    //                 if (!user.is_verified) {
    //                     return res.redirect(`/register?error=unverified&email=${email}`);
    //                 }

    //                 // ❌ Đã verify → chặn
    //                 return res.send("Email đã tồn tại!");
    //             }

    //             // 👉 Tạo user mới
    //             const token = uuidv4();
    //             const expires = new Date(Date.now() + 15 * 60 * 1000);

    //             db.query(
    //                 `INSERT INTO users 
    //                 (name, email, password, nickname, is_verified, verify_token, verify_expires) 
    //                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
    //                 [name, email, hash, username, false, token, expires],
    //                 async (err) => {

    //                     if (err) return res.send("Lỗi server");

    //                     const link = `http://localhost:3000/verify/${token}`;

    //                     try {
    //                         await transporter.sendMail({
    //                             to: email,
    //                             subject: "Xác minh",
    //                             html: getVerifyEmailHTML(link, name)
    //                         });

    //                         res.redirect(`/register?success=1&email=${email}`);
    //                     } catch (e) {
    //                         console.log(e);
    //                         res.redirect(`/register?error=mailfail&email=${email}`);
    //                     }
    //                 }
    //             );
    //         }
    //     );
    // });

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
                [name, email, hash, username, false, token, expires],
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
    // /* =========================
    //    RESEND MAIL
    // ========================= */
    // app.get("/resend", (req, res) => {
    //     const email = req.query.email;

    //     db.query(
    //         "SELECT * FROM users WHERE email = ?",
    //         [email],
    //         async (err, results) => {
    //             if (!results[0]) return res.send("Không tìm thấy user");

    //             const user = results[0];

    //             const token = uuidv4();
    //             const expires = new Date(Date.now() + 15 * 60 * 1000);

    //             db.query(
    //                 "UPDATE users SET verify_token=?, verify_expires=? WHERE id=?",
    //                 [token, expires, user.id]
    //             );

    //             const link = `http://localhost:3000/verify/${token}`;

    //             try {
    //                 await transporter.sendMail({
    //                     to: email,
    //                     subject: "Gửi lại xác minh",
    //                     html: getVerifyEmailHTML(link, user.name)
    //                 });

    //                 res.send("📩 Đã gửi lại email!");
    //             } catch (e) {
    //                 res.send("❌ Gửi lại thất bại");
    //             }
    //         }
    //     );
    // });

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
    // app.get("/verify/:token", (req, res) => {
    //     const token = req.params.token;
        

    //     db.query(
    //         "SELECT * FROM users WHERE verify_token = ?",
    //         [token],
    //         (err, results) => {
    //             if (!results[0]) return res.send("Link không hợp lệ");

    //             const user = results[0];

    //             if (new Date() > new Date(user.verify_expires)) {
    //                 return res.send(`
    //                     Link hết hạn 😢 <br><br>
    //                     <a href="/resend?email=${user.email}">
    //                         Gửi lại email
    //                     </a>
    //                 `);
    //             }

    //             const now = new Date();

    //             db.query(
    //                 `UPDATE users 
    //                 SET is_verified = TRUE, 
    //                     verify_token = NULL, 
    //                     verify_expires = NULL,
    //                     join_date = ?
    //                 WHERE id = ?`,
    //                 [now, user.id],
    //                 () => {
    //                     res.redirect("/login?verified=1");
    //                 }
    //             );
    //         }
    //     );
    // });

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
    // /* =========================
    //    SETUP PROFILE
    // ========================= */

    app.get("/setup-profile", (req, res) => {
        if (!req.session.user) return res.redirect("/login");
        res.sendFile(path.join(__dirname, "../templates/setup.html"));
    });

    // /* =========================
    //    UPDATE PROFILE
    // ========================= */

    app.post("/setup-profile", (req, res) => {
        const { nickname, birthdate, city, phone_number } = req.body;

        db.query(
            `UPDATE users 
            SET nickname=?, birthdate=?, city=?, phone_number=? 
            WHERE id=?`,
            [nickname, birthdate, city, phone_number, req.session.user.id],
            () => {
                res.redirect("/home");
            }
        );
    });

    // /* =========================
    //    RESEND MAIL
    // ========================= */
    // app.get("/resend", (req, res) => {
    //     const email = req.query.email;

    //     db.query(
    //         "SELECT * FROM users WHERE email = ?",
    //         [email],
    //         async (err, results) => {
    //             const user = results[0];
    //             if (!user) return res.send("Không tìm thấy user");

    //             const token = uuidv4();
    //             const expires = new Date(Date.now() + 15 * 60 * 1000);

    //             db.query(
    //                 `UPDATE users 
    //                  SET verify_token = ?, verify_expires = ? 
    //                  WHERE id = ?`,
    //                 [token, expires, user.id]
    //             );

    //             const link = `http://localhost:3000/verify/${token}`;

    //             try {
    //                 await transporter.sendMail({
    //                     from: '"HealthQuest" <nguyenthevu4@dtu.edu.vn>',
    //                     to: email,
    //                     subject: "Gửi lại xác minh",
    //                     html: getVerifyEmailHTML(link, user.name)
    //                 });

    //                 res.send("📩 Đã gửi lại email!");
    //             } catch (e) {
    //                 console.log("MAIL ERROR:", e);
    //                 res.send("❌ Gửi lại mail thất bại");
    //             }
    //         }
    //     );
    // });

    /* =========================
    LOGIN
    ========================= */
    app.post("/login",  async (req, res) => {
        const { email, password } = req.body;

        db.query(
            "SELECT * FROM users WHERE email = ? OR nickname = ?",
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

                // ✅ Đúng
                req.session.user = user;
                res.redirect("/index");
            }
        );
    });


    /* ========================= */

    app.get("/home", (req, res) => {
        if (!req.session.user) return res.redirect("/login");
        res.redirect("/index");
    });

    app.get("/logout", (req, res) => {
        req.session.destroy();
        res.redirect("/login");
    });

    module.exports = app;

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
