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
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "nguyenthevu4@dtu.edu.vn",
        pass: "cunmvjdcmrixmpcl" // app password (không có khoảng trắng)
    }
});

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
    res.redirect("/index");
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
app.post("/register", async (req, res) => {
    const { name, email, password } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.send("Email không hợp lệ!");
    }

    const hash = await bcrypt.hash(password, 10);
    const token = uuidv4();
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    db.query(
        `INSERT INTO users 
        (name, email, password, is_verified, verify_token, verify_expires) 
        VALUES (?, ?, ?, ?, ?, ?)`,
        [name, email, hash, false, token, expires],
        async (err) => {
            if (err) return res.send("Email đã tồn tại");

            const link = `http://localhost:3000/verify/${token}`;

            try {
                await transporter.sendMail({
                    from: '"HealthQuest" <nguyenthevu4@dtu.edu.vn>',
                    to: email,
                    subject: "Xác minh tài khoản",
                    html: getVerifyEmailHTML(link, name)
                });

                res.send("📩 Đã gửi email xác minh!");
            } catch (e) {
                console.log("MAIL ERROR:", e);
                res.send("❌ Gửi mail thất bại");
            }
        }
    );
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
            if (!results[0]) return res.send("Link không hợp lệ");

            const user = results[0];

            if (new Date() > new Date(user.verify_expires)) {
                return res.send(`
                    Link hết hạn 😢 <br><br>
                    <a href="/resend?email=${user.email}">
                        Gửi lại email
                    </a>
                `);
            }

            db.query(
                `UPDATE users 
                 SET is_verified = TRUE, verify_token = NULL, verify_expires = NULL 
                 WHERE id = ?`,
                [user.id],
                () => {
                    req.session.user = user;

                    res.send(`
                        ✅ Xác minh thành công! <br>
                        <a href="/home">Vào trang chính</a>
                    `);
                }
            );
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
app.post("/login", (req, res) => {
    const { email, password } = req.body;

    db.query(
        "SELECT * FROM users WHERE email = ?",
        [email],
        async (err, results) => {
            if (err) return res.send("Lỗi hệ thống");

            let html = fs.readFileSync(path.join(__dirname, "../templates/login.html"), "utf8");
            const user = results[0];

            if (!user) {
                html = html.replace("{{error}}",
                    `<div class="error-message">Email chưa tồn tại.</div>`);
                return res.send(html);
            }

            if (!user.is_verified) {
                html = html.replace("{{error}}",
                    `<div class="error-message">Bạn chưa xác minh email.</div>`);
                return res.send(html);
            }

            const match = await bcrypt.compare(password, user.password);

            if (!match) {
                html = html.replace("{{error}}",
                    `<div class="error-message">Sai mật khẩu.</div>`);
                return res.send(html);
            }

            req.session.user = user;
            res.redirect("/home");
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
