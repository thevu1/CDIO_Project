// auth.js
const express    = require("express");
const bcrypt     = require("bcrypt");
const path       = require("path");
const db         = require("../database/db");
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const { google }     = require("googleapis");

const app = express.Router();


/* =========================================================
   🌐 MODULE: GOOGLE OAUTH2 – GOOGLE FIT
   - Dùng client ID/Secret từ .env
   - Callback URL phải khớp Google Cloud Console
   ─ Chưa dùng đến: bổ sung route /auth/google-fit ở đây
========================================================= */
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "http://localhost:3000/auth/google-fit/callback"
);


/* =========================================================
   🧹 MODULE: AUTO CLEAN – XOÁ USER CHƯA XÁC MINH HẾT HẠN
   - Chạy mỗi 5 phút
   - Xoá user có is_verified = 0 VÀ verify_expires < NOW()
   - Bảng: users
========================================================= */
setInterval(() => {
    db.query(
        "DELETE FROM accounts WHERE is_verified = 0 AND verify_expires < NOW()",
        () => console.log("[AutoClean] Clean accounts")
    );
}, 5 * 60 * 1000);


/* =========================================================
   📧 MODULE: MAIL CONFIG – CẤU HÌNH GMAIL
   - Lấy user/pass từ biến môi trường .env
   - EMAIL_USER: địa chỉ gmail gửi đi
   - EMAIL_PASS:  App Password của Gmail (không phải password thật)
========================================================= */
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: String(process.env.EMAIL_USER),
        pass: String(process.env.EMAIL_PASS)
    }
});

console.log("[Mail] USER:", process.env.EMAIL_USER);
console.log("[DB] Name:", process.env.DB_NAME);


/* =========================================================
   📄 MODULE: PAGE ROUTES – TRẢ FILE HTML AUTH
   ─ Thêm trang auth mới: thêm app.get ở đây
========================================================= */

// Root → kiểm tra login, redirect tương ứng
app.get("/", (req, res) => {
    if (!req.session.user) return res.redirect("/login");
    res.redirect("/index");
});

app.get("/login",           (req, res) => res.sendFile(path.join(__dirname, "../views/auth/login.html")));
app.get("/register",        (req, res) => res.sendFile(path.join(__dirname, "../views/auth/register.html")));
app.get("/forgot-password", (req, res) => res.sendFile(path.join(__dirname, "../views/auth/forgot-password.html")));
app.get("/reset-password",  (req, res) => res.sendFile(path.join(__dirname, "../views/auth/reset-password.html")));

// Setup profile (chỉ cho user đã login)
app.get("/setup-profile", (req, res) => {
    if (!req.session.user) return res.redirect("/login");
    res.sendFile(path.join(__dirname, "../utils/setup.html"));
});

// Redirect /home về /index
app.get("/home", (req, res) => {
    if (!req.session.user) return res.redirect("/login");
    res.redirect("/index");
});


/* =========================================================
   🏙️ MODULE: CITIES – DANH SÁCH THÀNH PHỐ
   - Dùng bởi: trang setup-profile → dropdown chọn thành phố
   - Bảng: cities (id, name)
========================================================= */
app.get("/api/cities", (req, res) => {
    db.query(
        "SELECT id, name FROM cities ORDER BY name ASC",
        (err, results) => {
            if (err) return res.status(500).json(err);
            res.json(results);
        }
    );
});


/* =========================================================
   🙍 MODULE: SETUP PROFILE – HOÀN THIỆN HỒ SƠ SAU ĐĂNG KÝ
   - Gọi sau lần đăng nhập đầu khi profile_completed = 0
   - Cập nhật: birthdate, city_id, phone_number, profile_completed
   - Bảng: users
========================================================= */
app.post("/setup-profile", (req, res) => {
    const { birthdate, city_id, phone_number } = req.body;

    if (!phone_number) {
        return res.send("Số điện thoại là bắt buộc");
    }

    db.query(
        `UPDATE users
         SET birthdate         = ?,
             city_id           = ?,
             phone_number      = ?,
             profile_completed = 1
         WHERE id = ?`,
        [birthdate || null, city_id || null, phone_number, req.session.user.id],
        (err) => {
            if (err) return res.status(500).send("Lỗi server");

            req.session.user.profile_completed = 1;

            res.redirect("/index?askGoogleFit=1");
        }
    );
});


/* =========================================================
   📝 MODULE: REGISTER – ĐĂNG KÝ TÀI KHOẢN MỚI
   - Nhận: name (display), username (đăng nhập), email, password
   - Gửi email xác minh kèm token UUID (hết hạn 15 phút)
   - Xử lý 3 trường hợp: user mới / chưa verify / đã tồn tại
   - Bảng: users
========================================================= */
app.post("/register", async (req, res) => {
    const { name, email, password, username } = req.body;

    db.query(
        "SELECT id, is_verified, verify_expires FROM accounts WHERE email = ?",
        [email],
        async (err, results) => {
            if (err) return res.json({ status: "error" });

            if (results.length > 0) {
                const acc = results[0];

                if (!acc.is_verified) {
                    const now = new Date();

                    if (new Date(acc.verify_expires) > now) {
                        return res.json({ status: "exists_unverified" });
                    }

                    const token = uuidv4();
                    const expires = new Date(Date.now() + 15 * 60 * 1000);

                    db.query(
                        "UPDATE accounts SET verify_token=?, verify_expires=? WHERE id=?",
                        [token, expires, acc.id]
                    );

                    return res.json({ status: "reset_token" });
                }

                return res.json({ status: "exists" });
            }

            const hash = await bcrypt.hash(password, 10);
            const token = uuidv4();
            const expires = new Date(Date.now() + 15 * 60 * 1000);

            // 👉 INSERT account trước
            db.query(
                `INSERT INTO accounts 
                (tenDangNhap, email, password, is_verified, verify_token, verify_expires)
                VALUES (?, ?, ?, 0, ?, ?)`,
                [username, email, hash, token, expires],
                (err2, result) => {
                    if (err2) return res.json({ status: "error" });

                    const accountId = result.insertId;

                    // 👉 tạo user tương ứng
                    db.query(
                        `INSERT INTO users (account_id, name)
                         VALUES (?, ?)`,
                        [accountId, name]
                    );

                    const link = `http://localhost:3000/verify/${token}`;

                    transporter.sendMail({
                        to: email,
                        subject: "Xác minh tài khoản",
                        html: getVerifyEmailHTML(link, name)
                    });

                    res.json({ status: "success" });
                }
            );
        }
    );
});

/* =========================================================
   🔑 MODULE: FORGOT PASSWORD – QUÊN MẬT KHẨU
   Gồm 2 route:
     POST /api/auth/check-email    → kiểm tra email tồn tại
     POST /api/auth/reset-password → cập nhật mật khẩu mới
   - Bảng: users
========================================================= */

// Bước 1: Kiểm tra email có trong DB không
app.post("/api/auth/check-email", (req, res) => {
    const { email } = req.body;

    db.query(
        "SELECT id FROM accounts WHERE email=? AND is_verified=1",
        [email],
        (err, result) => {
            if (!result.length) return res.status(404).json({ message: "Không tồn tại" });
            res.json({ message: "OK" });
        }
    );
});

// Bước 2: Đặt lại mật khẩu mới
app.post("/api/auth/reset-password", async (req, res) => {
    const { email, newPassword } = req.body;

    const hash = await bcrypt.hash(newPassword, 10);

    db.query(
        "UPDATE accounts SET password=? WHERE email=?",
        [hash, email],
        (err) => {
            if (err) return res.status(500).json({ message: "Lỗi" });
            res.json({ message: "OK" });
        }
    );
});


/* =========================================================
   📨 MODULE: RESEND VERIFY – GỬI LẠI EMAIL XÁC MINH
   - Nếu token còn hạn → dùng lại token cũ
   - Nếu token hết hạn → tạo token mới
   - Bảng: users (verify_token, verify_expires)
========================================================= */
app.post("/resend", (req, res) => {
    const { email } = req.body;

    db.query(
        `SELECT a.id, a.verify_token, a.verify_expires, u.name 
         FROM accounts a 
         JOIN users u ON u.account_id = a.id 
         WHERE a.email = ?`,
        [email],
        async (err, results) => {
            if (!results || !results[0]) return res.json({ status: "notfound" });

            const acc = results[0];
            const now = new Date();

            let token   = acc.verify_token;
            let expires = acc.verify_expires;

            if (!token || new Date(expires) < now) {
                token   = uuidv4();
                expires = new Date(Date.now() + 15 * 60 * 1000);
                db.query(
                    "UPDATE accounts SET verify_token = ?, verify_expires = ? WHERE id = ?",
                    [token, expires, acc.id]
                );
            }

            const link = `http://localhost:3000/verify/${token}`;
            await transporter.sendMail({
                to: email,
                subject: "Gửi lại xác minh HealthQuest",
                html: getVerifyEmailHTML(link, acc.name)
            });
            res.json({ status: "resent" });
        }
    );
});

/* =========================================================
   ✅ MODULE: VERIFY ACCOUNT – XÁC MINH TÀI KHOẢN QUA LINK
   - User nhấn link email → GET /verify/:token
   - Kiểm tra token hợp lệ và chưa hết hạn
   - Cập nhật is_verified = 1, xoá token
   - Bảng: users
========================================================= */
app.get("/verify/:token", (req, res) => {
    const { token } = req.params;

    db.query(
        "SELECT id, verify_expires FROM accounts WHERE verify_token = ?",
        [token],
        (err, results) => {
            if (!results.length) {
                return res.send(`<script>alert("Link không hợp lệ");location="/login"</script>`);
            }

            const acc = results[0];
            if (new Date() > new Date(acc.verify_expires)) {
                return res.send(`<script>alert("Link hết hạn");location="/login"</script>`);
            }

            db.query(
                `UPDATE accounts SET is_verified=1, verify_token=NULL, verify_expires=NULL WHERE id=?`,
                [acc.id],
                () => res.redirect("/login?verified=1")
            );
        }
    );
});


/* =========================================================
   🔓 MODULE: LOGIN – ĐĂNG NHẬP
   - Tìm theo email HOẶC name (username)
   - Kiểm tra: mật khẩu → is_verified → profile_completed
   - Lưu session: chỉ lưu các trường cần thiết (không lưu password)
   - Bảng: users
========================================================= */
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    db.query(
        `SELECT 
            a.id as account_id,
            a.password,
            a.is_verified,
            u.id as user_id,
            u.name,
            u.profile_completed
         FROM accounts a
         JOIN users u ON u.account_id = a.id
         WHERE a.email = ? OR a.tenDangNhap = ?`,
        [email, email],
        async (err, results) => {
            if (err) return res.send("Lỗi server");

            if (!results.length) return res.redirect("/login?error=notfound");

            const user = results[0];

            const match = await bcrypt.compare(password, user.password);
            if (!match) return res.redirect("/login?error=wrongpass");
            if (!user.is_verified) return res.redirect("/login?error=notverified");

            req.session.user = {
                id: user.user_id,
                name: user.name,
                profile_completed: user.profile_completed
            };

            if (!user.profile_completed) return res.redirect("/setup-profile");

            res.redirect("/index");
        }
    );
});


/* =========================================================
   🚪 MODULE: LOGOUT – ĐĂNG XUẤT
   - Huỷ session → redirect về /login
========================================================= */
app.get("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/login"));
});


/* =========================================================
   📩 MODULE: EMAIL TEMPLATE – HTML MAIL XÁC MINH
   - Dùng bởi: register, resend
   ─ Muốn thay đổi giao diện email: chỉnh hàm này
========================================================= */
function getVerifyEmailHTML(link, name) {
    return `
    <div style="font-family:Arial;max-width:500px;margin:auto;padding:20px;">
        <h2 style="color:#3b82f6;">HealthQuest</h2>
        <h3>Xin chào ${name} 👋</h3>
        <p>Nhấn nút bên dưới để xác minh tài khoản của bạn:</p>

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

        <p style="margin-top:20px;font-size:13px;color:#777;">
            Link sẽ hết hạn sau <strong>15 phút</strong>.
        </p>
    </div>
    `;
}


module.exports = app;