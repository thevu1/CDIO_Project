const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "YOUR_EMAIL@gmail.com",
        pass: "APP_PASSWORD" // không dùng mật khẩu thường
    }
});

module.exports = transporter;