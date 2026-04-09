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
        "DELETE FROM users WHERE is_verified = 0 AND verify_expires < NOW()",
        (err) => {
            if (!err) console.log("[AutoClean] Đã xoá user hết hạn xác minh");
        }
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
             profile_completed = TRUE
         WHERE id = ?`,
        [birthdate || null, city_id || null, phone_number, req.session.user.id],
        (err) => {
            if (err) return res.status(500).send("Lỗi server");

            // Cập nhật session để middleware không redirect nữa
            req.session.user.profile_completed = true;

            // askGoogleFit=1 → frontend hỏi có muốn kết nối Google Fit không
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

    // Kiểm tra email đã tồn tại chưa
    db.query(
        "SELECT id, is_verified, verify_expires FROM users WHERE email = ?",
        [email],
        async (err, results) => {
            if (err) return res.json({ status: "error" });

            if (results.length > 0) {
                const user = results[0];

                if (!user.is_verified) {
                    const now = new Date();

                    // Token cũ còn hiệu lực → báo frontend cho resend
                    if (new Date(user.verify_expires) > now) {
                        return res.json({
                            status: "exists_unverified",
                            message: "Token cũ vẫn còn hiệu lực"
                        });
                    }

                    // Token hết hạn → tạo token mới
                    const newToken   = uuidv4();
                    const newExpires = new Date(Date.now() + 15 * 60 * 1000);

                    db.query(
                        "UPDATE users SET verify_token = ?, verify_expires = ? WHERE id = ?",
                        [newToken, newExpires, user.id]
                    );

                    return res.json({ status: "reset_token", message: "Token mới đã được tạo" });
                }

                // Email đã tồn tại và đã verify
                return res.json({ status: "exists" });
            }

            // Tạo user mới
            const hash    = await bcrypt.hash(password, 10);
            const token   = uuidv4();
            const expires = new Date(Date.now() + 15 * 60 * 1000);

            // name = username (tên đăng nhập), nickname = name (tên hiển thị)
            db.query(
                `INSERT INTO users
                    (name, email, password, nickname,
                     is_verified, verify_token, verify_expires)
                 VALUES (?, ?, ?, ?, 0, ?, ?)`,
                [username, email, hash, name, token, expires],
                async (err2) => {
                    if (err2) return res.json({ status: "error" });

                    const link = `http://localhost:3000/verify/${token}`;

                    try {
                        await transporter.sendMail({
                            to:      email,
                            subject: "Xác minh tài khoản HealthQuest",
                            html:    getVerifyEmailHTML(link, name)
                        });
                        res.json({ status: "success" });
                    } catch {
                        res.json({ status: "error" });
                    }
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

    if (!email) return res.status(400).json({ message: "Email không được để trống." });

    db.query(
        "SELECT id FROM users WHERE email = ? AND is_verified = 1",
        [email],
        (err, result) => {
            if (err)           return res.status(500).json({ message: "Lỗi server." });
            if (!result.length) return res.status(404).json({ message: "Email chưa được đăng ký." });
            res.status(200).json({ message: "Email hợp lệ." });
        }
    );
});

// Bước 2: Đặt lại mật khẩu mới
app.post("/api/auth/reset-password", async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        if (!email || !newPassword) {
            return res.status(400).json({ message: "Thiếu thông tin." });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ message: "Mật khẩu phải từ 6 ký tự trở lên." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        db.query(
            "UPDATE users SET password = ? WHERE email = ?",
            [hashedPassword, email],
            (err, result) => {
                if (err)               return res.status(500).json({ message: "Lỗi server." });
                if (!result.affectedRows) return res.status(404).json({ message: "Không tìm thấy tài khoản." });
                res.status(200).json({ message: "Đặt lại mật khẩu thành công." });
            }
        );
    } catch {
        res.status(500).json({ message: "Có lỗi xảy ra." });
    }
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
        "SELECT id, name, verify_token, verify_expires FROM users WHERE email = ?",
        [email],
        async (err, results) => {
            if (!results || !results[0]) return res.json({ status: "notfound" });

            const user = results[0];
            const now  = new Date();

            let token   = user.verify_token;
            let expires = user.verify_expires;

            // Token hết hạn → tạo token mới
            if (!token || new Date(expires) < now) {
                token   = uuidv4();
                expires = new Date(Date.now() + 15 * 60 * 1000);

                db.query(
                    "UPDATE users SET verify_token = ?, verify_expires = ? WHERE id = ?",
                    [token, expires, user.id]
                );
            }

            const link = `http://localhost:3000/verify/${token}`;

            try {
                await transporter.sendMail({
                    to:      email,
                    subject: "Gửi lại xác minh HealthQuest",
                    html:    getVerifyEmailHTML(link, user.name)
                });
                res.json({ status: "resent" });
            } catch {
                res.json({ status: "error" });
            }
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
        "SELECT id, verify_expires FROM users WHERE verify_token = ?",
        [token],
        (err, results) => {
            if (!results || !results[0]) {
                return res.send(`<script>alert("Link không hợp lệ");location="/login"</script>`);
            }

            const user = results[0];

            if (new Date() > new Date(user.verify_expires)) {
                return res.send(`<script>alert("Link đã hết hạn, vui lòng đăng ký lại");location="/login"</script>`);
            }

            db.query(
                `UPDATE users
                 SET is_verified    = 1,
                     verify_token   = NULL,
                     verify_expires = NULL
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
   🔓 MODULE: LOGIN – ĐĂNG NHẬP
   - Tìm theo email HOẶC name (username)
   - Kiểm tra: mật khẩu → is_verified → profile_completed
   - Lưu session: chỉ lưu các trường cần thiết (không lưu password)
   - Bảng: users
========================================================= */
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    db.query(
        "SELECT * FROM users WHERE email = ? OR name = ?",
        [email, email],
        async (err, results) => {
            if (err) return res.send("Lỗi server");

            if (!results.length) return res.redirect("/login?error=notfound");

            const user = results[0];

            const match = await bcrypt.compare(password, user.password);
            if (!match)            return res.redirect("/login?error=wrongpass");
            if (!user.is_verified) return res.redirect("/login?error=notverified");

            // Lưu session — chỉ giữ trường cần thiết, KHÔNG lưu password
            req.session.user = {
                id:                user.id,
                name:              user.name,
                email:             user.email,
                nickname:          user.nickname,
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